import type { ReactNode } from "react";

interface CardProps {
  title: string;
  description: string;
  children?: ReactNode;
}

/** Simple titled card — theme tokens so light/dark both work. */
export function Card({ title, description, children }: CardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  );
}
