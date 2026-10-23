"use client";

import { useState } from "react";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/widgets";
import { Field } from "@/components/shared/field";
import { EmptyState, QueryView, SkeletonRows } from "@/components/shared/states";
import { childCategories, db, topLevelCategories, type Category } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

function CategoryDialog({ initial, categories, onClose }: { initial: Category | null; categories: Category[]; onClose: () => void }) {
  const { t, tx } = useT();
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [parentId, setParentId] = useState(initial?.parentId ?? "none");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const errAr = touched && nameAr.trim().length < 2 ? t("auth.errMin", { n: 2 }) : undefined;
  const errEn = touched && nameEn.trim().length < 2 ? t("auth.errMin", { n: 2 }) : undefined;
  // a category can't become its own parent, and only two levels are supported
  const parents = topLevelCategories(categories).filter((c) => c.id !== initial?.id);
  const hasChildren = initial ? childCategories(categories, initial.id).length > 0 : false;

  const save = async () => {
    setTouched(true);
    if (nameAr.trim().length < 2 || nameEn.trim().length < 2) return;
    setBusy(true);
    try {
      const input = { nameAr: nameAr.trim(), nameEn: nameEn.trim(), parentId: parentId === "none" ? undefined : parentId };
      if (initial) await db.categories.update(initial.id, input);
      else await db.categories.create(input);
      toast.success(initial ? t("common.updated") : t("common.created"));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">{initial ? t("admin.editCategory") : t("admin.newCategory")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="cat-ar" label={t("admin.nameAr")} error={errAr}>
            <Input id="cat-ar" dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} aria-invalid={!!errAr} />
          </Field>
          <Field id="cat-en" label={t("admin.nameEn")} error={errEn}>
            <Input id="cat-en" dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} aria-invalid={!!errEn} />
          </Field>
          <Field id="cat-parent" label={t("admin.parent")}>
            <Select value={parentId} onValueChange={setParentId} disabled={hasChildren}>
              <SelectTrigger id="cat-parent" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("admin.noParent")}</SelectItem>
                {parents.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{tx(c.nameAr, c.nameEn)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={save} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryRow({ c, child, count, onEdit, onRemove }: { c: Category; child?: boolean; count: number; onEdit: () => void; onRemove: () => Promise<void> }) {
  const { t, tx } = useT();
  return (
    <li className={`flex items-center gap-4 border-b border-hairline px-6 py-3.5 last:border-b-0 ${child ? "ps-12" : "bg-muted/30"}`}>
      <span className="min-w-0 flex-1">
        <span className={child ? "text-sm" : "font-display text-lg"}>{tx(c.nameAr, c.nameEn)}</span>
        <span className="ms-3 text-xs text-muted-foreground">{tx(c.nameEn, c.nameAr)}</span>
      </span>
      {child && <span className="text-xs tabular-nums text-muted-foreground">{t("common.pieces", { count })}</span>}
      <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={t("common.edit")}>
        <Pencil className="size-3.5" strokeWidth={1.6} />
      </Button>
      <ConfirmDialog
        title={t("common.deleteConfirmTitle")}
        description={t("common.deleteConfirmBody")}
        confirmLabel={t("common.delete")}
        onConfirm={onRemove}
        trigger={
          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={t("common.delete")}>
            <Trash2 className="size-3.5" strokeWidth={1.6} />
          </Button>
        }
      />
    </li>
  );
}

export default function CategoriesPage() {
  const { t } = useT();
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const q = useQuery(async () => {
    const [categories, products] = await Promise.all([db.categories.list(), db.products.list({ publishedOnly: false })]);
    return { categories, counts: products.reduce((m, p) => m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1), new Map<string, number>()) };
  }, []);

  const remove = async (c: Category) => {
    try {
      await db.categories.remove(c.id);
      toast.success(t("common.deleted"));
    } catch {
      toast.error(t("admin.categoryInUse"));
    }
  };

  return (
    <>
      <PageHeader
        title={t("admin.categoriesTitle")}
        description={t("admin.categoriesSubtitle")}
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus className="size-4" /> {t("admin.newCategory")}
          </Button>
        }
      />
      <QueryView query={q} loading={<SkeletonRows rows={8} />} isEmpty={(d) => d.categories.length === 0} empty={<EmptyState icon={FolderTree} title={t("common.noResults")} />}>
        {(d) => (
          <ul className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
            {topLevelCategories(d.categories).map((top) => (
              <li key={top.id}>
                <ul>
                  <CategoryRow c={top} count={0} onEdit={() => setEditing(top)} onRemove={() => remove(top)} />
                  {childCategories(d.categories, top.id).map((c) => (
                    <CategoryRow key={c.id} c={c} child count={d.counts.get(c.id) ?? 0} onEdit={() => setEditing(c)} onRemove={() => remove(c)} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
      {editing !== undefined && q.data && <CategoryDialog key={editing?.id ?? "new"} initial={editing} categories={q.data.categories} onClose={() => setEditing(undefined)} />}
    </>
  );
}
