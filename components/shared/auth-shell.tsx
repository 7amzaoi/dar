import type { ReactNode } from "react";
import { FurnitureImage } from "@/components/shared/furniture-image";

/** Split editorial layout used by login / register / pending screens. */
export function AuthShell({ image, children, caption }: { image: string; children: ReactNode; caption?: ReactNode }) {
  return (
    <div className="container-page grid gap-10 py-10 lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:py-14">
      <div className="grain relative hidden overflow-hidden rounded-md lg:block">
        <FurnitureImage src={image} alt="" priority sizes="45vw" className="object-[35%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso/60 via-transparent to-transparent" />
        {caption && <div className="absolute inset-x-0 bottom-0 p-10 text-ivory">{caption}</div>}
      </div>
      <div className="flex items-center">
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  );
}
