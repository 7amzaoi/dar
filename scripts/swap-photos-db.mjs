/**
 * One-off: point seeded products and collections at the Unsplash photos instead of the old SVG
 * placeholders. Only rows still using a placeholder are touched (makers' own uploads are left alone).
 *   node --env-file=.env.local scripts/swap-photos-db.mjs            (dev branch)
 *   node --env-file=.env.neon-production scripts/swap-photos-db.mjs  (production)
 */
import fs from "node:fs";
import pg from "pg";

const photos = JSON.parse(fs.readFileSync(new URL("./photos.json", import.meta.url), "utf8"));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED.replace("sslmode=require", "sslmode=verify-full") });
const client = await pool.connect();
try {
  await client.query("begin");
  let products = 0;
  for (const id of Object.keys(photos.products)) {
    const r = await client.query(
      `update products set images = $2::jsonb
       where id = $1 and exists (select 1 from jsonb_array_elements_text(images) i where i like '/images/products/%')`,
      [id, JSON.stringify([`/images/photos/products/${id}.webp`])],
    );
    products += r.rowCount;
  }
  const collections = await client.query(
    `update collections set cover_url = regexp_replace(cover_url, '^/images/scenes/(collection-[a-z]+)\\.svg$', '/images/photos/scenes/\\1.webp')
     where cover_url like '/images/scenes/%.svg'`,
  );
  await client.query("commit");
  console.log(`branch ${process.env.NEON_BRANCH}: ${products} products and ${collections.rowCount} collections now use photos`);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
