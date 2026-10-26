/**
 * THE single entry point the UI imports data from.
 *
 * The browser talks to Lakebase Postgres through /api/data (see ./http.ts and
 * lib/server/policy.ts). Nothing in /app or /components depends on that detail.
 */
import { httpDataSource } from "./http";
import { CATEGORY_COVERS } from "./covers";
import type { DataSource } from "./types";

export const db: DataSource = httpDataSource;

/** Presentational cover art for top-level categories. TODO(backend): move to a `cover_url` column. */
export const categoryCovers: Record<string, string> = CATEGORY_COVERS;

export * from "./types";
export * from "./helpers";
