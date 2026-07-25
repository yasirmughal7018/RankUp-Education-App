import { Button } from "@/components/ui/button";

interface DirectoryPaginationProps {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/** Theme-aware pager for directory lists. */
export function DirectoryPagination({
  pageNumber,
  pageSize,
  totalCount,
  onPageChange,
  disabled = false,
}: DirectoryPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const to = Math.min(pageNumber * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p>
        Showing{" "}
        <span className="font-medium text-foreground">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium text-foreground">{totalCount}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={disabled || pageNumber <= 1}
        >
          Previous
        </Button>
        <span className="min-w-[5.5rem] text-center text-xs">
          Page {pageNumber} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={disabled || pageNumber >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
