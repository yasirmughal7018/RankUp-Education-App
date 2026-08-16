import {
  directoryAccountStatusClass,
  directoryAccountStatusLabel,
  normalizeDirectoryAccountStatus,
} from "@/features/directory/presentation/utils/accountStatus";

export function AccountStatusBadge({
  accountStatus,
  isActive,
  size = "md",
}: {
  accountStatus?: string | null;
  isActive: boolean;
  /** Compact chip for dense lists (e.g. linked-students dialog). */
  size?: "sm" | "md";
}) {
  const status = normalizeDirectoryAccountStatus(accountStatus, isActive);
  const sizeClass =
    size === "sm"
      ? "rounded px-1.5 py-0.5 text-[10px] leading-tight"
      : "rounded-md px-2 py-1 text-xs";
  return (
    <span
      className={`inline-flex max-w-full whitespace-nowrap border font-medium ${sizeClass} ${directoryAccountStatusClass(status)}`}
    >
      {directoryAccountStatusLabel(status)}
    </span>
  );
}
