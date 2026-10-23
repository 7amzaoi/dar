"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { ChevronForward } from "@/components/shared/icons";
import { useT } from "@/lib/i18n";

export function HeroBadge() {
  const { t } = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/60 px-4 py-2 backdrop-blur-md"
    >
      <Sparkles className="size-4 text-hero-ink/80" />
      <span className="text-[14px] font-normal text-hero-ink/90">{t("landing.heroBadge")}</span>
    </motion.div>
  );
}

/** Floating glass stats card (bottom-start corner). */
export function HeroStatCard({ count }: { count?: number }) {
  const { t, dir, formatNumber } = useT();
  return (
    <motion.div
      initial={{ x: dir === "rtl" ? 20 : -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="absolute bottom-28 end-4 start-auto flex w-fit min-w-[140px] flex-col gap-2 rounded-[1.2rem] bg-white/30 p-3 backdrop-blur-xl md:start-6 md:end-auto md:bottom-6 md:min-w-[150px] md:rounded-[1.5rem] md:p-4 lg:start-10 lg:bottom-10 lg:min-w-[180px] lg:gap-3 lg:rounded-[2.2rem] lg:p-5"
    >
      <div className="flex flex-col">
        <span className="text-2xl font-normal tracking-tight text-hero-ink/90 tabular-nums md:text-3xl">{count == null ? "—" : formatNumber(count)}</span>
        <span className="text-[10px] font-normal uppercase tracking-wider text-hero-ink/60 md:text-[12px] rtl:tracking-normal">{t("landing.heroStatLabel")}</span>
      </div>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="self-start">
        <Link href="/register" className="group flex items-center gap-2 rounded-full bg-white py-1.5 ps-1.5 pe-5 transition-colors hover:bg-white/90">
          <span className="flex items-center justify-center rounded-full bg-hero-ink/10 p-1">
            <ArrowUpRight className="size-4 text-hero-ink/90 rtl:-scale-x-100" />
          </span>
          <span className="text-[14px] font-normal text-hero-ink/90">{t("landing.heroJoin")}</span>
        </Link>
      </motion.div>
    </motion.div>
  );
}

/**
 * Faux-cutout panel in the bottom-end corner. Its fill matches the page background, and the two
 * SVG masks draw inverse rounded corners so it reads as carved out of the video card.
 * Logical properties + mirrored SVGs keep the effect correct in RTL.
 */
export function HeroCornerPanel() {
  const { t } = useT();
  const size = "w-[1.5rem] sm:w-[2rem] md:w-[3.5rem] h-[1.5rem] sm:h-[2rem] md:h-[3.5rem]";
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="absolute bottom-0 end-0 rounded-ss-[1.5rem] bg-background p-3 pt-5 ps-8 sm:rounded-ss-[2rem] sm:p-4 sm:pt-6 sm:ps-10 md:rounded-ss-[3.5rem] md:p-6 md:pt-8 md:ps-14"
    >
      {/* top intersection mask */}
      <div className={`pointer-events-none absolute -top-[1.5rem] end-0 sm:-top-[2rem] md:-top-[3.5rem] ${size}`} aria-hidden>
        <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="rtl:-scale-x-100">
          <path d="M56 56V0C56 30.9279 30.9279 56 0 56H56Z" className="fill-background" />
        </svg>
      </div>
      {/* start-side intersection mask */}
      <div className={`pointer-events-none absolute bottom-0 -start-[1.5rem] sm:-start-[2rem] md:-start-[3.5rem] ${size}`} aria-hidden>
        <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="rtl:-scale-x-100">
          <path d="M56 56H0C30.9279 56 56 30.9279 56 0V56Z" className="fill-background" />
        </svg>
      </div>

      <Link href="/catalog" className="group flex items-center gap-3 sm:gap-4 md:gap-6">
        <span className="flex size-10 items-center justify-center rounded-full border border-hero-panel-ink/10 bg-hero-panel-ink/5 transition-colors group-hover:bg-hero-panel-ink/10 md:size-14">
          <ArrowUpRight className="size-5 text-hero-panel-ink/80 md:size-6 rtl:-scale-x-100" />
        </span>
        <span className="flex flex-col">
          <span className="text-[16px] font-normal text-hero-panel-ink/95 md:text-[20px]">{t("landing.heroPanelTitle")}</span>
          <span className="flex items-center gap-1 text-hero-panel-ink/60 transition-colors group-hover:text-hero-panel-ink/80">
            <span className="text-[12px] font-normal md:text-[15px]">{t("landing.heroPanelLink")}</span>
            <ChevronForward className="size-3 md:size-4" />
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
