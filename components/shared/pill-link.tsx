import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: { root: "bg-primary text-primary-foreground hover:bg-primary/90", icon: "bg-white/20 dark:bg-black/10" },
  glass: { root: "glass text-hero-ink hover:bg-white/80 dark:text-foreground", icon: "bg-hero-ink/10 dark:bg-white/10" },
  outline: { root: "border border-border bg-card/70 text-foreground hover:bg-card", icon: "bg-foreground/[0.06]" },
} as const;

/**
 * The hero's pill CTA: label plus a nested circular arrow that nudges toward the
 * destination on hover. Mirrors in RTL.
 */
export function PillLink({
  href,
  children,
  variant = "primary",
  size = "default",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  size?: "default" | "lg";
  className?: string;
}) {
  const v = VARIANTS[variant];
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-3 rounded-full ps-2 font-normal whitespace-nowrap transition-[background-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.98]",
        size === "lg" ? "h-14 pe-7 text-base" : "h-11 pe-5 text-sm",
        v.root,
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105 rtl:group-hover:-translate-x-0.5",
          size === "lg" ? "size-10" : "size-7",
          v.icon,
        )}
      >
        <ArrowUpRight className={cn("rtl:-scale-x-100", size === "lg" ? "size-5" : "size-4")} strokeWidth={1.8} />
      </span>
      {children}
    </Link>
  );
}
