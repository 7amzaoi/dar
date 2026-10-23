// Source: VengeanceUI (smooth-scroll), MIT. https://www.vengenceui.com/r/smooth-scroll.json
// Adapted for Dār: Lenis inertia scroll that
// - stays off for prefers-reduced-motion,
// - leaves menus, dialogs, sheets and other scrollable overlays alone,
// - follows in-page anchor links (e.g. "/#how").
"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export interface SmoothScrollProps {
  children: ReactNode;
}

const OVERLAY_SELECTOR = "[data-radix-popper-content-wrapper], [role='dialog'], [role='listbox'], [data-slot='sheet-content'], [data-lenis-prevent]";

export function SmoothScroll({ children }: SmoothScrollProps) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      anchors: { offset: -96 },
      prevent: (node) => node instanceof Element && node.closest(OVERLAY_SELECTOR) !== null,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}

export default SmoothScroll;
