"use client";

import { CompanyProfileForm } from "@/components/dashboard/company-profile-form";
import { PageHeader } from "@/components/dashboard/widgets";
import { ErrorState, SkeletonRows } from "@/components/shared/states";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

export default function ProfilePage() {
  const { t } = useT();
  const { currentUser } = useAuth();
  const q = useQuery(() => db.companies.getById(currentUser?.companyId ?? ""), [currentUser?.companyId]);

  return (
    <>
      <PageHeader title={t("mfr.profileTitle")} description={t("mfr.profileSubtitle")} />
      {q.error ? <ErrorState onRetry={q.reload} /> : !q.data ? <SkeletonRows rows={6} /> : <CompanyProfileForm key={q.data.id} company={q.data} />}
    </>
  );
}
