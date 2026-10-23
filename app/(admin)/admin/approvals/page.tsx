"use client";

import { useState } from "react";
import { Check, Mail, MapPin, Phone, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/widgets";
import { CompanyMark } from "@/components/shared/logo";
import { motion } from "@/components/shared/motion";
import { EmptyState, QueryView, SkeletonRows } from "@/components/shared/states";
import { db, type Company, type User } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

function ApplicationCard({ user, company }: { user: User; company?: Company }) {
  const { t, tx, formatDate, country, city } = useT();
  const [busy, setBusy] = useState(false);
  const name = company?.name ?? user.name;

  // TODO(backend): approve/reject must be an admin-only server action (+ notification email).
  const approve = async () => {
    setBusy(true);
    try {
      await db.users.setStatus(user.id, "approved");
      if (company) await db.companies.update(company.id, { verified: true });
      toast.success(t("admin.approved", { name }));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    await db.users.setStatus(user.id, "suspended");
    toast.success(t("admin.rejected", { name }));
  };

  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[1.5rem] border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start gap-5">
        <CompanyMark name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl">{name}</h2>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{t(`status.role.${user.role}`)}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{t("admin.appliedOn", { date: formatDate(user.createdAt) })}</div>
          {company && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{tx(company.about, company.aboutEn)}</p>}
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5"><dt className="sr-only">{t("auth.contactName")}</dt><dd>{user.name}</dd></div>
            <div className="flex items-center gap-1.5"><Mail className="size-3.5 text-muted-foreground" /><dt className="sr-only">{t("auth.email")}</dt><dd dir="ltr">{user.email}</dd></div>
            {company && <div className="flex items-center gap-1.5"><Phone className="size-3.5 text-muted-foreground" /><dt className="sr-only">{t("auth.phone")}</dt><dd dir="ltr">{company.phone}</dd></div>}
            {company && <div className="flex items-center gap-1.5"><MapPin className="size-3.5 text-muted-foreground" /><dt className="sr-only">{t("company.location")}</dt><dd>{city(company.city)}, {country(company.country)}</dd></div>}
          </dl>
        </div>
        <div className="flex gap-2">
          <ConfirmDialog
            title={`${t("admin.reject")} — ${name}`}
            confirmLabel={t("admin.reject")}
            onConfirm={reject}
            trigger={
              <Button variant="outline" disabled={busy}>
                <X className="size-4" /> {t("admin.reject")}
              </Button>
            }
          />
          <Button onClick={approve} disabled={busy}>
            <Check className="size-4" /> {t("admin.approve")}
          </Button>
        </div>
      </div>
    </motion.li>
  );
}

export default function ApprovalsPage() {
  const { t } = useT();
  const q = useQuery(async () => {
    const [pending, companies] = await Promise.all([db.users.list({ status: "pending" }), db.companies.list()]);
    return { pending, companies: new Map(companies.map((c) => [c.id, c])) };
  }, []);

  return (
    <>
      <PageHeader title={t("admin.approvalsTitle")} description={t("admin.approvalsSubtitle")} />
      <QueryView
        query={q}
        loading={<SkeletonRows rows={3} />}
        isEmpty={(d) => d.pending.length === 0}
        empty={<EmptyState icon={ShieldCheck} title={t("admin.emptyApprovals")} body={t("admin.emptyApprovalsBody")} />}
      >
        {(d) => (
          <ul className="space-y-4">
            {d.pending.map((u) => (
              <ApplicationCard key={u.id} user={u} company={d.companies.get(u.companyId)} />
            ))}
          </ul>
        )}
      </QueryView>
    </>
  );
}
