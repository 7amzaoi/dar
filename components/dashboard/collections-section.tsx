"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { Field } from "@/components/shared/field";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { EmptyState, QueryView, SkeletonGrid } from "@/components/shared/states";
import { useAuth } from "@/lib/auth";
import { db, type Collection } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";
import { SCENE_PLACEHOLDERS } from "@/lib/placeholders";
import { cn } from "@/lib/utils";

function CollectionDialog({
  open,
  onOpenChange,
  initial,
  manufacturerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Collection | null;
  manufacturerId: string;
}) {
  const { t } = useT();
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [cover, setCover] = useState(initial?.coverUrl ?? SCENE_PLACEHOLDERS[0]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const errAr = touched && nameAr.trim().length < 2 ? t("auth.errMin", { n: 2 }) : undefined;
  const errEn = touched && nameEn.trim().length < 2 ? t("auth.errMin", { n: 2 }) : undefined;

  const save = async () => {
    setTouched(true);
    if (nameAr.trim().length < 2 || nameEn.trim().length < 2) return;
    setBusy(true);
    try {
      if (initial) await db.collections.update(initial.id, { nameAr, nameEn, coverUrl: cover });
      else await db.collections.create({ manufacturerId, nameAr, nameEn, coverUrl: cover });
      toast.success(initial ? t("common.updated") : t("common.created"));
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">{initial ? t("mfr.editCollection") : t("mfr.newCollection")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="col-ar" label={t("mfr.collectionNameAr")} error={errAr}>
              <Input id="col-ar" dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} aria-invalid={!!errAr} />
            </Field>
            <Field id="col-en" label={t("mfr.collectionNameEn")} error={errEn}>
              <Input id="col-en" dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} aria-invalid={!!errEn} />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-[0.8rem] font-medium">{t("mfr.collectionCover")}</legend>
            <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4" role="radiogroup">
              {SCENE_PLACEHOLDERS.map((src) => (
                <button
                  key={src}
                  type="button"
                  role="radio"
                  aria-checked={cover === src}
                  onClick={() => setCover(src)}
                  className={cn("relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-secondary ring-offset-2 ring-offset-background", cover === src ? "ring-2 ring-brand" : "opacity-80 hover:opacity-100")}
                >
                  <FurnitureImage src={src} alt="" sizes="160px" />
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={save} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A maker's collections, managed inline on the products page (no separate menu item). */
export function CollectionsSection() {
  const { t, tx } = useT();
  const { currentUser } = useAuth();
  const companyId = currentUser?.companyId ?? "";
  const [editing, setEditing] = useState<Collection | null>(null);
  const [open, setOpen] = useState(false);

  const q = useQuery(async () => {
    const [collections, products] = await Promise.all([db.collections.listByManufacturer(companyId), db.products.listByManufacturer(companyId)]);
    return collections.map((c) => ({ collection: c, count: products.filter((p) => p.collectionId === c.id).length }));
  }, [companyId]);

  const openDialog = (c: Collection | null) => {
    setEditing(c);
    setOpen(true);
  };

  const newButton = (
    <Button onClick={() => openDialog(null)}>
      <Plus className="size-4" /> {t("mfr.newCollection")}
    </Button>
  );

  return (
    <section id="collections" aria-labelledby="collections-title" className="mt-16 scroll-mt-28 border-t border-hairline pt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="collections-title" className="font-display text-3xl">{t("mfr.collectionsTitle")}</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{t("mfr.collectionsSubtitle")}</p>
        </div>
        {newButton}
      </div>
      <QueryView
        query={q}
        loading={<SkeletonGrid count={3} className="md:grid-cols-3" />}
        empty={<EmptyState icon={FolderOpen} title={t("mfr.emptyCollections")} body={t("mfr.emptyCollectionsBody")} action={newButton} />}
      >
        {(items) => (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(({ collection: c, count }) => (
              <article key={c.id} className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-soft">
                <Link href={`/catalog?collection=${c.id}`} className="relative block aspect-[16/10] bg-secondary">
                  <FurnitureImage src={c.coverUrl} alt="" sizes="(min-width: 1280px) 30vw, 50vw" />
                </Link>
                <div className="flex items-center justify-between gap-3 p-5">
                  <div>
                    <h2 className="font-display text-2xl">{tx(c.nameAr, c.nameEn)}</h2>
                    <p className="text-xs text-muted-foreground">{t("common.pieces", { count })}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openDialog(c)} aria-label={t("common.edit")}>
                      <Pencil className="size-3.5" strokeWidth={1.6} />
                    </Button>
                    <ConfirmDialog
                      title={t("common.deleteConfirmTitle")}
                      description={t("mfr.deleteCollectionBody")}
                      confirmLabel={t("common.delete")}
                      onConfirm={async () => {
                        await db.collections.remove(c.id);
                        toast.success(t("common.deleted"));
                      }}
                      trigger={
                        <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={t("common.delete")}>
                          <Trash2 className="size-3.5" strokeWidth={1.6} />
                        </Button>
                      }
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </QueryView>
      {open && <CollectionDialog key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} initial={editing} manufacturerId={companyId} />}
    </section>
  );
}
