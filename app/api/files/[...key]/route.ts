import { assets } from "@/lib/server/storage";

const PRESIGN_SECONDS = 3600;

/** Catalogue images are public content: redirect to a presigned GET on the private bucket. */
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!/^products\/[\w-]+\/[\w-]+\.(jpg|png|webp|avif)$/.test(key)) return new Response("Not found", { status: 404 });
  if (!(await assets.exists(key))) return new Response("Not found", { status: 404 });
  const url = await assets.url(key, { expiresIn: PRESIGN_SECONDS });
  return new Response(null, {
    status: 307,
    // cache the redirect for well under the signature's lifetime
    headers: { Location: url, "Cache-Control": "public, max-age=600" },
  });
}
