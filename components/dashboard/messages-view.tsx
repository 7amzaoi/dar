"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessagesSquare, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/widgets";
import { ArrowBack } from "@/components/shared/icons";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/states";
import { useAuth } from "@/lib/auth";
import { db, type Company, type ConversationSummary } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("");
}

function Thread({ summary, companies, onBack }: { summary: ConversationSummary; companies: Map<string, Company>; onBack: () => void }) {
  const { t, formatDate, relativeTime } = useT();
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? "";
  const conversationId = summary.conversation.id;
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const other = summary.otherParticipants[0];
  const otherCompany = other ? companies.get(other.companyId) : undefined;
  const role = currentUser?.role;

  const msgs = useQuery(() => db.messages.listMessages(conversationId), [conversationId]);

  useEffect(() => {
    db.messages.markRead(conversationId, userId);
  }, [conversationId, userId, msgs.data?.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.data?.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      await db.messages.send(conversationId, userId, body);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-hairline px-5 py-4">
        <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={onBack} aria-label={t("common.back")}>
          <ArrowBack className="size-4" />
        </Button>
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display">{other ? initials(other.name) : "?"}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{other?.name}</div>
          <div className="truncate text-xs text-muted-foreground">{otherCompany?.name}</div>
        </div>
        {summary.conversation.orderId && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${role}/orders/${summary.conversation.orderId}`}>{t("messages.regarding", { order: summary.conversation.orderId })}</Link>
          </Button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6" aria-live="polite">
        {msgs.error ? (
          <ErrorState onRetry={msgs.reload} />
        ) : !msgs.data ? (
          <div className="space-y-4">
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="ms-auto h-14 w-1/2" />
            <Skeleton className="h-10 w-1/2" />
          </div>
        ) : (
          <ol className="space-y-4">
            {msgs.data.map((m, i) => {
              const mine = m.senderId === userId;
              const prev = msgs.data?.[i - 1];
              const newDay = !prev || prev.createdAt.slice(0, 10) !== m.createdAt.slice(0, 10);
              return (
                <li key={m.id}>
                  {newDay && (
                    <div className="my-4 text-center text-[0.7rem] text-muted-foreground">{formatDate(m.createdAt, { weekday: "long", day: "numeric", month: "long" })}</div>
                  )}
                  <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft",
                        mine ? "rounded-ee-sm bg-primary text-primary-foreground" : "rounded-es-sm border border-border bg-surface",
                      )}
                    >
                      <p className="whitespace-pre-wrap" dir="auto">{m.body}</p>
                      <div className={cn("mt-1.5 text-[0.65rem]", mine ? "text-primary-foreground/60" : "text-muted-foreground")}>{relativeTime(m.createdAt)}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t border-hairline p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={t("messages.placeholder")}
          rows={1}
          className="max-h-40 min-h-11 resize-none"
          aria-label={t("messages.placeholder")}
          dir="auto"
        />
        <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label={t("messages.send")}>
          <Send className="size-4 rtl:-scale-x-100" strokeWidth={1.6} />
        </Button>
      </form>
    </div>
  );
}

function MessagesInner() {
  const { t, relativeTime } = useT();
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? "";
  const router = useRouter();
  const pathname = usePathname();
  const selected = useSearchParams().get("c");
  const [search, setSearch] = useState("");

  const q = useQuery(async () => {
    const [summaries, companies] = await Promise.all([db.messages.listConversations(userId), db.companies.list()]);
    return { summaries, companies: new Map(companies.map((c) => [c.id, c])) };
  }, [userId]);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data?.summaries ?? []).filter((c) =>
      !s ? true : c.otherParticipants.some((u) => `${u.name} ${q.data?.companies.get(u.companyId)?.name ?? ""}`.toLowerCase().includes(s)),
    );
  }, [q.data, search]);

  const active = q.data?.summaries.find((s) => s.conversation.id === selected);
  const select = (id: string | null) => router.replace(id ? `${pathname}?c=${id}` : pathname, { scroll: false });

  return (
    <>
      <PageHeader title={t("messages.title")} description={t("messages.subtitle")} />
      {q.error ? (
        <ErrorState onRetry={q.reload} />
      ) : (
        <div className="grid h-[calc(100dvh-16rem)] min-h-[520px] overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-soft md:grid-cols-[320px_1fr]">
          <aside className={cn("flex min-h-0 flex-col border-e border-hairline", active && "hidden md:flex")}>
            <div className="border-b border-hairline p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.6} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("messages.search")} className="h-9 ps-9" aria-label={t("messages.search")} />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {!q.data ? (
                <SkeletonRows rows={5} className="p-3" />
              ) : list.length === 0 ? (
                <EmptyState icon={MessagesSquare} title={t("messages.empty")} body={t("messages.emptyBody")} className="m-3 border-0" />
              ) : (
                <ul>
                  {list.map((c) => {
                    const other = c.otherParticipants[0];
                    const isActive = c.conversation.id === selected;
                    return (
                      <li key={c.conversation.id}>
                        <button
                          onClick={() => select(c.conversation.id)}
                          className={cn("flex w-full items-start gap-3 border-b border-hairline px-4 py-3.5 text-start transition-colors", isActive ? "bg-muted" : "hover:bg-muted/50")}
                          aria-current={isActive}
                        >
                          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm">{other ? initials(other.name) : "?"}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{other?.name}</span>
                              {c.lastMessage && <span className="shrink-0 text-[0.65rem] text-muted-foreground">{relativeTime(c.lastMessage.createdAt)}</span>}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">{q.data?.companies.get(other?.companyId ?? "")?.name}</span>
                            <span className="mt-1 flex items-center gap-2">
                              <span className="line-clamp-1 flex-1 text-xs text-muted-foreground" dir="auto">{c.lastMessage?.body}</span>
                              {c.unread > 0 && <span className="rounded-full bg-brand px-1.5 text-[0.62rem] text-brand-foreground">{c.unread}</span>}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
          <section className={cn("min-h-0", !active && "hidden md:block")}>
            {active && q.data ? (
              <Thread key={active.conversation.id} summary={active} companies={q.data.companies} onBack={() => select(null)} />
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyState icon={MessagesSquare} title={t("messages.selectTitle")} className="border-0" />
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export function MessagesView() {
  return (
    <Suspense fallback={<SkeletonRows rows={6} />}>
      <MessagesInner />
    </Suspense>
  );
}
