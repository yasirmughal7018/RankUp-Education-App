import { RequiredMark } from "@/core/components/RequiredMark";
import { useLookups } from "@/core/hooks/useLookups";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

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

const inputClassName = FORM_FIELD_CLASS;

/** Lookup-backed select wired to useLookups. */
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
          {required ? <RequiredMark /> : null}
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
