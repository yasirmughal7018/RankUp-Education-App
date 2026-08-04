import {
  directoryAccountStatusClass,
  directoryAccountStatusLabel,
  normalizeDirectoryAccountStatus,
} from "@/features/directory/presentation/utils/accountStatus";

export function AccountStatusBadge({
  accountStatus,
  isActive,
}: {
  accountStatus?: string | null;
  isActive: boolean;
}) {
  const status = normalizeDirectoryAccountStatus(accountStatus, isActive);
  return (
    <span
      className={`inline-flex max-w-full whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${directoryAccountStatusClass(status)}`}
    >
      {directoryAccountStatusLabel(status)}
    </span>
  );
}
