import {
  startTransition,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import { useLookups } from "@/core/hooks/useLookups";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import {
  canApproveQuestions,
  canMutateQuestion,
  isApprovedQuestionStatus,
  isArchivedQuestionStatus,
  isPendingQuestionStatus,
  isRejectedQuestionStatus,
  type QuestionSummary,
} from "@/features/questions/domain/questionTypes";
import type { ImportQuestionsResult } from "@/features/questions/data/questionApi";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import { QuestionBankStatTile } from "@/features/questions/presentation/components/QuestionBankStatTile";
import { QuestionCategoryColumn } from "@/features/questions/presentation/components/QuestionCategoryColumn";
import { QuestionImportPanel } from "@/features/questions/presentation/components/QuestionImportPanel";
import {
  useDeleteQuestionMutation,
  useImportQuestionsMutation,
  useQuestionsQuery,
} from "@/features/questions/presentation/hooks/useQuestionQueries";

type ApprovalLens =
  | "all"
  | "active"
  | "pending"
  | "approved"
  | "rejected"
  | "archived"
  | "inactive";

type QuestionsPageTab = "bank" | "import";

const PAGE_TABS: Array<{ id: QuestionsPageTab; label: string }> = [
  { id: "import", label: "Excel import" },
  { id: "bank", label: "Questions" },
];

function truncateText(value: string, maxLength = 96): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}…`;
}

function buildImportSuccessMessage(result: ImportQuestionsResult): string {
  return `Imported ${result.createdCount} question(s) as PendingReview. ${result.errorCount} row error(s).`;
}

function matchesApprovalLens(
  question: QuestionSummary,
  lens: ApprovalLens,
): boolean {
  switch (lens) {
    case "all":
      return true;
    case "active":
      return question.isActive;
    case "pending":
      return isPendingQuestionStatus(question.status);
    case "approved":
      return isApprovedQuestionStatus(question.status);
    case "rejected":
      return isRejectedQuestionStatus(question.status);
    case "archived":
      return isArchivedQuestionStatus(question.status);
    case "inactive":
      return !question.isActive;
    default:
      return true;
  }
}

function countById(
  questions: QuestionSummary[],
  pick: (q: QuestionSummary) => number,
) {
  const map = new Map<number, number>();
  for (const question of questions) {
    const id = pick(question);
    if (!id) {
      continue;
    }
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export function QuestionsPage() {
  const { user } = useAuth();
  const isApprover = Boolean(user && canApproveQuestions(user.role));

  const [approvalLens, setApprovalLens] = useState<ApprovalLens>("all");
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [classId, setClassId] = useState<number | "">("");
  const [difficultyId, setDifficultyId] = useState<number | "">("");
  const [categoryExpanded, setCategoryExpanded] = useState(true);
  const [pageTab, setPageTab] = useState<QuestionsPageTab>("bank");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const [actionError, setActionError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<
    Array<{ rowNumber: number; message: string }>
  >([]);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [lastDryRunOk, setLastDryRunOk] = useState(false);

  // One list fetch — dashboard counts + filters are client-side for snappy UX.
  const { data: questions = [], isLoading, error, refetch, isFetching } =
    useQuestionsQuery({
      pendingOnly: false,
      activeFilter: "",
      subjectId: "",
      classId: "",
    });

  const subjectsQuery = useLookups(LOOKUP_TYPES.SUBJECT);
  const classesQuery = useLookups(LOOKUP_TYPES.CLASS);
  const difficultiesQuery = useLookups(LOOKUP_TYPES.DIFFICULTY);

  const deleteQuestion = useDeleteQuestionMutation();
  const importQuestions = useImportQuestionsMutation();

  const lookupNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of subjectsQuery.data ?? []) {
      map.set(item.id, item.name);
    }
    for (const item of classesQuery.data ?? []) {
      map.set(item.id, item.name);
    }
    for (const item of difficultiesQuery.data ?? []) {
      map.set(item.id, item.name);
    }
    return map;
  }, [subjectsQuery.data, classesQuery.data, difficultiesQuery.data]);

  const approvalStats = useMemo(() => {
    let active = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let archived = 0;
    let inactive = 0;

    for (const question of questions) {
      if (question.isActive) {
        active += 1;
      } else {
        inactive += 1;
      }
      if (isPendingQuestionStatus(question.status)) {
        pending += 1;
      } else if (isApprovedQuestionStatus(question.status)) {
        approved += 1;
      } else if (isRejectedQuestionStatus(question.status)) {
        rejected += 1;
      } else if (isArchivedQuestionStatus(question.status)) {
        archived += 1;
      }
    }

    return {
      total: questions.length,
      active,
      pending,
      approved,
      rejected,
      archived,
      inactive,
    };
  }, [questions]);

  const categoryColumns = useMemo(() => {
    const subjectCounts = countById(questions, (q) => q.subjectId);
    const classCounts = countById(questions, (q) => q.classId);
    const difficultyCounts = countById(questions, (q) => q.difficultyLevel);

    const mergeLookupCounts = (
      lookups: Array<{ id: number; name: string }> | undefined,
      counts: Map<number, number>,
      sortMode: "labelAsc" | "countDesc" = "countDesc",
    ) => {
      const items = new Map<number, { id: number; label: string; count: number }>();

      for (const lookup of lookups ?? []) {
        items.set(lookup.id, {
          id: lookup.id,
          label: lookup.name,
          count: counts.get(lookup.id) ?? 0,
        });
      }

      // Include any question IDs not present in the lookup catalog.
      for (const [id, count] of counts.entries()) {
        if (!items.has(id)) {
          items.set(id, {
            id,
            label: lookupNameById.get(id) ?? `Lookup #${id}`,
            count,
          });
        }
      }

      return [...items.values()].sort((a, b) => {
        if (sortMode === "labelAsc") {
          return a.label.localeCompare(b.label, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }
        return b.count - a.count || a.label.localeCompare(b.label);
      });
    };

    return {
      subjects: mergeLookupCounts(subjectsQuery.data, subjectCounts, "labelAsc"),
      classes: mergeLookupCounts(classesQuery.data, classCounts, "labelAsc"),
      difficulties: mergeLookupCounts(difficultiesQuery.data, difficultyCounts),
    };
  }, [
    questions,
    lookupNameById,
    subjectsQuery.data,
    classesQuery.data,
    difficultiesQuery.data,
  ]);

  const tableRows = useMemo(() => {
    return questions.filter((question) => {
      if (!matchesApprovalLens(question, approvalLens)) {
        return false;
      }
      if (subjectId !== "" && question.subjectId !== subjectId) {
        return false;
      }
      if (classId !== "" && question.classId !== classId) {
        return false;
      }
      if (difficultyId !== "" && question.difficultyLevel !== difficultyId) {
        return false;
      }
      if (deferredSearch) {
        const subjectName = lookupNameById.get(question.subjectId) ?? "";
        const className = lookupNameById.get(question.classId) ?? "";
        const difficultyName =
          lookupNameById.get(question.difficultyLevel) ?? "";
        const haystack =
          `${question.questionText} ${question.questionType} ${question.status} #${question.questionId} ${question.createdBy} ${subjectName} ${className} ${difficultyName}`.toLowerCase();
        if (!haystack.includes(deferredSearch)) {
          return false;
        }
      }
      return true;
    });
  }, [
    questions,
    approvalLens,
    subjectId,
    classId,
    difficultyId,
    deferredSearch,
    lookupNameById,
  ]);

  function canMutateRow(question: QuestionSummary): boolean {
    if (!user) {
      return false;
    }

    return canMutateQuestion({
      role: user.role,
      userId: user.id,
      createdBy: question.createdBy,
      status: question.status,
    });
  }

  function selectApprovalLens(next: ApprovalLens) {
    startTransition(() => {
      setApprovalLens((current) => (current === next ? "all" : next));
    });
  }

  function clearAllFilters() {
    startTransition(() => {
      setApprovalLens("all");
      setSubjectId("");
      setClassId("");
      setDifficultyId("");
      setSearch("");
    });
  }

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
        if (result.errors.length > 0) {
          setActionError(
            result.errors
              .map((item) => `Row ${item.rowNumber}: ${item.message}`)
              .join("\n"),
          );
        }
        return;
      }

      setImportMessage(buildImportSuccessMessage(result));
      setLastDryRunOk(false);
      setPendingImportFile(null);
      if (result.errors.length > 0) {
        setActionError(
          result.errors
            .map((item) => `Row ${item.rowNumber}: ${item.message}`)
            .join("\n"),
        );
      }
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to import questions.");
      setLastDryRunOk(false);
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

  const roleDescription = isApprover
    ? "PortalAdmin: review the approval queue, manage lifecycle, and curate the shared bank."
    : "Create and submit questions (PendingReview). Edit or delete your own PendingReview or Rejected items. Browse Approved questions for quizzes.";

  const activeCategoryFilters = [
    subjectId !== "",
    classId !== "",
    difficultyId !== "",
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Questions"
        description={roleDescription}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching || deleteQuestion.isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              to="/questions/new"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              New question
            </Link>
          </div>
        }
      />

      <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-50 via-white to-slate-50 p-5 shadow-sm sm:p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
          Approval system
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <QuestionBankStatTile
            label="Total"
            value={approvalStats.total}
            accent="brand"
            active={approvalLens === "all"}
            onClick={() => selectApprovalLens("all")}
          />
          <QuestionBankStatTile
            label="Active"
            value={approvalStats.active}
            accent="brand"
            active={approvalLens === "active"}
            onClick={() => selectApprovalLens("active")}
          />
          <QuestionBankStatTile
            label="Approved"
            value={approvalStats.approved}
            accent="emerald"
            active={approvalLens === "approved"}
            onClick={() => selectApprovalLens("approved")}
          />
          <QuestionBankStatTile
            label="Inactive"
            value={approvalStats.inactive}
            accent="slate"
            active={approvalLens === "inactive"}
            onClick={() => selectApprovalLens("inactive")}
          />
          <QuestionBankStatTile
            label="PendingReviews"
            value={approvalStats.pending}
            accent="amber"
            active={approvalLens === "pending"}
            onClick={() => selectApprovalLens("pending")}
          />
          <QuestionBankStatTile
            label="Rejected"
            value={approvalStats.rejected}
            accent="rose"
            active={approvalLens === "rejected"}
            onClick={() => selectApprovalLens("rejected")}
          />
          <QuestionBankStatTile
            label="Archived"
            value={approvalStats.archived}
            accent="slate"
            active={approvalLens === "archived"}
            onClick={() => selectApprovalLens("archived")}
          />
        </div>
      </section>

      <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-brand-50/40 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCategoryExpanded((open) => !open)}
            aria-expanded={categoryExpanded}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Question category
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Subject, Class, and Difficulty
                {activeCategoryFilters > 0
                  ? ` · ${activeCategoryFilters} filter(s) on`
                  : null}
              </p>
            </div>
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-4 w-4 transition-transform ${
                  categoryExpanded ? "rotate-180" : ""
                }`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </button>
          {(approvalLens !== "all" ||
            activeCategoryFilters > 0 ||
            search.trim()) && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear all filters
            </button>
          )}
        </div>

        {categoryExpanded ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <QuestionCategoryColumn
              title="Subject"
              subtitle="All subjects in catalog"
              accent="teal"
              items={categoryColumns.subjects}
              selectedId={subjectId}
              loading={subjectsQuery.isLoading}
              emptyLabel="No subjects configured in lookups yet."
              onSelect={(id) => startTransition(() => setSubjectId(id))}
            />
            <QuestionCategoryColumn
              title="Class"
              subtitle="All classes in catalog"
              accent="indigo"
              items={categoryColumns.classes}
              selectedId={classId}
              loading={classesQuery.isLoading}
              emptyLabel="No classes configured in lookups yet."
              onSelect={(id) => startTransition(() => setClassId(id))}
            />
            <QuestionCategoryColumn
              title="Difficulty"
              subtitle="Easy · Medium · Hard"
              accent="amber"
              items={categoryColumns.difficulties}
              selectedId={difficultyId}
              loading={difficultiesQuery.isLoading}
              emptyLabel="No difficulty levels configured in lookups yet."
              onSelect={(id) => startTransition(() => setDifficultyId(id))}
            />
          </div>
        ) : null}
      </section>

      <div
        role="tablist"
        aria-label="Question bank sections"
        className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3"
      >
        {PAGE_TABS.map((tab) => {
          const isActive = pageTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setPageTab(tab.id)}
              className={
                isActive
                  ? "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
                  : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {pageTab === "import" ? (
        <div role="tabpanel" aria-label="Excel import" className="mb-6">
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
      ) : (
        <div role="tabpanel" aria-label="Question bank">
          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Search
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Text, type, status, subject, class, difficulty, owner…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              />
            </label>
          </section>

          {error || actionError ? (
            <div className="mb-4 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error?.message ?? actionError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">
                Bank list
                <span className="ml-2 font-normal text-slate-500">
                  {tableRows.length} shown
                  {approvalLens !== "all" ? ` · ${approvalLens}` : null}
                </span>
              </p>
            </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-600">
            Loading questions…
          </div>
        ) : tableRows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-800">
              No questions match these filters
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Clear filters or create a new question to get started.
            </p>
            <Link
              to="/questions/new"
              className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              New question
            </Link>
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
                    Category
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
                {tableRows.map((question) => (
                  <tr key={question.questionId} className="hover:bg-slate-50/80">
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
                    <td className="px-4 py-3 text-xs leading-5 text-slate-600">
                      <div>
                        {lookupNameById.get(question.subjectId) ??
                          `Subject #${question.subjectId}`}
                      </div>
                      <div className="text-slate-500">
                        {lookupNameById.get(question.classId) ??
                          `Class #${question.classId}`}
                        {" · "}
                        {lookupNameById.get(question.difficultyLevel) ??
                          `Diff #${question.difficultyLevel}`}
                      </div>
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
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {question.marks}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/questions/${question.questionId}`}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          View
                        </Link>
                        {canMutateRow(question) ? (
                          <>
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
                          </>
                        ) : null}
                        {isApprover &&
                        isPendingQuestionStatus(question.status) ? (
                          <Link
                            to={`/questions/${question.questionId}`}
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600"
                          >
                            Review
                          </Link>
                        ) : null}
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
      )}
    </div>
  );
}
