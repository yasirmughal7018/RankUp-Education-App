/**
 * Question bank dashboard: workflow status and activity filters (kept separate),
 * category overview, and navigate-only list. Excel import: /questions/import.
 */
import {
  startTransition,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  FileSpreadsheet,
  Plus,
  RefreshCw,
} from "lucide-react";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import { useLookups } from "@/core/hooks/useLookups";
import {
  displayQuestionListStatusLabel,
  isApprovedQuestionStatus,
  isArchivedQuestionStatus,
  isDraftQuestionStatus,
  isPendingQuestionStatus,
  isRejectedQuestionStatus,
  type QuestionSummary,
} from "@/features/questions/domain/questionTypes";
import {
  getQuestionListStatusKey,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import { QuestionBankStatTile } from "@/features/questions/presentation/components/QuestionBankStatTile";
import { QuestionCategoryColumn } from "@/features/questions/presentation/components/QuestionCategoryColumn";
import { useQuestionsQuery } from "@/features/questions/presentation/hooks/useQuestionQueries";
import { AppCard } from "@/components/ui/app-card";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * List filter tiles. Active = Approved + IsActive only.
 * Approved tile = Approved + inactive (deactivated Approved questions).
 */
type ListFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "archived"
  | "active";

function matchesListFilter(
  question: QuestionSummary,
  filter: ListFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "pending":
      return (
        isPendingQuestionStatus(question.status) ||
        isDraftQuestionStatus(question.status)
      );
    case "approved":
      return isApprovedQuestionStatus(question.status) && !question.isActive;
    case "rejected":
      return isRejectedQuestionStatus(question.status);
    case "archived":
      return isArchivedQuestionStatus(question.status);
    case "active":
      return isApprovedQuestionStatus(question.status) && question.isActive;
    default:
      return true;
  }
}

function listFilterLabel(filter: ListFilter): string {
  switch (filter) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "archived":
      return "Archived";
    case "active":
      return "Active";
    default:
      return "all";
  }
}

/** Read estimated time from list payload (camelCase or PascalCase). */
function resolveEstimatedTimeSeconds(
  question: QuestionSummary & { EstimatedTimeSeconds?: number },
): number | null {
  const value = question.estimatedTimeSeconds ?? question.EstimatedTimeSeconds;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Tally questions by a numeric foreign key (subject / class / difficulty). */
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
  const navigate = useNavigate();

  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [classId, setClassId] = useState<number | "">("");
  const [difficultyId, setDifficultyId] = useState<number | "">("");
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

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

  const bankStats = useMemo(() => {
    let active = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let archived = 0;

    for (const question of questions) {
      if (
        isPendingQuestionStatus(question.status) ||
        isDraftQuestionStatus(question.status)
      ) {
        pending += 1;
      } else if (isApprovedQuestionStatus(question.status)) {
        if (question.isActive) {
          active += 1;
        } else {
          approved += 1;
        }
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
    };
  }, [questions]);

  /** Questions in the current list filter — category counts follow. */
  const lensQuestions = useMemo(
    () => questions.filter((q) => matchesListFilter(q, listFilter)),
    [questions, listFilter],
  );

  const categoryColumns = useMemo(() => {
    const subjectCounts = countById(lensQuestions, (q) => q.subjectId);
    const classCounts = countById(lensQuestions, (q) => q.classId);
    const difficultyCounts = countById(lensQuestions, (q) => q.difficultyLevel);

    const mergeLookupCounts = (
      lookups: Array<{ id: number; name: string }> | undefined,
      counts: Map<number, number>,
      sortMode: "labelAsc" | "countDesc" = "countDesc",
    ) => {
      const items = new Map<
        number,
        { id: number; label: string; count: number }
      >();

      for (const lookup of lookups ?? []) {
        items.set(lookup.id, {
          id: lookup.id,
          label: lookup.name,
          count: counts.get(lookup.id) ?? 0,
        });
      }

      for (const [id, count] of counts.entries()) {
        if (!items.has(id)) {
          items.set(id, {
            id,
            label: lookupNameById.get(id) ?? "Unknown",
            count,
          });
        }
      }

      return [...items.values()].sort((a, b) => {
        if (sortMode === "labelAsc") {
          if (a.count === 0 && b.count > 0) return 1;
          if (b.count === 0 && a.count > 0) return -1;
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
    lensQuestions,
    lookupNameById,
    subjectsQuery.data,
    classesQuery.data,
    difficultiesQuery.data,
  ]);

  const tableRows = useMemo(() => {
    return lensQuestions.filter((question) => {
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
        const statusName = displayQuestionListStatusLabel(
          question.status,
          question.isActive,
        );
        const haystack =
          `${question.questionText} ${question.questionType} ${statusName} ${question.createdBy} ${question.createdByName ?? ""} ${subjectName} ${className} ${difficultyName}`.toLowerCase();
        if (!haystack.includes(deferredSearch)) {
          return false;
        }
      }
      return true;
    });
  }, [
    lensQuestions,
    subjectId,
    classId,
    difficultyId,
    deferredSearch,
    lookupNameById,
  ]);

  function selectListFilter(next: ListFilter) {
    startTransition(() => {
      setListFilter((current) => (current === next ? "all" : next));
    });
  }

  function clearAllFilters() {
    startTransition(() => {
      setListFilter("all");
      setSubjectId("");
      setClassId("");
      setDifficultyId("");
      setSearch("");
    });
  }

  const hasFilters =
    listFilter !== "all" ||
    subjectId !== "" ||
    classId !== "" ||
    difficultyId !== "" ||
    Boolean(search.trim());

  const activeCategoryFilters = [
    subjectId !== "",
    classId !== "",
    difficultyId !== "",
  ].filter(Boolean).length;

  const lensSummary =
    listFilter === "all" ? "all questions" : listFilterLabel(listFilter);

  function categoryLabel(question: QuestionSummary) {
    return {
      subject: lookupNameById.get(question.subjectId) ?? "Unknown subject",
      className: lookupNameById.get(question.classId) ?? "Unknown class",
      difficulty: lookupNameById.get(question.difficultyLevel) ?? "Unknown",
    };
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8 lg:py-10">
      <AppPageHeader
        title="Questions"
        className="mb-0"
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label="Refresh questions"
              title="Refresh"
            >
              <RefreshCw
                className={cn("h-4 w-4", isFetching && "animate-spin")}
              />
            </Button>
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="h-9 whitespace-nowrap"
            >
              <Link to="/questions/import">
                <FileSpreadsheet className="h-4 w-4" />
                Import
              </Link>
            </Button>
            <Button asChild type="button" size="sm" className="h-9 whitespace-nowrap">
              <Link to="/questions/new">
                <Plus className="h-4 w-4" />
                New question
              </Link>
            </Button>
          </div>
        }
      />

      {/* Status tiles: Pending / Approved / Rejected / Archived / Active */}
      <AppCard padded className="space-y-3">
        {hasFilters ? (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={clearAllFilters}
            >
              Clear filters
            </Button>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-2.5">
          <QuestionBankStatTile
            label="Total"
            value={bankStats.total}
            status="active"
            active={listFilter === "all"}
            onClick={() => selectListFilter("all")}
          />
          <QuestionBankStatTile
            label="Pending"
            value={bankStats.pending}
            status="pending"
            active={listFilter === "pending"}
            onClick={() => selectListFilter("pending")}
          />
          <QuestionBankStatTile
            label="Approved"
            value={bankStats.approved}
            status="approved"
            active={listFilter === "approved"}
            onClick={() => selectListFilter("approved")}
          />
          <QuestionBankStatTile
            label="Rejected"
            value={bankStats.rejected}
            status="rejected"
            active={listFilter === "rejected"}
            onClick={() => selectListFilter("rejected")}
          />
          <QuestionBankStatTile
            label="Archived"
            value={bankStats.archived}
            status="deactivated"
            active={listFilter === "archived"}
            onClick={() => selectListFilter("archived")}
          />
          <QuestionBankStatTile
            label="Active"
            value={bankStats.active}
            status="active"
            active={listFilter === "active"}
            onClick={() => selectListFilter("active")}
          />
        </div>
      </AppCard>

      {/* Category overview — full picture with counts */}
      <AppCard padded className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Subjects · Classes · Difficulties
              {activeCategoryFilters > 0
                ? ` · ${activeCategoryFilters} selected`
                : null}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Showing counts for {lensSummary}. Tap a row to filter the list.
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <AppSearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search questions…"
              containerClassName="min-w-0 flex-1 sm:max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => setCategoryExpanded((expanded) => !expanded)}
              aria-expanded={categoryExpanded}
              aria-controls="question-category-overview"
              aria-label={
                categoryExpanded
                  ? "Hide category overview"
                  : "Show category overview"
              }
              title={
                categoryExpanded
                  ? "Hide category overview"
                  : "Show category overview"
              }
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  categoryExpanded && "rotate-180",
                )}
              />
            </Button>
          </div>
        </div>

        {categoryExpanded ? (
          <div
            id="question-category-overview"
            className="grid gap-3 lg:grid-cols-3 lg:gap-4"
          >
            <QuestionCategoryColumn
              title="Subjects"
              accent="primary"
              items={categoryColumns.subjects}
              selectedId={subjectId}
              loading={subjectsQuery.isLoading}
              emptyLabel="No subjects configured yet."
              onSelect={(id) => startTransition(() => setSubjectId(id))}
            />
            <QuestionCategoryColumn
              title="Classes"
              accent="approved"
              items={categoryColumns.classes}
              selectedId={classId}
              loading={classesQuery.isLoading}
              emptyLabel="No classes configured yet."
              onSelect={(id) => startTransition(() => setClassId(id))}
            />
            <QuestionCategoryColumn
              title="Difficulties"
              accent="pending"
              items={categoryColumns.difficulties}
              selectedId={difficultyId}
              loading={difficultiesQuery.isLoading}
              emptyLabel="No difficulty levels configured yet."
              onSelect={(id) => startTransition(() => setDifficultyId(id))}
            />
          </div>
        ) : null}
      </AppCard>

      {error ? (
        <AppErrorState
          message={error.message}
          onRetry={() => void refetch()}
        />
      ) : null}

      {/* Question list — navigate only; actions live on detail */}
      <AppCard padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-foreground">
            {tableRows.length} question{tableRows.length === 1 ? "" : "s"}
            {listFilter !== "all" ? (
              <span className="ml-2 font-normal text-muted-foreground">
                · {lensSummary}
              </span>
            ) : null}
          </p>
        </div>

        {isLoading ? (
          <div className="p-4 sm:p-5">
            <AppLoadingSkeleton variant="table" count={5} />
          </div>
        ) : tableRows.length === 0 ? (
          <div className="p-4 sm:p-5">
            <AppEmptyState
              title="No questions match these filters"
              description="Clear filters or create a new question to get started."
              actionLabel="New question"
              onAction={() => navigate("/questions/new")}
            />
          </div>
        ) : (
          <div>
            <div className="hidden border-b border-border bg-muted/40 px-4 py-2.5 sm:grid sm:grid-cols-8 sm:gap-3 sm:px-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Subject
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Class
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Difficulty
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Type
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Marks
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Time sec
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Visibility
              </p>
            </div>

            <ul className="divide-y divide-border">
              {tableRows.map((question) => {
                const cat = categoryLabel(question);
                const visibility =
                  question.visibility && question.visibility !== "None"
                    ? question.visibility
                    : "—";
                const timeSeconds = resolveEstimatedTimeSeconds(question);
                const timeLabel =
                  timeSeconds != null ? `${timeSeconds} sec` : "—";

                return (
                  <li key={question.questionId}>
                    <Link
                      to={`/questions/${question.questionId}`}
                      className="block px-4 py-3.5 transition hover:bg-muted/30 sm:px-5"
                    >
                      <p
                        className="truncate text-sm font-semibold text-foreground"
                        title={question.questionText}
                      >
                        {question.questionText}
                      </p>

                      <div className="mt-2 grid grid-cols-2 items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-8">
                        <p className="min-w-0 truncate font-medium text-foreground">
                          {cat.subject}
                        </p>
                        <p className="min-w-0 truncate">{cat.className}</p>
                        <p className="min-w-0 truncate">{cat.difficulty}</p>
                        <p className="min-w-0 truncate">
                          {question.questionType}
                        </p>
                        <div className="min-w-0">
                          <StatusBadge
                            label={displayQuestionListStatusLabel(
                              question.status,
                              question.isActive,
                            )}
                            status={getQuestionListStatusKey(
                              question.status,
                              question.isActive,
                            )}
                          />
                        </div>
                        {/* Mobile: marks / time / visibility (no labels) */}
                        <p className="min-w-0 truncate tabular-nums sm:hidden">
                          {question.marks} / {timeLabel} / {visibility}
                        </p>
                        {/* Desktop: separate columns */}
                        <p className="hidden min-w-0 truncate tabular-nums sm:block">
                          {question.marks}
                        </p>
                        <p className="hidden min-w-0 truncate tabular-nums sm:block">
                          {timeLabel}
                        </p>
                        <p className="hidden min-w-0 truncate sm:block">
                          {visibility}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </AppCard>
    </div>
  );
}
