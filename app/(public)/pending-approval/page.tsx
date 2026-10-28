"use client";

import Link from "next/link";
import { Check, Clock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/shared/auth-shell";
import { FadeIn } from "@/components/shared/motion";
import { homeFor, useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function PendingApprovalPage() {
  const { t, tx } = useT();
  const { currentUser, logout } = useAuth();
  const approved = currentUser?.status === "approved";
  const suspended = currentUser?.status === "suspended";
  const firstName = currentUser?.name.split(" ")[0];

  const steps = [
    { icon: Check, label: t("auth.pendingStep1"), state: "done" },
    { icon: Clock, label: t("auth.pendingStep2"), state: approved ? "done" : "current" },
    { icon: KeyRound, label: t("auth.pendingStep3"), state: approved ? "done" : "todo" },
  ] as const;

  return (
    <AuthShell image="/images/photos/scenes/hero-bedroom.webp">
      <FadeIn>
        <div className="eyebrow mb-4">{t("auth.pendingEyebrow")}</div>
        <h1 className="display-lg">{suspended ? t("auth.suspendedTitle") : approved ? t("auth.welcome", { name: firstName ?? "" }) : t("auth.pendingTitle")}</h1>
        <p className="mt-5 leading-relaxed text-muted-foreground">
          {suspended ? t("auth.suspendedBody") : t("auth.pendingBody", { name: firstName ? tx(`، ${firstName}`, `, ${firstName}`) : "" })}
        </p>

        {!suspended && (
          <ol className="mt-10 space-y-0">
            {steps.map((s, i) => (
              <li key={s.label} className="relative flex gap-4 pb-8 last:pb-0">
                {i < steps.length - 1 && <span className={cn("absolute start-[1.05rem] top-9 h-[calc(100%-2.25rem)] w-px", s.state === "done" ? "bg-foreground/60" : "bg-border")} aria-hidden />}
                <span
                  className={cn(
                    "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border",
                    s.state === "done" && "border-foreground bg-foreground text-background",
                    s.state === "current" && "border-brand bg-brand/10 text-brand-strong",
                    s.state === "todo" && "border-border text-muted-foreground",
                  )}
                >
                  <s.icon className="size-4" strokeWidth={1.6} />
                  {s.state === "current" && <span className="absolute inset-0 animate-ping rounded-full border border-brand/50" aria-hidden />}
                </span>
                <span className={cn("pt-1.5", s.state === "todo" && "text-muted-foreground")}>{s.label}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-12 flex flex-wrap gap-3">
          {approved && currentUser ? (
            <Button size="lg" asChild>
              <Link href={homeFor(currentUser)}>{t("common.dashboard")}</Link>
            </Button>
          ) : (
            <Button size="lg" asChild>
              <Link href="/catalog">{t("auth.browseCatalog")}</Link>
            </Button>
          )}
          {currentUser ? (
            <Button size="lg" variant="outline" onClick={() => void logout()}>
              {t("common.signOut")}
            </Button>
          ) : (
            <Button size="lg" variant="outline" asChild>
              <Link href="/">{t("common.goHome")}</Link>
            </Button>
          )}
        </div>
      </FadeIn>
    </AuthShell>
  );
}
