"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/widgets";
import { AccountStatusBadge } from "@/components/shared/status-badge";
import { useAuth } from "@/lib/auth";
import { db, type AccountStatus, type Role, type User } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

export default function UsersPage() {
  const { t, formatDate } = useT();
  const { currentUser } = useAuth();
  const [role, setRole] = useState<Role | "all">("all");
  const [status, setStatus] = useState<AccountStatus | "all">("all");

  const q = useQuery(async () => {
    const [users, companies] = await Promise.all([
      db.users.list({ role: role === "all" ? undefined : role, status: status === "all" ? undefined : status }),
      db.companies.list(),
    ]);
    return { users, companies: new Map(companies.map((c) => [c.id, c.name])) };
  }, [role, status]);

  const setUserStatus = async (u: User, s: AccountStatus) => {
    // TODO(backend): also revoke active sessions when suspending.
    await db.users.setStatus(u.id, s);
    toast.success(t("common.updated"));
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: t("admin.colName"),
      sortValue: (u) => u.name,
      cell: (u) => (
        <div className="min-w-44">
          <div className="font-medium">{u.name}</div>
          <div className="text-xs text-muted-foreground" dir="ltr">{u.email}</div>
        </div>
      ),
    },
    { key: "role", header: t("admin.colRole"), sortValue: (u) => u.role, cell: (u) => t(`status.role.${u.role}`) },
    { key: "company", header: t("admin.colCompany"), cell: (u) => <span className="text-muted-foreground">{q.data?.companies.get(u.companyId) ?? "—"}</span> },
    { key: "status", header: t("common.status"), sortValue: (u) => u.status, cell: (u) => <AccountStatusBadge status={u.status} /> },
    { key: "joined", header: t("admin.colJoined"), sortValue: (u) => u.createdAt, cell: (u) => <span className="text-muted-foreground">{formatDate(u.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      className: "text-end",
      cell: (u) =>
        u.id === currentUser?.id || u.role === "admin" ? null : u.status === "approved" ? (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setUserStatus(u, "suspended")}>
            {t("admin.suspend")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setUserStatus(u, "approved")}>
            {u.status === "pending" ? t("admin.approve") : t("admin.reactivate")}
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader title={t("admin.usersTitle")} description={t("admin.usersSubtitle")} />
      <DataTable
        rows={q.data?.users}
        columns={columns}
        getRowId={(u) => u.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.reload}
        searchText={(u) => `${u.name} ${u.email}`}
        searchPlaceholder={t("admin.searchUsers")}
        empty={{ title: t("common.noResults") }}
        toolbar={
          <>
            <Select value={role} onValueChange={(v) => setRole(v as Role | "all")}>
              <SelectTrigger className="w-40" aria-label={t("admin.colRole")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allRoles")}</SelectItem>
                {(["manufacturer", "retailer", "admin"] as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>{t(`status.role.${r}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus | "all")}>
              <SelectTrigger className="w-40" aria-label={t("common.status")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allStatuses")}</SelectItem>
                {(["pending", "approved", "suspended"] as AccountStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{t(`status.account.${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
    </>
  );
}
