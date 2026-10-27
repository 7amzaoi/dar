"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowBack } from "@/components/shared/icons";
import { ItemOptions } from "@/components/shared/item-options";
import { Logo } from "@/components/shared/logo";
import { EmptyState, SkeletonRows } from "@/components/shared/states";
import { useAuth } from "@/lib/auth";
import { db, tierFor, type Company } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

/**
 * The order as a document: an A4 sheet the showroom or the maker saves as PDF (or prints)
 * from the browser's print window. The browser lays the Arabic out itself, so the PDF reads
 * exactly like the page. Only the two parties (and admins) can open it: /api/data checks.
 */

function Party({ title, company }: { title: string; company: Company | null }) {
  const { country, city } = useT();
  if (!company) return null;
  return (
    <div>
      <div className="text-[0.68rem] font-medium uppercase tracking-wide text-neutral-500">{title}</div>
      <div className="mt-1 text-base font-medium">{company.name}</div>
      <div className="text-sm text-neutral-600">
        {city(company.city)}، {country(company.country)}
      </div>
      <div className="text-sm text-neutral-600" dir="ltr">
        {company.phone}
        {company.whatsapp && company.whatsapp !== company.phone && ` · WhatsApp ${company.whatsapp}`}
      </div>
    </div>
  );
}

export default function OrderPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, tx, formatPrice, formatDate } = useT();
  const { ready, currentUser } = useAuth();

  const q = useQuery(
    async () => {
      const order = await db.orders.getById(id);
      if (!order) return null;
      const [products, retailer, maker] = await Promise.all([
        db.products.getMany(order.items.map((i) => i.productId)),
        db.companies.getById(order.retailerId),
        db.companies.getById(order.manufacturerId),
      ]);
      return { order, products: new Map(products.map((p) => [p.id, p])), retailer, maker };
    },
    [id],
    { enabled: ready && !!currentUser },
  );

  // the saved file is named after the page title
  useEffect(() => {
    if (q.data) document.title = `Dar-${q.data.order.id}`;
  }, [q.data]);

  if (!ready || q.loading) return <SkeletonRows rows={8} className="mx-auto max-w-3xl p-10" />;
  if (!q.data) {
    return <EmptyState title={t("order.notFound")} className="mx-auto mt-20 max-w-xl" action={<Button asChild variant="outline"><Link href="/">{t("common.goHome")}</Link></Button>} />;
  }

  const { order, products, retailer, maker } = q.data;
  const lines = order.items.map((item) => {
    const p = products.get(item.productId);
    const unit = item.unitPrice ?? (order.isRFQ ? undefined : p ? tierFor(p.priceTiers, item.qty)?.unitPrice : undefined);
    return { item, product: p, unit, total: unit != null ? unit * item.qty : undefined };
  });
  const priced = lines.every((l) => l.unit != null);
  const total = lines.reduce((s, l) => s + (l.total ?? 0), 0);
  const back = currentUser ? `/${currentUser.role}/orders/${order.id}` : "/";

  return (
    <div className="min-h-dvh bg-neutral-100 py-8 print:bg-white print:py-0">
      {/* toolbar: not part of the document */}
      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link href={back} className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900">
          <ArrowBack className="size-4" /> {t("dash.orders")}
        </Link>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={() => window.print()}>
            <FileDown className="size-4" strokeWidth={1.6} /> {t("order.downloadPdf")}
          </Button>
          <span className="text-xs text-neutral-500">{t("order.printHint")}</span>
        </div>
      </div>

      {/* the sheet: always black on white, whatever the site theme */}
      <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-[14mm] text-neutral-900 shadow-sm [print-color-adjust:exact] print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-6">
          <div>
            <Logo tone="ink" href="/" />
            <h1 className="mt-4 text-2xl font-medium">{order.isRFQ ? t("order.titleRfq") : t("order.titleOrder")}</h1>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
            <dt className="text-neutral-500">{t("order.number")}</dt>
            <dd className="font-mono" dir="ltr">{order.id}</dd>
            <dt className="text-neutral-500">{t("order.date")}</dt>
            <dd>{formatDate(order.createdAt)}</dd>
            <dt className="text-neutral-500">{t("order.status")}</dt>
            <dd>{t(`status.order.${order.status}`)}</dd>
          </dl>
        </header>

        <section className="grid grid-cols-2 gap-8 border-b border-neutral-200 py-6">
          <Party title={t("order.buyer")} company={retailer} />
          <Party title={t("order.seller")} company={maker} />
        </section>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-start text-[0.7rem] uppercase tracking-wide text-neutral-500">
              <th className="py-2 pe-3 text-start font-medium">{t("order.piece")}</th>
              <th className="px-3 py-2 text-end font-medium">{t("order.qty")}</th>
              <th className="px-3 py-2 text-end font-medium">{t("order.unitPrice")}</th>
              <th className="py-2 ps-3 text-end font-medium">{t("order.lineTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(({ item, product: p, unit, total: lineTotal }, index) => (
              <tr key={`${item.productId}-${index}`} className="break-inside-avoid border-b border-neutral-200 align-top">
                <td className="py-4 pe-3">
                  <div className="flex gap-3">
                    {p?.images[0] && (
                      // a plain <img>: print engines handle it more reliably than next/image
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="size-16 shrink-0 rounded bg-neutral-100 object-cover" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium">{p ? tx(p.titleAr, p.titleEn) : item.productId}</div>
                      <div className="text-xs text-neutral-500">
                        {t("order.ref")} <span dir="ltr">{item.productId}</span>
                        {p && ` · ${t("order.dimensions")} ${p.dimensions.width}×${p.dimensions.depth}×${p.dimensions.height} ${p.dimensions.unit}`}
                        {p?.leadTimeDays != null && ` · ${t("order.leadTime")} ${p.leadTimeDays} ${t("common.days")}`}
                      </div>
                      <ItemOptions item={item} className="mt-1 [&_*]:!text-neutral-700" />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 text-end tabular-nums">{item.qty}</td>
                <td className="px-3 py-4 text-end tabular-nums">{unit != null ? formatPrice(unit) : <span className="text-neutral-500">{t("order.toBeQuoted")}</span>}</td>
                <td className="py-4 ps-3 text-end tabular-nums">{lineTotal != null ? formatPrice(lineTotal) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-4 text-end font-medium">{t("order.total")}</td>
              <td className="pt-4 ps-3 text-end text-lg font-medium tabular-nums">{priced ? formatPrice(total) : t("order.toBeQuoted")}</td>
            </tr>
          </tfoot>
        </table>

        {order.note && (
          <section className="mt-8 break-inside-avoid rounded border border-neutral-200 p-4">
            <div className="text-[0.68rem] font-medium uppercase tracking-wide text-neutral-500">{t("order.note")}</div>
            <p className="mt-1 whitespace-pre-line text-sm" dir="auto">{order.note}</p>
          </section>
        )}

        <footer className="mt-12 border-t border-neutral-200 pt-4 text-xs text-neutral-500">{t("order.footer")}</footer>
      </article>
    </div>
  );
}
