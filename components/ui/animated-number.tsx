// Source: VengeanceUI (animated-number), MIT. https://www.vengenceui.com/r/animated-number.json
// Adapted for Dār:
// - motion/react instead of framer-motion
// - each digit is a 0-9 column that springs to its value (no height measuring, no refs in render)
// - accepts pre-formatted strings ("4,652", "$18,440"); non-digits render statically
// - `AnimatedNumberInView` rolls up from zero the first time it scrolls into view
// - digits are always laid out left-to-right so RTL pages keep the number order
"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

const ZERO_TO_NINE = Array.from({ length: 10 }, (_, k) => k);

function AnimatedNumber({ value, className }: { value: number | string; className?: string }) {
  const chars = String(value).split("");
  return (
    <span dir="ltr" className={cn("inline-flex items-center leading-none tabular-nums", className)} role="img" aria-label={String(value)}>
      {chars.map((char, index) => (
        // keyed from the end so units stay aligned when the length changes
        <Digit key={chars.length - index} char={char} />
      ))}
    </span>
  );
}

function Digit({ char }: { char: string }) {
  if (!/^\d$/.test(char)) return <span aria-hidden>{char}</span>;
  const n = Number(char);
  return (
    <span className="relative inline-block h-[1em] overflow-hidden" aria-hidden>
      <motion.span
        className="flex flex-col"
        initial={false}
        animate={{ y: `${-n}em` }}
        transition={{ type: "spring", bounce: 0, duration: 0.9 }}
      >
        {ZERO_TO_NINE.map((v) => (
          <span key={v} className="block h-[1em]">
            {v}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/** Shows zeros until the number scrolls into view, then rolls each digit to its value. */
function AnimatedNumberInView({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <span ref={ref} className="inline-flex">
      <AnimatedNumber value={inView ? value : value.replace(/\d/g, "0")} className={className} />
    </span>
  );
}

export { AnimatedNumber, AnimatedNumberInView };
