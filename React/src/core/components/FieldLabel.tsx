import type { ReactNode } from "react";
import { RequiredMark } from "@/core/components/RequiredMark";

interface FieldLabelProps {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
}

const defaultClassName = "mb-1 block text-sm font-medium text-slate-700";

/** Form field label with optional dark-red bold required mark. */
export function FieldLabel({
  htmlFor,
  children,
  required = false,
  optional = false,
  className = defaultClassName,
}: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className={className}>
      {children}
      {required ? <RequiredMark /> : null}
      {optional ? (
        <span className="ml-1 text-xs font-normal text-slate-400">
          (optional)
        </span>
      ) : null}
    </label>
  );
}
