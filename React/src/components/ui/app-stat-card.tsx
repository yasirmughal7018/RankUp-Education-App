import type { LucideIcon } from "lucide-react";
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
}: AppStatCardProps) {
  return (
    <AppCard
      interactive={Boolean(onClick)}
      onClick={onClick}
      animate={animate}
      className={cn("min-w-0", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              "mt-2 break-words text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl",
              TONE_STAT_CLASS[variantTone[colorVariant]],
            )}
          >
            {value}
          </p>
          {description ? (
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
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
              "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              iconBg[colorVariant],
            )}
            aria-hidden
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </AppCard>
  );
}
