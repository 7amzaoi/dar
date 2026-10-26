/**
 * End-to-end smoke test for the Neon services this app uses, against a running app.
 *   npm run dev            (in another terminal)
 *   npm run smoke
 * Object Storage: writes an object to the `assets` bucket, fetches it back through the app's
 *   /api/files route (307 -> presigned GET), compares bytes, then deletes it.
 * Realtime: seals a live query exactly like /api/realtime, subscribes over the Realtime proxy
 *   (sending the app's Origin, which must be on neon.ts `allowedOrigins`), inserts a row and waits
 *   for the change batch, then deletes the row.
 * Leaves no data behind.
 */
import { createRealtimeClient } from "@neon/realtime/client";
import { createRealtime, rawSql } from "@neon/realtime/server";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";
import { Pool } from "pg";

const APP = process.env.SMOKE_APP_URL ?? "http://localhost:3000";
const ok = (msg: string) => console.log(`  ok  ${msg}`);

async function storage() {
  console.log("Object Storage");
  const files = new Files({ adapter: neon({ bucket: "assets" }) });
  const key = `products/smoke/${crypto.randomUUID()}.png`;
  // 1x1 transparent PNG
  const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="), (c) => c.charCodeAt(0));
  await files.upload(key, png, { contentType: "image/png" });
  ok(`uploaded ${key} (${png.length} bytes)`);
  try {
    const redirect = await fetch(`${APP}/api/files/${key}`, { redirect: "manual" });
    const location = redirect.headers.get("location") ?? "";
    if (redirect.status !== 307 || !location) throw new Error(`/api/files returned ${redirect.status}`);
    ok(`GET /api/files/${key} -> ${redirect.status} to ${new URL(location).host} (presigned)`);
    const res = await fetch(location);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (!res.ok || bytes.length !== png.length || bytes.some((b, i) => b !== png[i])) throw new Error(`presigned GET returned ${res.status}, ${bytes.length} bytes`);
    ok(`presigned GET -> ${res.status}, ${res.headers.get("content-type")}, bytes identical`);
    const missing = await fetch(`${APP}/api/files/products/smoke/does-not-exist.png`, { redirect: "manual" });
    if (missing.status !== 404) throw new Error(`missing object returned ${missing.status}`);
    ok("missing object -> 404");
  } finally {
    await files.delete(key);
    ok("deleted test object");
  }
}

async function realtime(pool: Pool) {
  console.log("Realtime");
  const userId = "u-r1"; // seeded retailer
  const server = createRealtime({ secret: process.env.NEON_REALTIME_SECRET!, db: new URL(process.env.DATABASE_URL!).pathname.slice(1) });
  const sealed = await server.seal({ query: rawSql<{ id: string; read: boolean }>(`SELECT id, read FROM notifications WHERE user_id = $1`, [userId]) });
  ok(`sealed live query (expires in ${Math.round((sealed.expiresAt - Date.now()) / 1000)} s)`);

  const client = createRealtimeClient({
    url: process.env.NEXT_PUBLIC_NEON_REALTIME_URL ?? process.env.NEON_REALTIME_URL!,
    // a browser sends its Origin; Node's WebSocket accepts it as a header
    webSocketFactory: (url, protocols) => new WebSocket(url, { protocols, headers: { Origin: APP } } as unknown as string[]),
  });
  const sub = client.subscribe(sealed);
  const testId = `n-smoke-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await sub.awaitRows(() => true, 15_000);
    const initial = sub.getSnapshot().data?.length ?? 0;
    ok(`subscribed, status ${sub.getState().status}, initial rows ${initial}`);

    const changed = new Promise<readonly string[]>((resolve) => {
      sub.onUpdate((u) => {
        if (u.type === "changes" && u.changes.some((c) => c.type === "upsert" && (c.row as { id: string }).id === testId)) resolve(u.batch.txids);
      });
    });
    const started = Date.now();
    const { rows } = await pool.query<{ txid: string }>(
      `INSERT INTO notifications (id, user_id, type, body) VALUES ($1, $2, 'smoke.test', 'Realtime smoke test') RETURNING pg_current_xact_id()::text AS txid`,
      [testId, userId],
    );
    const txids = await Promise.race([changed, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("no change within 15 s")), 15_000))]);
    ok(`INSERT txid ${rows[0].txid} arrived as change batch [${txids.join(", ")}] in ${Date.now() - started} ms; rows now ${sub.getSnapshot().data?.length}`);
    await sub.awaitTxId(rows[0].txid, 5_000);
    ok("awaitTxId confirmed");
  } finally {
    await pool.query(`DELETE FROM notifications WHERE id = $1`, [testId]);
    ok("deleted test row");
    sub.unsubscribe();
    client.close();
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!.replace("sslmode=require", "sslmode=verify-full") });
  try {
    await storage();
    await realtime(pool);
    console.log("All service checks passed.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("  FAIL", error);
  process.exitCode = 1;
});
