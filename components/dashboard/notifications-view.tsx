"use client";

import Link from "next/link";
import { Bell, CheckCheck, MessageSquare, Receipt, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/widgets";
import { EmptyState, QueryView, SkeletonRows } from "@/components/shared/states";
import { useAuth } from "@/lib/auth";
import { db, type Notification } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function iconFor(type: string) {
  if (type.startsWith("order")) return Receipt;
  if (type === "message") return MessageSquare;
  if (type.startsWith("account")) return UserCheck;
  return Bell;
}

export function NotificationsView() {
  const { t, tDynamic, relativeTime } = useT();
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? "";
  const q = useQuery(() => db.notifications.listByUser(userId), [userId]);
  const unread = q.data?.filter((n) => !n.read).length ?? 0;

  const text = (n: Notification) => {
    const params = { ...n.params };
    if (n.type === "order.status" && params.status) params.status = tDynamic(`status.order.${params.status}`);
    return tDynamic(`notifications.${n.type}`, params, n.body);
  };

  return (
    <>
      <PageHeader
        title={t("notifications.title")}
        description={unread ? t("notifications.unread", { count: unread }) : t("notifications.subtitle")}
        actions={
          unread > 0 && (
            <Button variant="outline" onClick={() => db.notifications.markAllRead(userId)}>
              <CheckCheck className="size-4" strokeWidth={1.6} /> {t("notifications.markAllRead")}
            </Button>
          )
        }
      />
      <QueryView query={q} loading={<SkeletonRows rows={6} />} empty={<EmptyState icon={Bell} title={t("notifications.empty")} body={t("notifications.emptyBody")} />}>
        {(list) => (
          <ul className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
            {list.map((n) => {
              const Icon = iconFor(n.type);
              const content = (
                <>
                  <span className={cn("mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full", n.read ? "bg-muted text-muted-foreground" : "bg-brass/15 text-brass-deep")}>
                    <Icon className="size-4" strokeWidth={1.6} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", !n.read && "font-medium")}>{text(n)}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-brass" aria-label="unread" />}
                </>
              );
              const cls = cn("flex items-start gap-4 border-b border-hairline px-6 py-4 transition-colors last:border-b-0 hover:bg-muted/40", !n.read && "bg-brass/[0.04]");
              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link href={n.href} className={cls} onClick={() => !n.read && db.notifications.markRead(n.id)}>
                      {content}
                    </Link>
                  ) : (
                    <button type="button" className={cn(cls, "w-full text-start")} onClick={() => !n.read && db.notifications.markRead(n.id)}>
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </QueryView>
    </>
  );
}
