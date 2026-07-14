import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { LookupSelect } from "@/core/components/LookupSelect";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import type { QuestionSummary } from "@/features/questions/domain/questionTypes";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import {
  useDeleteQuestionMutation,
  useImportQuestionsMutation,
  useQuestionsQuery,
} from "@/features/questions/presentation/hooks/useQuestionQueries";
import {
  getQuestionImportTemplateUrl,
} from "@/features/questions/data/questionApi";
import { readStoredSession } from "@/core/auth/tokenStorage";

function truncateText(value: string, maxLength = 90): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

export function QuestionsPage() {
  const [pendingOnly, setPendingOnly] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [classId, setClassId] = useState<number | "">("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const { data: questions = [], isLoading, error, refetch, isFetching } =
    useQuestionsQuery({ pendingOnly, activeFilter, subjectId, classId });

  const deleteQuestion = useDeleteQuestionMutation();
  const importQuestions = useImportQuestionsMutation();

  async function handleImport(file: File | null) {
    if (!file) {
      return;
    }

    setActionError(null);
    setImportMessage(null);

    try {
      const result = await importQuestions.mutateAsync({ file, dryRun: false });
      setImportMessage(
        `Imported ${result.createdCount} draft question(s). ${result.errorCount} row error(s).`,
      );
      if (result.errors.length > 0) {
        setActionError(
          result.errors
            .slice(0, 5)
            .map((item) => `Row ${item.rowNumber}: ${item.message}`)
            .join(" "),
        );
      }
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to import questions.");
    }
  }

  async function handleDelete(question: QuestionSummary) {
    const confirmed = window.confirm(
      `Delete question #${question.questionId}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setActionError(null);

    try {
      await deleteQuestion.mutateAsync(question.questionId);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to delete question.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Question bank"
        description="Create, review, and manage questions for quizzes and assessments."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching || deleteQuestion.isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Refresh
            </button>
            <a
              href={getQuestionImportTemplateUrl()}
              onClick={(event) => {
                event.preventDefault();
                const token = readStoredSession()?.accessToken;
                void (async () => {
                  const response = await fetch(getQuestionImportTemplateUrl(), {
                    headers: token
                      ? { Authorization: `Bearer ${token}` }
                      : undefined,
                  });
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = "rankup-questions-import-template.xlsx";
                  anchor.click();
                  URL.revokeObjectURL(url);
                })();
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Import template
            </a>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              {importQuestions.isPending ? "Importing..." : "Import Excel"}
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                disabled={importQuestions.isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void handleImport(file);
                }}
              />
            </label>
            <Link
              to="/questions/new"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              New question
            </Link>
          </div>
        }
      />

      <section className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(event) => setPendingOnly(event.target.checked)}
          />
          Pending approval only
        </label>

        <select
          value={activeFilter}
          onChange={(event) =>
            setActiveFilter(event.target.value as "" | "true" | "false")
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          disabled={pendingOnly}
        >
          <option value="">All active states</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>

        <LookupSelect
          label="Subject"
          type={LOOKUP_TYPES.SUBJECT}
          value={subjectId}
          allowEmpty
          emptyLabel="All subjects"
          disabled={pendingOnly}
          onChange={setSubjectId}
        />

        <LookupSelect
          label="Class"
          type={LOOKUP_TYPES.CLASS}
          value={classId}
          allowEmpty
          emptyLabel="All classes"
          disabled={pendingOnly}
          onChange={setClassId}
        />
      </section>

      {error || actionError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error?.message ?? actionError}
        </div>
      ) : null}

      {importMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {importMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading questions...
          </div>
        ) : questions.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No questions found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Question
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Marks
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {questions.map((question) => (
                  <tr key={question.questionId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/questions/${question.questionId}`}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        {truncateText(question.questionText)}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        #{question.questionId} · {question.createdBy}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {question.questionType}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={
                          question.isActive
                            ? question.status
                            : `${question.status} (inactive)`
                        }
                        tone={getQuestionStatusTone(
                          question.status,
                          question.isActive,
                        )}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {question.marks}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/questions/${question.questionId}/edit`}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={deleteQuestion.isPending}
                          onClick={() => void handleDelete(question)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
