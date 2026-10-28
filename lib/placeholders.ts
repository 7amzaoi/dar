import photos from "../scripts/photos.json";

/**
 * The stock photo library makers can pick from when they have no photos of their own yet:
 * the catalogue's Unsplash photos (scripts/photos.json, files in /public/images/photos).
 */
export const PRODUCT_LIBRARY: string[] = Object.keys(photos.products).map((id) => `/images/photos/products/${id}.webp`);

export const SCENE_LIBRARY: string[] = Object.keys(photos.scenes).map((name) => `/images/photos/scenes/${name}.webp`);
