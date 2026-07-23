import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface AppDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Detail panel: right sheet on desktop, bottom sheet on mobile.
 */
export function AppDetailSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: AppDetailSheetProps) {
  const [side, setSide] = useState<"right" | "bottom">("right");

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setSide(media.matches ? "bottom" : "right");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          side === "bottom"
            ? "max-h-[85vh] overflow-y-auto"
            : "overflow-y-auto sm:max-w-lg"
        }
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="mt-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
