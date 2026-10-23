"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ClipboardList, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel } from "@/components/dashboard/widgets";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { QuantityInput } from "@/components/shared/quantity-input";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/states";
import { useAuth } from "@/lib/auth";
import { db, tierFor, type Company, type Product } from "@/lib/data";
import { useRfq, type RfqLine } from "@/lib/hooks/commerce-providers";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Mode = "quote" | "order";

function MakerGroup({
  maker,
  lines,
  products,
  onSubmitted,
}: {
  maker: Company;
  lines: RfqLine[];
  products: Map<string, Product>;
  onSubmitted: () => void;
}) {
  const { t, tx, formatPrice } = useT();
  const { currentUser } = useAuth();
  const rfq = useRfq();
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<Mode>("quote");
  const [busy, setBusy] = useState(false);

  const rows = lines.map((l) => {
    const p = products.get(l.productId);
    const tier = p ? tierFor(p.priceTiers, l.qty) : undefined;
    return { line: l, product: p, unit: tier?.unitPrice ?? 0, below: p ? l.qty < p.minOrderQty : false, unavailable: p ? p.stockStatus === "out_of_stock" || !p.published : true };
  });
  const subtotal = rows.reduce((s, r) => s + r.unit * r.line.qty, 0);
  const blocked = rows.some((r) => r.below || r.unavailable);

  const submit = async () => {
    if (!currentUser) return;
    setBusy(true);
    try {
      // TODO(backend): submit as one server transaction (order + notification + email to maker).
      await db.orders.create({
        retailerId: currentUser.companyId,
        manufacturerId: maker.id,
        isRFQ: mode === "quote",
        note: note.trim() || undefined,
        items: rows.map((r) => ({ productId: r.line.productId, qty: r.line.qty, unitPrice: mode === "order" ? r.unit : undefined })),
      });
      rfq.removeMany(lines.map((l) => l.productId));
      toast.success(t("ret.submitted", { name: maker.name }));
      onSubmitted();
    } catch {
      toast.error(t("common.errorBody"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title={t("ret.groupFrom", { name: maker.name })}
      bodyClassName="p-0"
      actions={<span className="text-xs text-muted-foreground">{t("common.pieces", { count: lines.reduce((n, l) => n + l.qty, 0) })}</span>}
    >
      <ul className="divide-y divide-hairline">
        {rows.map(({ line, product: p, unit, below, unavailable }) => (
          <li key={line.productId} className="flex flex-wrap items-center gap-4 px-6 py-4 sm:flex-nowrap">
            <div className="relative size-20 shrink-0 overflow-hidden rounded bg-secondary">
              <FurnitureImage src={p?.images[0]} alt="" sizes="80px" />
            </div>
            <div className="min-w-0 flex-1">
              {p ? (
                <Link href={`/product/${p.id}`} className="block truncate font-display text-lg hover:underline">
                  {tx(p.titleAr, p.titleEn)}
                </Link>
              ) : (
                <span className="text-muted-foreground">{line.productId}</span>
              )}
              <div className="text-xs text-muted-foreground">
                {formatPrice(unit)} {t("common.perUnit")}
              </div>
              {(below || unavailable) && (
                <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" />
                  {unavailable ? t("status.stock.out_of_stock") : t("ret.belowMoq", { qty: p?.minOrderQty ?? 0 })}
                </div>
              )}
            </div>
            <QuantityInput value={line.qty} onChange={(v) => rfq.set(line.productId, v)} min={1} size="sm" />
            <div className="w-28 text-end font-display text-lg tabular-nums">{formatPrice(unit * line.qty)}</div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const removed = line;
                rfq.remove(line.productId);
                toast(t("ret.lineRemoved"), { action: { label: t("common.undo"), onClick: () => rfq.set(removed.productId, removed.qty) } });
              }}
              aria-label={t("ret.removeLine")}
            >
              <Trash2 className="size-3.5" strokeWidth={1.6} />
            </Button>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 border-t border-hairline p-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-muted-foreground">{t("ret.modeLabel")}</legend>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
              {(["quote", "order"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={cn("rounded-2xl border px-4 py-3 text-start transition-colors", mode === m ? "border-foreground bg-surface" : "border-border hover:border-foreground/40")}
                >
                  <span className="block text-sm font-medium">{m === "quote" ? t("ret.modeQuote") : t("ret.modeOrder")}</span>
                  <span className="block text-xs text-muted-foreground">{m === "quote" ? t("ret.modeQuoteBody") : t("ret.modeOrderBody")}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("ret.notePlaceholder")} rows={3} aria-label={t("mfr.retailerNote")} dir="auto" />
        </div>
        <div className="flex flex-col justify-end gap-3 lg:min-w-60 lg:items-end">
          <div className="lg:text-end">
            <div className="text-xs text-muted-foreground">{t("ret.estSubtotal")}</div>
            <div className="font-display text-3xl tabular-nums">{formatPrice(subtotal)}</div>
          </div>
          <Button size="lg" disabled={busy || blocked} onClick={submit}>
            {busy ? t("common.saving") : t("ret.submitOne", { name: maker.name })}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export default function RfqPage() {
  const { t } = useT();
  const router = useRouter();
  const rfq = useRfq();
  const ids = rfq.lines.map((l) => l.productId).sort();

  const q = useQuery(async () => {
    const products = await db.products.getMany(ids);
    const makerIds = [...new Set(products.map((p) => p.manufacturerId))];
    const makers = (await Promise.all(makerIds.map((id) => db.companies.getById(id)))).filter((c): c is Company => !!c);
    return { products: new Map(products.map((p) => [p.id, p])), makers };
  }, [ids]);

  const groups = (q.data?.makers ?? [])
    .map((maker) => ({ maker, lines: rfq.lines.filter((l) => q.data?.products.get(l.productId)?.manufacturerId === maker.id) }))
    .filter((g) => g.lines.length > 0);

  return (
    <>
      <PageHeader
        title={t("ret.rfqTitle")}
        description={t("ret.rfqSubtitle")}
        actions={
          rfq.count > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                const snapshot = rfq.lines;
                rfq.clear();
                toast(t("ret.listCleared"), { action: { label: t("common.undo"), onClick: () => snapshot.forEach((l) => rfq.set(l.productId, l.qty)) } });
              }}
            >
              {t("ret.clearList")}
            </Button>
          )
        }
      />
      {rfq.count === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t("ret.emptyRfq")}
          body={t("ret.emptyRfqBody")}
          action={<Button asChild><Link href="/catalog">{t("dash.browse")}</Link></Button>}
        />
      ) : q.error ? (
        <ErrorState onRetry={q.reload} />
      ) : !q.data ? (
        <SkeletonRows rows={5} />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <MakerGroup key={g.maker.id} maker={g.maker} lines={g.lines} products={q.data!.products} onSubmitted={() => rfq.count <= g.lines.length && router.push("/retailer/orders")} />
          ))}
        </div>
      )}
    </>
  );
}
