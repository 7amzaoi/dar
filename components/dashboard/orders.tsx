"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader, Panel } from "@/components/dashboard/widgets";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { ArrowBack, ArrowForward } from "@/components/shared/icons";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/states";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { useAuth } from "@/lib/auth";
import {
  db,
  DIRECT_PIPELINE,
  nextManufacturerStatus,
  ORDER_PIPELINE,
  orderTotal,
  tierFor,
  type Order,
  type OrderStatus,
  type Product,
} from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Side = "manufacturer" | "retailer";
type Tab = "all" | "rfq" | "active" | "done";

const TAB_FILTER: Record<Tab, (o: Order) => boolean> = {
  all: () => true,
  rfq: (o) => o.status === "quote_requested" || o.status === "quoted",
  active: (o) => ["confirmed", "in_production", "shipped"].includes(o.status),
  done: (o) => o.status === "completed" || o.status === "cancelled",
};

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

export function OrdersList({ side }: { side: Side }) {
  const { t, formatPrice, formatDate } = useT();
  const { currentUser } = useAuth();
  const companyId = currentUser?.companyId ?? "";
  const [tab, setTab] = useState<Tab>("all");

  const q = useQuery(async () => {
    const [orders, companies, products] = await Promise.all([
      side === "manufacturer" ? db.orders.listByManufacturer(companyId) : db.orders.listByRetailer(companyId),
      db.companies.list(),
      db.products.list({ publishedOnly: false }),
    ]);
    return { orders, companies: new Map(companies.map((c) => [c.id, c.name])), products: new Map(products.map((p) => [p.id, p])) };
  }, [side, companyId]);

  const counter = (o: Order) => q.data?.companies.get(side === "manufacturer" ? o.retailerId : o.manufacturerId) ?? "—";
  const rows = q.data?.orders.filter(TAB_FILTER[tab]);

  const columns: Column<Order>[] = [
    { key: "id", header: t("mfr.colOrder"), sortValue: (o) => o.id, cell: (o) => <span className="font-mono text-xs">{o.id}</span> },
    { key: "party", header: side === "manufacturer" ? t("mfr.colRetailer") : t("ret.colMaker"), sortValue: counter, cell: (o) => <span className="font-medium">{counter(o)}</span> },
    { key: "items", header: t("mfr.colItems"), cell: (o) => <span className="tabular-nums text-muted-foreground">{t("common.pieces", { count: o.items.reduce((n, i) => n + i.qty, 0) })}</span> },
    {
      key: "value",
      header: t("mfr.colValue"),
      sortValue: (o) => (q.data ? orderTotal(o, q.data.products) : 0),
      cell: (o) => <span className="tabular-nums">{q.data ? formatPrice(orderTotal(o, q.data.products)) : "—"}</span>,
    },
    { key: "status", header: t("common.status"), cell: (o) => <OrderStatusBadge status={o.status} /> },
    { key: "date", header: t("mfr.colDate"), sortValue: (o) => o.createdAt, cell: (o) => <span className="text-muted-foreground">{formatDate(o.createdAt)}</span> },
  ];

  const tabs: [Tab, string][] = [
    ["all", t("mfr.tabAll")],
    ["rfq", t("mfr.tabRfq")],
    ["active", t("mfr.tabActive")],
    ["done", t("mfr.tabDone")],
  ];

  return (
    <>
      <PageHeader
        title={side === "manufacturer" ? t("mfr.ordersTitle") : t("ret.ordersTitle")}
        description={side === "manufacturer" ? t("mfr.ordersSubtitle") : t("ret.ordersSubtitle")}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-5">
        <TabsList>
          {tabs.map(([k, label]) => (
            <TabsTrigger key={k} value={k} className="px-4">
              {label}
              {q.data && <span className="ms-1.5 text-[0.7rem] tabular-nums text-muted-foreground">{q.data.orders.filter(TAB_FILTER[k]).length}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(o) => o.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.reload}
        searchText={(o) => `${o.id} ${counter(o)}`}
        rowHref={(o) => `/${side}/orders/${o.id}`}
        empty={
          side === "manufacturer"
            ? { title: t("mfr.emptyOrders"), body: t("mfr.emptyOrdersBody") }
            : { title: t("ret.emptyOrders"), body: t("ret.emptyOrdersBody"), action: <Button asChild><Link href="/catalog">{t("dash.browse")}</Link></Button> }
        }
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

export function OrderTimeline({ order }: { order: Order }) {
  const { t, formatDate } = useT();
  const path = order.isRFQ ? ORDER_PIPELINE : DIRECT_PIPELINE;
  const at = new Map((order.history ?? []).map((h) => [h.status, h.at]));
  const cancelled = order.status === "cancelled";
  const reached = cancelled ? -1 : path.indexOf(order.status);
  const steps: OrderStatus[] = cancelled ? [...path.filter((s) => at.has(s)), "cancelled"] : path;

  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const done = cancelled ? true : i <= reached;
        const current = cancelled ? s === "cancelled" : i === reached;
        return (
          <li key={s} className="relative flex gap-4 pb-7 last:pb-0">
            {i < steps.length - 1 && <span className={cn("absolute start-[0.69rem] top-6 h-[calc(100%-1.25rem)] w-px", done && !current ? "bg-foreground/50" : "bg-border")} aria-hidden />}
            <span
              className={cn(
                "relative z-10 mt-0.5 inline-flex size-[1.4rem] shrink-0 items-center justify-center rounded-full border",
                s === "cancelled" ? "border-destructive bg-destructive text-background" : current ? "border-brand bg-brand text-brand-foreground" : done ? "border-foreground bg-foreground text-background" : "border-border bg-background",
              )}
            >
              {s === "cancelled" ? <X className="size-3" /> : done && <Check className="size-3" />}
            </span>
            <div className="min-w-0">
              <div className={cn("text-sm", !done && "text-muted-foreground", current && "font-medium")}>{t(`status.order.${s}`)}</div>
              {at.get(s) && <div className="text-xs text-muted-foreground">{formatDate(at.get(s)!, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

function QuoteForm({ order, products }: { order: Order; products: Map<string, Product> }) {
  const { t, tx, formatPrice } = useT();
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      order.items.map((i) => {
        const p = products.get(i.productId);
        return [i.productId, p ? tierFor(p.priceTiers, i.qty)?.unitPrice ?? 0 : 0];
      }),
    ),
  );
  const [busy, setBusy] = useState(false);
  const total = order.items.reduce((s, i) => s + (prices[i.productId] ?? 0) * i.qty, 0);
  const valid = order.items.every((i) => (prices[i.productId] ?? 0) > 0);

  return (
    <Panel title={t("mfr.respondTitle")} description={t("mfr.respondBody")}>
      <div className="space-y-3">
        {order.items.map((item) => {
          const p = products.get(item.productId);
          const suggested = p ? tierFor(p.priceTiers, item.qty)?.unitPrice : undefined;
          return (
            <div key={item.productId} className="grid grid-cols-[1fr_auto] items-center gap-4 sm:grid-cols-[1fr_auto_9rem]">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p ? tx(p.titleAr, p.titleEn) : item.productId}</div>
                <div className="text-xs text-muted-foreground">
                  × {item.qty}
                  {suggested != null && ` · ${t("mfr.suggested", { price: formatPrice(suggested) })}`}
                </div>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">{t("common.unitPrice")}</span>
              <Input
                type="number"
                min={0}
                step="5"
                value={prices[item.productId] ?? 0}
                onChange={(e) => setPrices((s) => ({ ...s, [item.productId]: Math.max(0, Number(e.target.value)) }))}
                aria-label={`${t("common.unitPrice")} — ${p ? tx(p.titleAr, p.titleEn) : item.productId}`}
                className="h-9 w-32 tabular-nums sm:w-full"
              />
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
        <div>
          <div className="text-xs text-muted-foreground">{t("ret.quotedTotal")}</div>
          <div className="font-display text-3xl tabular-nums">{formatPrice(total)}</div>
        </div>
        <div className="flex gap-2">
          <ConfirmDialog
            title={t("mfr.cancelConfirm")}
            description={t("mfr.cancelConfirmBody")}
            confirmLabel={t("mfr.cancelOrder")}
            onConfirm={async () => {
              await db.orders.updateStatus(order.id, "cancelled");
              toast.success(t("mfr.statusUpdated"));
            }}
            trigger={<Button variant="ghost">{t("mfr.cancelOrder")}</Button>}
          />
          <Button
            disabled={!valid || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await db.orders.submitQuote(order.id, prices);
                toast.success(t("mfr.quoteSent"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("common.saving") : t("mfr.sendQuote")}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export function OrderDetail({ side, id }: { side: Side; id: string }) {
  const { t, tx, formatPrice, formatDate, city, country } = useT();
  const { currentUser, company: myCompany } = useAuth();
  const [busy, setBusy] = useState(false);

  const q = useQuery(async () => {
    const order = await db.orders.getById(id);
    if (!order) return null;
    const [products, retailer, maker] = await Promise.all([
      db.products.getMany(order.items.map((i) => i.productId)),
      db.companies.getById(order.retailerId),
      db.companies.getById(order.manufacturerId),
    ]);
    return { order, products: new Map(products.map((p) => [p.id, p])), retailer, maker };
  }, [id]);

  if (q.error) return <ErrorState onRetry={q.reload} />;
  if (!q.data && q.data !== null) return <SkeletonRows rows={6} />;

  const data = q.data;
  const ownId = side === "manufacturer" ? data?.order.manufacturerId : data?.order.retailerId;
  if (!data || ownId !== currentUser?.companyId) {
    return (
      <EmptyState
        title={t("common.notFound")}
        body={t("common.notFoundBody")}
        action={<Button variant="outline" asChild><Link href={`/${side}/orders`}>{t("dash.orders")}</Link></Button>}
      />
    );
  }

  const { order, products, retailer, maker } = data;
  const counterparty = side === "manufacturer" ? retailer : maker;
  const total = orderTotal(order, products);
  const priced = order.items.every((i) => i.unitPrice != null);
  const next = nextManufacturerStatus(order.status);

  const setStatus = async (status: OrderStatus, message: string) => {
    setBusy(true);
    try {
      await db.orders.updateStatus(order.id, status);
      toast.success(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link href={`/${side}/orders`} className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowBack className="size-3.5" /> {t("dash.orders")}
      </Link>
      <PageHeader
        eyebrow={order.isRFQ ? t("ret.modeQuote") : t("ret.modeOrder")}
        title={`${t("mfr.colOrder")} ${order.id}`}
        description={`${counterparty?.name ?? ""} · ${formatDate(order.createdAt)}`}
        actions={
          <>
            <OrderStatusBadge status={order.status} className="h-8 px-3 text-xs" />
            {counterparty && (
              <WhatsAppButton
                company={counterparty}
                label={side === "manufacturer" ? t("whatsapp.chatShowroom") : t("whatsapp.chatMaker")}
                text={t("whatsapp.orderText", { other: counterparty.name, name: currentUser?.name ?? "", company: myCompany?.name ?? "", order: order.id })}
              />
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {side === "manufacturer" && order.status === "quote_requested" && <QuoteForm order={order} products={products} />}

          {side === "retailer" && order.status === "quoted" && (
            <Panel className="border-brand/40 bg-brand/5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="eyebrow mb-1">{t("ret.quotesReady")}</div>
                  <div className="font-display text-3xl tabular-nums">{formatPrice(total)}</div>
                </div>
                <div className="flex gap-2">
                  <ConfirmDialog
                    title={t("ret.declineConfirm")}
                    description={t("ret.declineConfirmBody")}
                    confirmLabel={t("ret.declineQuote")}
                    onConfirm={() => setStatus("cancelled", t("ret.quoteDeclined"))}
                    trigger={
                      <Button variant="ghost" disabled={busy}>
                        {t("ret.declineQuote")}
                      </Button>
                    }
                  />
                  <Button disabled={busy} onClick={() => setStatus("confirmed", t("ret.quoteAccepted"))}>
                    <Check className="size-4" /> {t("ret.acceptQuote")}
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {side === "retailer" && order.status === "quote_requested" && (
            <Panel>
              <p className="text-sm text-muted-foreground">{t("ret.awaitingQuote")}</p>
            </Panel>
          )}

          {side === "manufacturer" && next && (
            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <OrderStatusBadge status={order.status} />
                <Button disabled={busy} onClick={() => setStatus(next, t("mfr.statusUpdated"))}>
                  {t("mfr.advanceTo", { status: t(`status.order.${next}`) })} <ArrowForward className="size-4" />
                </Button>
              </div>
            </Panel>
          )}

          <Panel title={t("mfr.colItems")} bodyClassName="p-0">
            <ul className="divide-y divide-hairline">
              {order.items.map((item) => {
                const p = products.get(item.productId);
                const unit = item.unitPrice ?? (p ? tierFor(p.priceTiers, item.qty)?.unitPrice : undefined);
                return (
                  <li key={item.productId} className="flex items-center gap-4 px-6 py-4">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded bg-secondary">
                      <FurnitureImage src={p?.images[0]} alt="" sizes="64px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {p ? (
                        <Link href={`/product/${p.id}`} className="block truncate font-medium hover:underline">
                          {tx(p.titleAr, p.titleEn)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{item.productId}</span>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {item.qty} × {unit != null ? formatPrice(unit) : "—"}
                        {item.unitPrice == null && unit != null && ` (${t("product.tierTitle")})`}
                      </div>
                    </div>
                    <div className="text-end font-display text-xl tabular-nums">{unit != null ? formatPrice(unit * item.qty) : "—"}</div>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-hairline px-6 py-4">
              <span className="text-sm text-muted-foreground">{priced ? t("common.total") : t("ret.estSubtotal")}</span>
              <span className="font-display text-2xl tabular-nums">{formatPrice(total)}</span>
            </div>
          </Panel>

          {order.note && (
            <Panel title={t("mfr.retailerNote")}>
              <p className="text-sm leading-relaxed">{order.note}</p>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title={t("ret.timeline")}>
            <OrderTimeline order={order} />
          </Panel>
          {counterparty && (
            <Panel title={side === "manufacturer" ? t("mfr.colRetailer") : t("ret.colMaker")}>
              <div className="font-display text-xl">{counterparty.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{city(counterparty.city)}, {country(counterparty.country)}</div>
              <div className="mt-1 text-sm text-muted-foreground" dir="ltr">{counterparty.phone}</div>
              {counterparty.whatsapp && counterparty.whatsapp !== counterparty.phone && (
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="sr-only">{t("whatsapp.number")}</span>
                  <span dir="ltr">{counterparty.whatsapp}</span>
                </div>
              )}
              {counterparty.type === "manufacturer" && (
                <Button variant="link" className="mt-2 px-0" asChild>
                  <Link href={`/company/${counterparty.id}`}>{t("product.viewProfile")}</Link>
                </Button>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
