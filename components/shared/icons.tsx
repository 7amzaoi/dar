import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/** Directional icons that mirror automatically in RTL. */
export function ArrowForward({ className, ...props }: LucideProps) {
  return <ArrowRight className={cn("rtl:-scale-x-100", className)} strokeWidth={1.6} {...props} />;
}

export function ArrowBack({ className, ...props }: LucideProps) {
  return <ArrowLeft className={cn("rtl:-scale-x-100", className)} strokeWidth={1.6} {...props} />;
}

export function ChevronForward({ className, ...props }: LucideProps) {
  return <ChevronRight className={cn("rtl:-scale-x-100", className)} strokeWidth={1.6} {...props} />;
}

export function ChevronBack({ className, ...props }: LucideProps) {
  return <ChevronLeft className={cn("rtl:-scale-x-100", className)} strokeWidth={1.6} {...props} />;
}
