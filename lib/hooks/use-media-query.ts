"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches. The server (and the first client render) answer false,
 * so use it for behaviour that can start late (loading a video, `inert`), and CSS for layout.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's `md` breakpoint: tablets and up get the full-screen video hero. */
export const MD_UP = "(min-width: 48rem)";
