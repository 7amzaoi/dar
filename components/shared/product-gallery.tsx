"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-secondary shadow-soft">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={current}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <FurnitureImage src={current} alt={title} priority sizes="(min-width: 1024px) 55vw, 100vw" />
          </motion.div>
        </AnimatePresence>
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5" role="tablist" aria-label={title}>
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${title} — ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-sm bg-secondary ring-offset-2 ring-offset-background transition-all",
                i === active ? "ring-1 ring-foreground" : "opacity-70 hover:opacity-100",
              )}
            >
              <FurnitureImage src={src} alt="" sizes="120px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
