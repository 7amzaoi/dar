import "server-only";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

/**
 * Neon Object Storage (S3-compatible, branches with the database). The adapter reads
 * AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_ENDPOINT_URL_S3 / AWS_REGION from the env.
 * The bucket is private: the app stores object keys and serves them through presigned URLs.
 */
export const ASSETS_BUCKET = "assets";

const globalForFiles = globalThis as unknown as { assetFiles?: Files };
export const assets = globalForFiles.assetFiles ?? new Files({ adapter: neon({ bucket: ASSETS_BUCKET }) });
if (process.env.NODE_ENV !== "production") globalForFiles.assetFiles = assets;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** App URL for a stored object; /api/files redirects it to a short-lived presigned GET. */
export const fileUrl = (key: string) => `/api/files/${key}`;
