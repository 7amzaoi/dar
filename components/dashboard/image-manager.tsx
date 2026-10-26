"use client";

import { useRef, useState } from "react";
import { ImagePlus, Library, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Upload one image to Neon Object Storage through /api/uploads; resolves to its app URL. */
async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? `HTTP_${res.status}`);
  return json.url;
}

/** Manage an ordered list of image URLs. New files are uploaded to the `assets` bucket. */
export function ImageManager({
  value,
  onChange,
  library,
  expandLibraryPick = (src) => [src],
  invalid,
  max = 8,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  library: string[];
  /** a library pick can add several angles at once */
  expandLibraryPick?: (src: string) => string[];
  invalid?: boolean;
  max?: number;
}) {
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [uploading, setUploading] = useState(0);

  const addFiles = async (files: FileList | null) => {
    const picked = [...(files ?? [])].filter((f) => f.type.startsWith("image/")).slice(0, max - value.length);
    if (!picked.length) return;
    setUploading(picked.length);
    const results = await Promise.allSettled(picked.map(uploadImage));
    setUploading(0);
    const urls = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (urls.length < picked.length) toast.error(t("mfr.uploadFailed"));
    if (urls.length) onChange([...value, ...urls].slice(0, max));
  };

  return (
    <div className="space-y-4">
      <div
        className={cn("grid grid-cols-3 gap-3 sm:grid-cols-4", invalid && value.length === 0 && "rounded-2xl ring-1 ring-destructive")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void addFiles(e.dataTransfer.files);
        }}
      >
        {value.map((src, i) => (
          <div key={src + i} className="group relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-secondary">
            <FurnitureImage src={src} alt="" sizes="160px" />
            {i === 0 && <span className="absolute start-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[0.65rem] font-medium">{t("mfr.cover")}</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-ink/60 to-transparent p-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([src, ...value.filter((_, j) => j !== i)])}
                  className="inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground"
                  aria-label={t("mfr.setCover")}
                  title={t("mfr.setCover")}
                >
                  <Star className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-destructive"
                aria-label={t("common.remove")}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            disabled={uploading > 0}
            aria-busy={uploading > 0}
            onClick={() => fileRef.current?.click()}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
          >
            {uploading > 0 ? <Loader2 className="size-5 animate-spin" strokeWidth={1.4} /> : <ImagePlus className="size-5" strokeWidth={1.4} />}
            {uploading > 0 ? t("mfr.uploading") : t("mfr.uploadImages")}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }} tabIndex={-1} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setLibraryOpen(true)}>
          <Library className="size-3.5" /> {t("mfr.fromLibrary")}
        </Button>
        <span className="text-xs text-muted-foreground">{t("mfr.imagesHint")}</span>
      </div>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">{t("mfr.libraryTitle")}</DialogTitle>
            <DialogDescription>{t("mfr.libraryBody")}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pe-3">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {library.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    const add = expandLibraryPick(src).filter((s) => !value.includes(s));
                    onChange([...value, ...add].slice(0, max));
                    setLibraryOpen(false);
                  }}
                  className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-secondary ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-brand focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <FurnitureImage src={src} alt="" sizes="140px" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
