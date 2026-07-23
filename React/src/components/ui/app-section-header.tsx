import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AppSectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Section title row used inside dashboards and cards. */
export function AppSectionHeader({
  title,
  description,
  action,
  className,
}: AppSectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
