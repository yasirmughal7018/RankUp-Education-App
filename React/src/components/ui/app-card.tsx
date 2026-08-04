import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padded?: boolean;
  animate?: boolean;
}

/** Soft education surface card with optional hover / click affordance. */
export function AppCard({
  className,
  interactive = false,
  padded = true,
  animate = false,
  children,
  onClick,
  ...props
}: AppCardProps) {
  const content = (
    <div
      role={onClick || interactive ? "button" : undefined}
      tabIndex={onClick || interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick(
                  event as unknown as React.MouseEvent<HTMLDivElement>,
                );
              }
            }
          : undefined
      }
      className={cn(
        "rounded-2xl border border-border/80 bg-card/90 text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-200",
        padded && "p-5 sm:p-6",
        (interactive || onClick) &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_8px_28px_rgba(37,99,235,0.12)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      {content}
    </motion.div>
  );
}
