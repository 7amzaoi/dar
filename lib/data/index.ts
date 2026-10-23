/**
 * THE single entry point the UI imports data from.
 *
 * To move to a real database, implement `DataSource` (see ./types.ts) in e.g.
 * `./supabase/index.ts` and change the one import below. Nothing in /app or
 * /components needs to change.
 */
import { mockDataSource, resetMockData, DEMO_USER_BY_ROLE, CATEGORY_COVERS } from "./mock";
import type { DataSource } from "./types";

// TODO(backend): swap `mockDataSource` for the real implementation.
export const db: DataSource = mockDataSource;

/** Dev-only: restore seed data (used by the role switcher). TODO(backend): remove. */
export const resetDemoData = resetMockData;

/** Dev-only demo accounts used by the role switcher and "try a demo account" login. TODO(backend): remove. */
export const demoUserIdByRole = DEMO_USER_BY_ROLE;

/** Presentational cover art for top-level categories. TODO(backend): move to a `cover_url` column. */
export const categoryCovers: Record<string, string> = CATEGORY_COVERS;

export * from "./types";
export * from "./helpers";
