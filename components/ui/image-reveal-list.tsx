// Source: VengeanceUI (image-reveal-list), MIT. https://www.vengenceui.com/r/image-reveal-list.json
// Adapted for Dār: Next <Link>, logical (RTL-safe) positioning, theme tokens, glass surface,
// explicit transition properties, focus-visible reveal for keyboard users.
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ImageRevealListItem {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  number: string;
  href?: string;
}

export interface ImageRevealListProps {
  items: ImageRevealListItem[];
  className?: string;
}

export function ImageRevealList({ items, className }: ImageRevealListProps) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[560px]", className)}>
      <ul className="glass list-none rounded-[1.75rem] p-2">
        {items.map((item) => (
          <li key={item.id} className="relative">
            <Link
              href={item.href ?? "#"}
              className="group flex items-center rounded-[1.25rem] p-4 text-[15px] text-foreground transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:translate-x-1 hover:bg-card/90 focus-visible:bg-card/90 focus-visible:outline-none rtl:hover:-translate-x-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative hover preview, SVG placeholder */}
              <img
                src={item.image}
                alt=""
                width={80}
                height={110}
                className="pointer-events-none absolute -start-[100px] top-1/2 z-10 hidden h-[110px] w-[80px] -translate-y-1/2 scale-90 rounded-2xl object-cover opacity-0 shadow-lift transition-[opacity,transform,inset-inline-start] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-start-[92px] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:-start-[92px] group-focus-visible:scale-100 group-focus-visible:opacity-100 md:block"
              />
              <span className="me-4 min-w-6 text-[13px] text-muted-foreground tabular-nums">{item.number}</span>
              <span className="truncate" translate="no">
                {item.title}
              </span>
              {item.subtitle && <span className="ms-auto shrink-0 ps-4 text-[13px] text-muted-foreground">{item.subtitle}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ImageRevealList;
