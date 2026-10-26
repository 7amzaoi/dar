import { assets, fileUrl, MAX_UPLOAD_BYTES, sniffImage } from "@/lib/server/storage";
import { getViewer } from "@/lib/server/viewer";

/** room for the multipart boundary and headers around the file itself */
const FORM_OVERHEAD = 16 * 1024;

/** Product image upload (multipart field `file`) for approved manufacturers. Returns { key, url }. */
export async function POST(request: Request) {
  // Refuse oversized bodies before reading them into memory.
  const length = Number(request.headers.get("content-length"));
  if (!length) return Response.json({ error: "LENGTH_REQUIRED" }, { status: 411 });
  if (length > MAX_UPLOAD_BYTES + FORM_OVERHEAD) return Response.json({ error: "TOO_LARGE" }, { status: 413 });

  const { user } = await getViewer();
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (user.role !== "manufacturer" || user.status !== "approved") return Response.json({ error: "FORBIDDEN" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "NO_FILE" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "TOO_LARGE" }, { status: 413 });

  // The type comes from the file's own bytes, not from what the browser claims.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = sniffImage(bytes);
  if (!image) return Response.json({ error: "UNSUPPORTED_TYPE" }, { status: 415 });

  // A fresh key per upload, so cached URLs never go stale when an image is replaced.
  const key = `products/${user.companyId}/${crypto.randomUUID()}.${image.ext}`;
  await assets.upload(key, bytes, { contentType: image.type });
  return Response.json({ key, url: fileUrl(key) }, { status: 201 });
}
