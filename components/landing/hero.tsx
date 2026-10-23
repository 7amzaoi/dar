"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { HeroBadge, HeroCornerPanel, HeroStatCard } from "@/components/landing/hero-cards";
import { HeroNavbar } from "@/components/landing/hero-navbar";
import { useT } from "@/lib/i18n";

// Self-hosted copy of the RIVR hero loop (source: pulkitxm/claude-directory, rivr-defi-hero).
// TODO(backend): serve from storage/CDN with a WebM variant and a real poster frame.
const VIDEO_URL = "/videos/hero.mp4";

/** Shown when the video can't play, and instead of it for reduced-motion users. */
const STILL = "/images/scenes/hero-living.svg";

/** Full-screen glass hero: looping video card, centered nav + headline, stats card and cutout panel. */
export function Hero({ pieceCount }: { pieceCount?: number }) {
  const { t } = useT();
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const showVideo = !failed && !reduceMotion;

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
    <div className="flex h-[100dvh] min-h-[620px] w-full items-center justify-center bg-background p-3 font-helvetica md:p-5">
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

          <div className="flex w-full max-w-4xl flex-col items-center px-6 pt-8 text-center md:pt-14">
            <HeroBadge />
            <motion.h1
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-2 font-helvetica text-4xl leading-[1.05] font-normal tracking-tight text-balance text-hero-text sm:text-5xl md:text-6xl lg:text-[80px] rtl:leading-[1.25] rtl:tracking-normal"
            >
              {t("landing.heroTitle")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="max-w-xl text-sm leading-relaxed font-normal text-pretty text-hero-text opacity-80 sm:text-base md:text-lg"
            >
              {t("landing.heroSubtitle")}
            </motion.p>
          </div>

          <HeroStatCard count={pieceCount} />
          <HeroCornerPanel />
        </div>
      </section>
    </div>
  );
}
