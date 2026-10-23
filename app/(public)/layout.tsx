import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { SmoothScroll } from "@/components/ui/smooth-scroll";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
    </SmoothScroll>
  );
}
