"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AnimatedNumberInView } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/shared/motion";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <FadeIn className={cn("mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
        <h1 className="font-display text-4xl leading-tight sm:text-[2.75rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </FadeIn>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  loading,
  className,
}: {
  label: string;
  value?: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[1.5rem] border border-border bg-card p-6 shadow-soft", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-4 text-brand-strong" strokeWidth={1.5} />}
      </div>
      <div className="mt-4 font-display text-[2.4rem] leading-none tabular-nums">{loading ? <Skeleton className="h-10 w-24" /> : typeof value === "string" ? <AnimatedNumberInView value={value} /> : value}</div>
      {sub && <div className="mt-3 text-xs text-muted-foreground">{loading ? <Skeleton className="h-3 w-20" /> : sub}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-[1.5rem] border border-border bg-card shadow-soft", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-5">
          <div>
            {title && <h2 className="font-display text-xl">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("p-6", bodyClassName)}>{children}</div>
    </section>
  );
}
