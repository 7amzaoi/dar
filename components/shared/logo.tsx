import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Dār wordmark: Latin + Arabic set together, with a brand macron mark.
 * `tone="ink"` keeps it dark navy whatever the theme, for use on the always-light hero video.
 */
export function Logo({
  className,
  href = "/",
  compact = false,
  tone = "theme",
}: {
  className?: string;
  href?: string;
  compact?: boolean;
  tone?: "theme" | "ink";
}) {
  const ink = tone === "ink";
  return (
    <Link href={href} className={cn("group inline-flex items-baseline gap-2", ink ? "text-hero-ink" : "text-foreground", className)} aria-label="Dār" translate="no">
      <span className="font-display text-[1.7rem] leading-none tracking-tight" lang="en">
        D<span className="relative">ā<span className={cn("absolute inset-x-[0.08em] top-[0.18em] h-[0.06em]", ink ? "bg-hero-ink" : "bg-brand")} aria-hidden /></span>r
      </span>
      {!compact && (
        <span className={cn("font-display text-lg leading-none transition-colors", ink ? "text-hero-ink/60 group-hover:text-hero-ink" : "text-muted-foreground group-hover:text-brand-strong")} lang="ar">
          دار
        </span>
      )}
    </Link>
  );
}

/** Monogram used in place of company logos. */
export function CompanyMark({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-surface font-display text-lg text-brand-strong",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
