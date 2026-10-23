/**
 * The generated placeholder imagery in /public/images (see scripts/generate-placeholders.mjs).
 * TODO(backend): replaced by uploads to object storage (S3 / Supabase Storage) + a CDN.
 */
const KINDS = [
  "sofa",
  "sectional",
  "armchair",
  "bed",
  "nightstand",
  "wardrobe",
  "dining-table",
  "dining-chair",
  "sideboard",
  "desk",
  "office-chair",
  "bookshelf",
  "lamp",
  "mirror",
  "vase",
] as const;
const TONES = ["ivory", "sage", "terracotta", "espresso", "stone", "ink"] as const;

export const PRODUCT_PLACEHOLDERS: string[] = KINDS.flatMap((k) => TONES.map((t) => `/images/products/${k}-${t}-a.svg`));

/** The three-angle set for a single placeholder (cover + alternate + detail). */
export function placeholderSet(cover: string) {
  return ["a", "b", "c"].map((v) => cover.replace(/-a\.svg$/, `-${v}.svg`));
}

export const SCENE_PLACEHOLDERS: string[] = [
  "hero-living",
  "hero-dining",
  "hero-bedroom",
  "collection-sahel",
  "collection-nocturne",
  "collection-andalus",
  "collection-olive",
  "collection-studio",
  "collection-cedar",
  "collection-dune",
  "collection-atrium",
  "cta-workshop",
].map((n) => `/images/scenes/${n}.svg`);
