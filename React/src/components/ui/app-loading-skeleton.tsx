import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface AppLoadingSkeletonProps {
  variant?: "cards" | "table" | "detail";
  count?: number;
  className?: string;
}

/** Skeleton placeholders instead of spinners for page loads. */
export function AppLoadingSkeleton({
  variant = "cards",
  count = 4,
  className,
}: AppLoadingSkeletonProps) {
  if (variant === "table") {
    return (
      <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className={cn("space-y-4", className)} aria-busy="true">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-card p-5"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-8 w-16" />
          <Skeleton className="mt-3 h-3 w-40" />
        </div>
      ))}
    </div>
  );
}
