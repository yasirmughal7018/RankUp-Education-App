/**
 * Excel import panel: template download, dry-run validation, and commit.
 * Imports always land as PendingReview (IsActive=false) — never Approved.
 */
import { useRef } from "react";
import { Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { getQuestionImportTemplateUrl } from "@/features/questions/data/questionApi";
import { readStoredSession } from "@/core/auth/tokenStorage";
import { AppCard } from "@/components/ui/app-card";
import { Button } from "@/components/ui/button";

interface ImportRowError {
  rowNumber: number;
  message: string;
}

interface QuestionImportPanelProps {
  isPending: boolean;
  message: string | null;
  errors: ImportRowError[];
  /** True after a clean dry-run so Confirm can commit the same file. */
  canConfirm: boolean;
  onDryRun: (file: File) => void;
  onImport: (file: File) => void;
  onConfirm: () => void;
}

/** Authenticated blob download of the blank import template. */
async function downloadImportTemplate() {
  const token = readStoredSession()?.accessToken;
  const response = await fetch(getQuestionImportTemplateUrl(), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "rankup-questions-import-template.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function QuestionImportPanel({
  isPending,
  message,
  errors,
  canConfirm,
  onDryRun,
  onImport,
  onConfirm,
}: QuestionImportPanelProps) {
  const dryRunInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <AppCard padded className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Excel import</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Imports create PendingReview questions only. Class, Subject, and Topic
          accept name or ID. Use IsCorrectN or CorrectOption (1-based).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void downloadImportTemplate()}
        >
          <Download className="h-4 w-4" />
          Download template
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => dryRunInputRef.current?.click()}
        >
          <FileSpreadsheet className="h-4 w-4" />
          {isPending ? "Working…" : "Dry run"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => importInputRef.current?.click()}
        >
          {isPending ? "Importing…" : "Import Excel"}
        </Button>
        {canConfirm ? (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={onConfirm}
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm import
          </Button>
        ) : null}
        <input
          ref={dryRunInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            event.target.value = "";
            if (file) {
              onDryRun(file);
            }
          }}
        />
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            event.target.value = "";
            if (file) {
              onImport(file);
            }
          }}
        />
      </div>

      {message ? (
        <div
          role="status"
          className="rounded-xl border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] px-4 py-3 text-sm text-[var(--status-approved-text)]"
        >
          {message}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] px-4 py-3 text-sm text-[var(--status-pending-text)]">
          <p className="mb-2 font-semibold">Row errors ({errors.length})</p>
          <ul className="list-disc space-y-1 pl-5">
            {errors.map((item) => (
              <li key={`${item.rowNumber}-${item.message}`}>
                Row {item.rowNumber}: {item.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AppCard>
  );
}
