import { useLookups } from "@/core/hooks/useLookups";

interface LookupSelectProps {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  type: string;
  parentId?: number | null;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

export function LookupSelect({
  label,
  value,
  onChange,
  type,
  parentId,
  disabled = false,
  required = false,
  placeholder = "Select...",
  allowEmpty = false,
  emptyLabel = "All",
}: LookupSelectProps) {
  const { data: items = [], isLoading, error } = useLookups(type, parentId);

  return (
    <div>
      {label ? (
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {label}
          {required ? <span className="text-rose-600"> *</span> : null}
        </label>
      ) : null}
      <select
        value={value === "" ? "" : String(value)}
        disabled={disabled || isLoading}
        required={required}
        aria-label={label || placeholder}
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : "")
        }
        className={inputClassName}
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {!allowEmpty && value === "" ? (
          <option value="" disabled>
            {isLoading ? "Loading..." : placeholder}
          </option>
        ) : null}
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error.message}</p>
      ) : null}
      {!error && !isLoading && items.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">
          No {(label || "lookup").toLowerCase()} values found for type "{type}".
        </p>
      ) : null}
    </div>
  );
}
