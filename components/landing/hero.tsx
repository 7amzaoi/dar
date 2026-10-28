"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { HeroBadge, HeroCornerPanel, HeroStatCard } from "@/components/landing/hero-cards";
import { HeroMobile, type HeroStat } from "@/components/landing/hero-mobile";
import { HeroNavbar } from "@/components/landing/hero-navbar";
import { MD_UP, useMediaQuery } from "@/lib/hooks/use-media-query";
import { useT } from "@/lib/i18n";

// Self-hosted copy of the RIVR hero loop (source: pulkitxm/claude-directory, rivr-defi-hero).
// TODO(backend): serve from storage/CDN with a WebM variant and a real poster frame.
const VIDEO_URL = "/videos/hero.mp4";

/** Shown when the video can't play, and instead of it for reduced-motion users. */
const STILL = "/images/photos/scenes/hero-living.webp";

/**
 * Tablet and up: full-screen glass hero (looping video card, centered nav + headline, stats card,
 * cutout panel). Phones get HeroMobile instead, and never download the video.
 */
export function Hero({ pieceCount, stats }: { pieceCount?: number; stats: HeroStat[] }) {
  const { t } = useT();
  const reduceMotion = useReducedMotion();
  const wide = useMediaQuery(MD_UP);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const showVideo = wide && !failed && !reduceMotion;

  const togglePlayback = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  return (
    <>
      <HeroMobile stats={stats} />
      <div className="hidden h-[100dvh] min-h-[620px] w-full items-center justify-center bg-background p-3 font-helvetica md:flex md:p-5">
        <section className="relative flex h-full w-full max-w-[1536px] flex-col items-center overflow-hidden rounded-[1.5rem] bg-secondary md:rounded-[3rem]">
          {showVideo ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              src={VIDEO_URL}
              aria-hidden
              onError={() => setFailed(true)}
              className="absolute inset-0 z-0 h-full w-full object-cover object-[65%] lg:object-center"
            />
          ) : (
            <FurnitureImage src={STILL} alt="" priority sizes="100vw" className="z-0 object-[65%] lg:object-center" />
          )}

          <div className="relative z-10 flex h-full w-full flex-col items-center">
            <HeroNavbar />

            {showVideo && (
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={paused ? t("landing.heroPlay") : t("landing.heroPause")}
                aria-pressed={paused}
                className="absolute top-[5.25rem] left-1/2 hidden size-9 -translate-x-1/2 items-center justify-center rounded-xl bg-white/40 text-hero-ink/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md transition-[background-color,transform] duration-200 hover:bg-white/60 active:scale-95 md:flex"
              >
                {paused ? <Play className="size-4" strokeWidth={1.8} /> : <Pause className="size-4" strokeWidth={1.8} />}
              </button>
            )}

            <div className="flex w-full max-w-4xl flex-col items-center px-5 pt-6 text-center md:px-6 md:pt-14">
              <HeroBadge />
              <motion.h1
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mb-3 font-helvetica text-[2.1rem] leading-[1.05] font-normal tracking-tight text-balance text-hero-ink sm:text-5xl md:mb-2 md:text-hero-text md:text-6xl lg:text-[80px] rtl:leading-[1.25] rtl:tracking-normal"
              >
                {t("landing.heroTitle")}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="max-w-xl text-[0.9rem] leading-relaxed font-normal text-pretty text-hero-ink/75 sm:text-base md:text-lg md:text-hero-text md:opacity-80"
              >
                {t("landing.heroSubtitle")}
              </motion.p>
            </div>

            <HeroStatCard count={pieceCount} />
            <HeroCornerPanel />
          </div>
        </section>
      </div>
    </>
  );
}
