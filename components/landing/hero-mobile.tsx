"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { ArrowForward } from "@/components/shared/icons";
import { homeFor, useAuth } from "@/lib/auth";
import { useT, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Three real rooms the card cycles through, story-style. */
const SCENES: { src: string; label: TKey; href: string }[] = [
  { src: "/images/photos/scenes/hero-living.webp", label: "landing.heroSceneLiving", href: "/catalog?category=c-sofas" },
  { src: "/images/photos/scenes/hero-dining.webp", label: "landing.heroSceneDining", href: "/catalog?category=c-dining" },
  { src: "/images/photos/scenes/hero-bedroom.webp", label: "landing.heroSceneBedroom", href: "/catalog?category=c-bedroom" },
];
const SCENE_MS = 5500;
const EASE = [0.32, 0.72, 0, 1] as const;

export interface HeroStat {
  label: string;
  value: string | null;
}

/**
 * Phone-only hero (md and up keep the video hero). A tall photo card cross-fades through three
 * rooms with a slow push-in, the headline and both actions sit on the photo, and a glass strip
 * with the platform's figures overlaps the card's lower edge. No video is ever loaded here.
 */
export function HeroMobile({ stats }: { stats: HeroStat[] }) {
  const { t } = useT();
  const { currentUser } = useAuth();
  const reduceMotion = useReducedMotion();
  const [scene, setScene] = useState(0);
  const secondary = currentUser ? { href: homeFor(currentUser), label: t("common.dashboard") } : { href: "/register", label: t("landing.heroJoin") };

  // advance like stories; a tap on a bar jumps there and restarts the timer
  useEffect(() => {
    if (reduceMotion) return;
    const id = setTimeout(() => setScene((s) => (s + 1) % SCENES.length), SCENE_MS);
    return () => clearTimeout(id);
  }, [scene, reduceMotion]);
  const go = useCallback((i: number) => setScene(i), []);

  return (
    <section className="px-3 pt-[5.25rem] md:hidden">
      <div className="relative h-[calc(100svh-7.5rem)] min-h-[520px] max-h-[700px] overflow-hidden rounded-[1.75rem] bg-secondary">
        {/* scenes: all mounted so the cross-fade never waits on a download */}
        {SCENES.map((s, i) => (
          <motion.div
            key={s.src}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: i === scene ? 1 : 0, scale: i === scene && !reduceMotion ? 1 : 1.08 }}
            transition={{ opacity: { duration: 1, ease: EASE }, scale: { duration: SCENE_MS / 1000 + 1, ease: "linear" } }}
            aria-hidden={i !== scene}
          >
            {/* aim lower than centre: the furniture, not the ceiling */}
            <FurnitureImage src={s.src} alt="" priority={i === 0} sizes="100vw" className="object-[50%_68%]" />
          </motion.div>
        ))}

        {/* legibility: soft top for the chrome, deep bottom for the copy */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/0 via-35% to-black/80" aria-hidden />

        {/* story bars + room name */}
        <div className="absolute inset-x-4 top-4 flex gap-1.5" role="tablist" aria-label={t("landing.heroScenesLabel")}>
          {SCENES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              role="tab"
              aria-selected={i === scene}
              aria-label={t(s.label)}
              onClick={() => go(i)}
              className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/30 before:absolute before:-inset-y-3 before:inset-x-0"
            >
              {/* past bars full, the current one fills over the scene, later ones empty */}
              <motion.span
                key={`${i}-${scene}`}
                className="absolute inset-y-0 start-0 rounded-full bg-white"
                initial={{ width: i < scene ? "100%" : "0%" }}
                animate={{ width: i <= scene ? "100%" : "0%" }}
                transition={{ duration: i === scene && !reduceMotion ? SCENE_MS / 1000 : 0, ease: "linear" }}
              />
            </button>
          ))}
        </div>
        <div className="absolute inset-x-4 top-8 flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[0.72rem] text-white backdrop-blur-md">
            <Sparkles className="size-3" strokeWidth={1.8} />
            {t("landing.heroBadge")}
          </span>
          <Link href={SCENES[scene].href} className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[0.72rem] text-white backdrop-blur-md">
            {t(SCENES[scene].label)}
            <ArrowForward className="size-3" />
          </Link>
        </div>

        {/* copy and actions on the photo */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-12">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="font-display text-[2.4rem] leading-[1.12] tracking-tight text-balance text-white"
          >
            {t("landing.heroTitle")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
            className="mt-2.5 text-[0.92rem] leading-relaxed text-pretty text-white/80"
          >
            {t("landing.heroSubtitle")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
            className="mt-5 flex gap-2.5"
          >
            <Link
              href="/catalog"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white text-sm font-medium text-hero-ink transition-transform active:scale-[0.98]"
            >
              {t("landing.ctaPrimary")}
              <ArrowForward className="size-4" />
            </Link>
            <Link
              href={secondary.href}
              className="flex h-12 flex-1 items-center justify-center rounded-full border border-white/30 bg-white/10 text-sm text-white backdrop-blur-md transition-transform active:scale-[0.98]"
            >
              {secondary.label}
            </Link>
          </motion.div>
        </div>
      </div>

      {/* the platform's figures, overlapping the card's lower edge */}
      <dl className="glass relative z-10 mx-3 -mt-7 grid grid-cols-3 divide-x divide-hairline rounded-[1.25rem] py-3.5 rtl:divide-x-reverse">
        {stats.slice(0, 3).map((s) => (
          // label first for screen readers, figure on top visually
          <div key={s.label} className="flex flex-col-reverse items-center px-2 text-center">
            <dt className="mt-1.5 text-[0.68rem] leading-tight text-hero-ink/65 dark:text-muted-foreground">{s.label}</dt>
            <dd className={cn("font-display text-2xl leading-none tabular-nums text-hero-ink dark:text-foreground", !s.value && "opacity-40")}>{s.value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
