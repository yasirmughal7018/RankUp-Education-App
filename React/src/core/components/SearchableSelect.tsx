import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  id?: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  required?: boolean;
  allowEmpty?: boolean;
  className?: string;
}

const triggerClassName =
  "flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70";

/**
 * Searchable single-select combobox (filter-as-you-type).
 */
export function SearchableSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "Select...",
  emptyLabel = "None",
  disabled = false,
  required = false,
  allowEmpty = true,
  className,
}: SearchableSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  const rows = useMemo(() => {
    if (!allowEmpty) {
      return filtered;
    }
    return [{ value: "", label: emptyLabel }, ...filtered];
  }, [allowEmpty, emptyLabel, filtered]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setHighlightIndex(0);
      queueMicrotask(() => searchRef.current?.focus());
    }
  }, [open]);

  function selectValue(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) =>
        current + 1 >= rows.length ? 0 : current + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) =>
        current - 1 < 0 ? Math.max(rows.length - 1, 0) : current - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[highlightIndex];
      if (row) {
        selectValue(row.value);
      }
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        required={required}
        onChange={() => undefined}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={triggerClassName}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={selected ? "text-slate-900" : "text-slate-500"}>
          {selected?.label ?? placeholder}
        </span>
        <span className="text-slate-400" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Type to search..."
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlightIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>

          <ul
            id={listboxId}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {rows.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
            ) : (
              rows.map((row, index) => {
                const isSelected = row.value === value;
                const isHighlighted = index === highlightIndex;
                return (
                  <li key={`${row.value || "empty"}-${row.label}`} role="option">
                    <button
                      type="button"
                      aria-selected={isSelected}
                      className={`flex w-full px-3 py-2 text-left text-sm ${
                        isHighlighted ? "bg-brand-50 text-brand-900" : "text-slate-800"
                      } ${isSelected ? "font-medium" : ""}`}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => selectValue(row.value)}
                    >
                      {row.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
