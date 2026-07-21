/**
 * Excel import panel: template download, dry-run validation, and commit.
 * Imports always land as PendingReview (IsActive=false) — never Approved.
 */
import { useRef } from "react";
import { getQuestionImportTemplateUrl } from "@/features/questions/data/questionApi";
import { readStoredSession } from "@/core/auth/tokenStorage";

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
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-brand-50/40 p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Excel import</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
          Web only. Imports always create PendingReview (IsActive=false).
          Class/Subject/Topic accept name or ID. Use IsCorrectN or CorrectOption
          (1-based). Never imports as Approved.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadImportTemplate()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Download template
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => dryRunInputRef.current?.click()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            {isPending ? "Working…" : "Dry run"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => importInputRef.current?.click()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            {isPending ? "Importing…" : "Import Excel"}
          </button>
          {canConfirm ? (
            <button
              type="button"
              disabled={isPending}
              onClick={onConfirm}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-70"
            >
              Confirm import
            </button>
          ) : null}
          <input
            ref={dryRunInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              // Reset so the same file can be re-selected after a failed dry-run.
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
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className="max-h-40 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
      </div>
    </section>
  );
}
