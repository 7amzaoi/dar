import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Image wrapper for product/scene art. Placeholders are SVG and uploads are /api/files/* redirects
 * to presigned storage URLs, so we skip the optimizer.
 * TODO(backend): put a CDN in front of the bucket and drop `unoptimized`.
 */
export function FurnitureImage({
  src,
  alt,
  className,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority,
}: {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) {
    return <div className={cn("absolute inset-0 bg-gradient-to-br from-secondary to-muted", className)} aria-hidden />;
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized className={cn("object-cover", className)} />;
}
