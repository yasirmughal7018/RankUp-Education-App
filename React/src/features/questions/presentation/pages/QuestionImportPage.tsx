/**
 * Dedicated Excel import page for the question bank.
 * Imports always create PendingReview (never Approved).
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "@/core/components/PageHeader";
import type { ImportQuestionsResult } from "@/features/questions/data/questionApi";
import { QuestionImportPanel } from "@/features/questions/presentation/components/QuestionImportPanel";
import { useImportQuestionsMutation } from "@/features/questions/presentation/hooks/useQuestionQueries";
import { AppErrorState } from "@/components/ui/app-error-state";
import { Button } from "@/components/ui/button";

function buildImportSuccessMessage(result: ImportQuestionsResult): string {
  return `Imported ${result.createdCount} question(s) as PendingReview. ${result.errorCount} row error(s).`;
}

export function QuestionImportPage() {
  const navigate = useNavigate();
  const importQuestions = useImportQuestionsMutation();

  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<
    Array<{ rowNumber: number; message: string }>
  >([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [lastDryRunOk, setLastDryRunOk] = useState(false);

  async function handleImport(file: File | null, dryRun: boolean) {
    if (!file) {
      return;
    }

    setActionError(null);
    setImportMessage(null);
    setImportErrors([]);
    setPendingImportFile(file);
    setLastDryRunOk(false);

    try {
      const result = await importQuestions.mutateAsync({ file, dryRun });
      setImportErrors(result.errors);

      if (dryRun) {
        setImportMessage(
          result.errorCount === 0
            ? `Dry run OK — ${file.name} is ready to import (no row errors).`
            : `Dry run found ${result.errorCount} row error(s). Fix the file or import anyway to skip bad rows.`,
        );
        setLastDryRunOk(result.errorCount === 0);
        return;
      }

      setImportMessage(buildImportSuccessMessage(result));
      setLastDryRunOk(false);
      setPendingImportFile(null);
      if (result.errorCount === 0) {
        window.setTimeout(() => navigate("/questions"), 900);
      }
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to import questions.");
      setLastDryRunOk(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8 lg:py-10">
      <PageHeader
        title="Excel import"
        backTo="/questions"
        backAriaLabel="Back to questions"
        action={
          <Button asChild type="button" size="sm" className="h-9 shrink-0 whitespace-nowrap">
            <Link to="/questions/new">
              <Plus className="h-4 w-4" />
              New question
            </Link>
          </Button>
        }
      />

      {actionError ? <AppErrorState message={actionError} /> : null}

      <QuestionImportPanel
        isPending={importQuestions.isPending}
        message={importMessage}
        errors={importErrors}
        canConfirm={Boolean(pendingImportFile && lastDryRunOk)}
        onDryRun={(file) => void handleImport(file, true)}
        onImport={(file) => void handleImport(file, false)}
        onConfirm={() => {
          if (pendingImportFile) {
            void handleImport(pendingImportFile, false);
          }
        }}
      />
    </div>
  );
}
