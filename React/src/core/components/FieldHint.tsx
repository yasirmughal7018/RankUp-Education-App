import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";

interface FieldHintProps {
  text: string;
  label?: string;
}

/** Clickable help icon that reveals field guidance beside the label. */
export function FieldHint({ text, label = "Show field hint" }: FieldHintProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative ml-1.5 inline-flex align-middle">
      <button
        type="button"
        className="inline-flex rounded-full text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <span
          id={panelId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-normal leading-relaxed text-slate-600 shadow-lg"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
