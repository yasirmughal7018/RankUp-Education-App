import type { ComponentProps } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AppSearchInputProps
  extends Omit<ComponentProps<"input">, "type"> {
  containerClassName?: string;
}

/** Search field with leading icon for lists and dashboards. */
export function AppSearchInput({
  className,
  containerClassName,
  ...props
}: AppSearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        className={cn("pl-9", className)}
        aria-label={props["aria-label"] ?? "Search"}
        {...props}
      />
    </div>
  );
}
