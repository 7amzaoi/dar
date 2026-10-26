import { liveQueriesFor, realtime } from "@/lib/server/realtime";
import { getViewer } from "@/lib/server/viewer";

export const dynamic = "force-dynamic";

/**
 * Seals the caller's live queries (60 s capabilities). The browser calls this again to renew,
 * so it is a Route Handler rather than a server action (those run one at a time).
 */
export async function POST() {
  const { user } = await getViewer();
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const queries = liveQueriesFor(user);
  const sealed = Object.fromEntries(await Promise.all(Object.entries(queries).map(async ([name, query]) => [name, await realtime.seal({ query })])));
  return Response.json({ userId: user.id, queries: sealed }, { headers: { "Cache-Control": "no-store" } });
}
