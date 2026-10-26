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
const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));

/** Identifies JPEG, PNG, WebP and AVIF by their signature bytes; anything else is null. */
export function sniffImage(bytes: Uint8Array): { type: string; ext: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return { type: "image/png", ext: "png" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return { type: "image/webp", ext: "webp" };
  if (ascii(bytes, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 12))) return { type: "image/avif", ext: "avif" };
  return null;
}

/** App URL for a stored object; /api/files redirects it to a short-lived presigned GET. */
export const fileUrl = (key: string) => `/api/files/${key}`;
