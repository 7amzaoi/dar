import { assets, fileUrl, IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/server/storage";
import { getViewer } from "@/lib/server/viewer";

/** Product image upload (multipart field `file`) for approved manufacturers. Returns { key, url }. */
export async function POST(request: Request) {
  const { user } = await getViewer();
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (user.role !== "manufacturer" || user.status !== "approved") return Response.json({ error: "FORBIDDEN" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "NO_FILE" }, { status: 400 });
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return Response.json({ error: "UNSUPPORTED_TYPE" }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "TOO_LARGE" }, { status: 413 });

  // A fresh key per upload, so cached URLs never go stale when an image is replaced.
  const key = `products/${user.companyId}/${crypto.randomUUID()}.${ext}`;
  await assets.upload(key, new Uint8Array(await file.arrayBuffer()), { contentType: file.type });
  return Response.json({ key, url: fileUrl(key) }, { status: 201 });
}
