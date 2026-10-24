"use client";

import { siWhatsapp } from "simple-icons";
import { whatsappLink, type Company } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Official WhatsApp glyph from simple-icons (CC0), in the brand green. */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" aria-hidden className={cn("size-4 shrink-0", className)} fill={`#${siWhatsapp.hex}`}>
      <path d={siWhatsapp.path} />
    </svg>
  );
}

/**
 * Opens a WhatsApp chat with a company, with a prefilled message that names the context
 * (a piece, an order). Members talk directly on WhatsApp; Dār doesn't relay messages.
 */
export function WhatsAppButton({
  company,
  text,
  label,
  variant = "outline",
  size = "default",
  className,
}: {
  company: Pick<Company, "phone" | "whatsapp">;
  text?: string;
  label: string;
  variant?: "outline" | "solid";
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <a
      href={whatsappLink(company, text)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center justify-center gap-2.5 rounded-full whitespace-nowrap transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.98]",
        size === "sm" ? "h-9 px-4 text-sm" : "h-11 px-5 text-sm",
        variant === "solid"
          ? "bg-[#25D366] text-[#0b2e1a] hover:bg-[#2fdc6f]"
          : "border border-border bg-card/70 text-foreground hover:border-[#25D366]/60 hover:bg-card",
        className,
      )}
    >
      {variant === "solid" ? (
        <svg viewBox="0 0 24 24" aria-hidden className="size-4 shrink-0 fill-current">
          <path d={siWhatsapp.path} />
        </svg>
      ) : (
        <WhatsAppIcon />
      )}
      {label}
    </a>
  );
}
