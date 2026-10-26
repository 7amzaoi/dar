import { policies } from "@/lib/server/policy";
import { getViewer, HttpError } from "@/lib/server/viewer";

export const dynamic = "force-dynamic";

/**
 * RPC endpoint behind the browser DataSource (lib/data/http.ts):
 * POST { repo, method, args } -> { data } | { error }. Every call goes through lib/server/policy.ts.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { repo?: unknown; method?: unknown; args?: unknown } | null;
  const key = `${body?.repo}.${body?.method}`;
  const handler = Object.hasOwn(policies, key) ? policies[key] : undefined;
  if (!handler || !Array.isArray(body?.args)) return Response.json({ error: "UNKNOWN_METHOD" }, { status: 400 });

  try {
    const data = await handler(await getViewer(), body.args);
    return Response.json({ data: data ?? null });
  } catch (error) {
    if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
    // Domain errors the UI understands (e.g. CATEGORY_IN_USE) pass through; anything else is logged.
    if (error instanceof Error && /^[A-Z_]+$/.test(error.message)) return Response.json({ error: error.message }, { status: 409 });
    console.error(`[api/data] ${key}`, error);
    return Response.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
