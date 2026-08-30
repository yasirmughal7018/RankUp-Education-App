import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { AppCard } from "@/components/ui/app-card";
import { cn } from "@/lib/utils";
import { TONE_STAT_CLASS, type StatusTone } from "@/lib/constants/status-colors";

export type StatColorVariant =
  | "primary"
  | "success"
  | "warning"
  | "ai"
  | "achievement"
  | "danger"
  | "neutral";

export interface AppStatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: string;
  colorVariant?: StatColorVariant;
  onClick?: () => void;
  className?: string;
  animate?: boolean;
  /** Tighter padding and type for dense dashboards. */
  compact?: boolean;
  /** Compact control beside the title (does not replace the tone icon). */
  action?: ReactNode;
}

const variantTone: Record<StatColorVariant, StatusTone | "danger"> = {
  primary: "primary",
  success: "success",
  warning: "warning",
  ai: "ai",
  achievement: "achievement",
  danger: "danger",
  neutral: "neutral",
};

const iconBg: Record<StatColorVariant, string> = {
  primary: "bg-[hsl(var(--primary-light))] text-primary",
  success: "bg-[hsl(var(--success-light))] text-[hsl(var(--success))]",
  warning: "bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))]",
  ai: "bg-[hsl(var(--ai-light))] text-[hsl(var(--ai))]",
  achievement:
    "bg-[hsl(var(--achievement-light))] text-[hsl(var(--achievement))]",
  danger: "bg-[hsl(var(--destructive-light))] text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

/** Dashboard count / KPI card with semantic color variants. */
export function AppStatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  colorVariant = "primary",
  onClick,
  className,
  animate = true,
  compact = false,
  action,
}: AppStatCardProps) {
  return (
    <AppCard
      interactive={Boolean(onClick)}
      onClick={onClick}
      animate={animate}
      padded={!compact}
      className={cn("h-full min-w-0", compact && "px-4 py-3", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
            {action}
          </div>
          <p
            className={cn(
              "mt-1 break-words font-semibold tabular-nums tracking-tight",
              compact ? "text-xl sm:text-2xl" : "mt-2 text-2xl sm:text-3xl",
              TONE_STAT_CLASS[variantTone[colorVariant]],
            )}
          >
            {value}
          </p>
          {description ? (
            <p
              className={cn(
                "leading-5 text-muted-foreground",
                compact ? "mt-1 text-xs" : "mt-2 text-sm",
              )}
            >
              {description}
            </p>
          ) : null}
          {trend ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--success))]">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              {trend}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-xl",
              compact ? "h-9 w-9" : "h-12 w-12 rounded-2xl",
              iconBg[colorVariant],
            )}
            aria-hidden
          >
            <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </span>
        ) : null}
      </div>
    </AppCard>
  );
}
