/**
 * Quiz management dashboard — same shell as QuestionsPage:
 * status tiles, collapsible category overview, navigate-only list.
 */
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ClipboardList,
  Plus,
  RefreshCw,
  Rows3,
} from "lucide-react";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import { useLookups } from "@/core/hooks/useLookups";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { StatusBadge } from "@/features/questions/presentation/components/StatusBadge";
import { QuestionBankStatTile } from "@/features/questions/presentation/components/QuestionBankStatTile";
import { QuestionCategoryColumn } from "@/features/questions/presentation/components/QuestionCategoryColumn";
import {
  canAssignAdminAudiences,
  canAuthorQuizzes,
  canReviewQuizEditRequests,
  canViewOrgQuizCatalog,
  defaultQuizListMineOnly,
  formatQuizDisplayStatusLabel,
  isDraftQuiz,
  isUnpublishedQuizDisplayStatus,
  type QuizSummary,
} from "@/features/quizzes/domain/quizTypes";
import { useQuizzesQuery, usePendingQuizEditRequestsQuery } from "@/features/quizzes/presentation/hooks/useQuizQueries";
import { QuizEditRequestsPanel } from "@/features/quizzes/presentation/components/QuizEditRequestsPanel";
import { AppCard } from "@/components/ui/app-card";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import type { ApprovalStatusKey } from "@/lib/constants/approval-status";
import { cn } from "@/lib/utils";

/** Lifecycle-oriented list filter tiles (mirrors Questions status tiles). */
type ListFilter =
  | "all"
  | "draft"
  | "published"
  | "assigned"
  | "archived";

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

/** Attempt/result-style list statuses still mean the quiz is in the assigned path. */
function isAssignedLikeStatus(status: string): boolean {
  const s = normalizeStatus(status);
  if (s === "assigned") {
    return true;
  }
  return (
    s.includes("progress") ||
    s.includes("upcoming") ||
    s.includes("completed") ||
    s.includes("expired") ||
    s.includes("attempt") ||
    s.includes("review") ||
    s.includes("submitted")
  );
}

function matchesListFilter(quiz: QuizSummary, filter: ListFilter): boolean {
  const status = normalizeStatus(quiz.status);
  switch (filter) {
    case "all":
      return true;
    case "draft":
      return isUnpublishedQuizDisplayStatus(status);
    case "published":
      return status === "published";
    case "assigned":
      return isAssignedLikeStatus(status);
    case "archived":
      return status === "archived";
    default:
      return true;
  }
}

function listFilterLabel(filter: ListFilter): string {
  switch (filter) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "assigned":
      return "Assigned";
    case "archived":
      return "Archived";
    default:
      return "all";
  }
}

function displayQuizListStatusLabel(status: string): string {
  return formatQuizDisplayStatusLabel(status);
}

function getQuizListStatusKey(status: string): ApprovalStatusKey {
  const s = normalizeStatus(status);
  if (s === "approval pending" || isDraftQuiz(s) || s === "school approved" || s === "awaiting publish") {
    return "pending";
  }
  if (s === "published") {
    return "approved";
  }
  if (s === "archived") {
    return "deactivated";
  }
  if (isAssignedLikeStatus(s)) {
    return "active";
  }
  if (s.includes("reject")) {
    return "rejected";
  }
  return "deactivated";
}

function countByLookupId(
  quizzes: QuizSummary[],
  pickName: (quiz: QuizSummary) => string,
  nameToId: Map<string, number>,
) {
  const map = new Map<number, number>();
  for (const quiz of quizzes) {
    const name = pickName(quiz).trim().toLowerCase();
    if (!name) {
      continue;
    }
    const id = nameToId.get(name);
    if (!id) {
      continue;
    }
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export function QuizzesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminAssigner = user != null && canAssignAdminAudiences(user.role);
  const canAuthor = user != null && canAuthorQuizzes(user.role);
  const orgCatalogViewer = user != null && canViewOrgQuizCatalog(user.role);

  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [classId, setClassId] = useState<number | "">("");
  const [difficultyId, setDifficultyId] = useState<number | "">("");
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [showMineOnly, setShowMineOnly] = useState(false);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    setShowMineOnly(defaultQuizListMineOnly(user?.role));
  }, [user?.role]);

  const canReviewEditRequests =
    user != null && canReviewQuizEditRequests(user.role);
  const {
    data: editRequests = [],
    isLoading: editRequestsLoading,
    error: editRequestsError,
  } = usePendingQuizEditRequestsQuery({ enabled: canReviewEditRequests });

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

  const nameToSubjectId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of subjectsQuery.data ?? []) {
      map.set(item.name.trim().toLowerCase(), item.id);
    }
    return map;
  }, [subjectsQuery.data]);

  const nameToClassId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of classesQuery.data ?? []) {
      map.set(item.name.trim().toLowerCase(), item.id);
    }
    return map;
  }, [classesQuery.data]);

  const nameToDifficultyId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of difficultiesQuery.data ?? []) {
      map.set(item.name.trim().toLowerCase(), item.id);
    }
    return map;
  }, [difficultiesQuery.data]);

  const scopedQuizzes = useMemo(() => {
    if (!showMineOnly || orgCatalogViewer || !canAuthor || !user) {
      return quizzes;
    }
    const mineKey = String(user.id);
    return quizzes.filter((quiz) => quiz.createdBy === mineKey);
  }, [quizzes, showMineOnly, orgCatalogViewer, canAuthor, user]);

  const bankStats = useMemo(() => {
    let draft = 0;
    let published = 0;
    let assigned = 0;
    let archived = 0;

    for (const quiz of scopedQuizzes) {
      const status = normalizeStatus(quiz.status);
      if (isUnpublishedQuizDisplayStatus(status)) {
        draft += 1;
      } else if (status === "published") {
        published += 1;
      } else if (status === "archived") {
        archived += 1;
      } else if (isAssignedLikeStatus(status)) {
        assigned += 1;
      }
    }

    return {
      total: scopedQuizzes.length,
      draft,
      published,
      assigned,
      archived,
    };
  }, [scopedQuizzes]);

  const lensQuizzes = useMemo(
    () => scopedQuizzes.filter((quiz) => matchesListFilter(quiz, listFilter)),
    [scopedQuizzes, listFilter],
  );

  const categoryColumns = useMemo(() => {
    const subjectCounts = countByLookupId(
      lensQuizzes,
      (quiz) => quiz.subject,
      nameToSubjectId,
    );
    const classCounts = countByLookupId(
      lensQuizzes,
      (quiz) => quiz.grade,
      nameToClassId,
    );
    const difficultyCounts = countByLookupId(
      lensQuizzes,
      (quiz) => quiz.difficulty,
      nameToDifficultyId,
    );

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
    lensQuizzes,
    lookupNameById,
    nameToSubjectId,
    nameToClassId,
    nameToDifficultyId,
    subjectsQuery.data,
    classesQuery.data,
    difficultiesQuery.data,
  ]);

  const tableRows = useMemo(() => {
    return lensQuizzes.filter((quiz) => {
      if (subjectId !== "") {
        const matchId = nameToSubjectId.get(quiz.subject.trim().toLowerCase());
        if (matchId !== subjectId) {
          return false;
        }
      }
      if (classId !== "") {
        const matchId = nameToClassId.get(quiz.grade.trim().toLowerCase());
        if (matchId !== classId) {
          return false;
        }
      }
      if (difficultyId !== "") {
        const matchId = nameToDifficultyId.get(
          quiz.difficulty.trim().toLowerCase(),
        );
        if (matchId !== difficultyId) {
          return false;
        }
      }
      if (deferredSearch) {
        const statusName = displayQuizListStatusLabel(quiz.status);
        const haystack =
          `${quiz.title} ${quiz.subject} ${quiz.grade} ${quiz.topic} ${quiz.difficulty} ${quiz.quizType} ${quiz.schoolName} ${statusName} ${quiz.createdBy}`.toLowerCase();
        if (!haystack.includes(deferredSearch)) {
          return false;
        }
      }
      return true;
    });
  }, [
    lensQuizzes,
    subjectId,
    classId,
    difficultyId,
    deferredSearch,
    nameToSubjectId,
    nameToClassId,
    nameToDifficultyId,
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
      setShowMineOnly(defaultQuizListMineOnly(user?.role));
    });
  }

  const defaultMineOnly = defaultQuizListMineOnly(user?.role);

  const hasFilters =
    listFilter !== "all" ||
    subjectId !== "" ||
    classId !== "" ||
    difficultyId !== "" ||
    Boolean(search.trim()) ||
    (canAuthor && showMineOnly !== defaultMineOnly);

  const activeCategoryFilters = [
    subjectId !== "",
    classId !== "",
    difficultyId !== "",
  ].filter(Boolean).length;

  const lensSummary =
    listFilter === "all" ? "all quizzes" : listFilterLabel(listFilter);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8 lg:py-10">
      <AppPageHeader
        title="Quizzes"
        className="mb-0"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label="Refresh quizzes"
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
              <Link to="/quizzes/assignments">
                <Rows3 className="h-4 w-4" />
                Assignments
              </Link>
            </Button>
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="h-9 whitespace-nowrap"
            >
              <Link to="/quizzes/reviews/pending">
                <ClipboardList className="h-4 w-4" />
                Pending reviews
              </Link>
            </Button>
            {canAuthor ? (
              <Button
                asChild
                type="button"
                size="sm"
                className="h-9 whitespace-nowrap"
              >
                <Link to="/quizzes/new">
                  <Plus className="h-4 w-4" />
                  New quiz
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {canReviewEditRequests ? (
        <AppCard padded={false} className="mb-4">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">
              Quiz edit requests
              {editRequests.length > 0 ? ` (${editRequests.length})` : ""}
            </h2>
          </div>
          <QuizEditRequestsPanel
            items={editRequests}
            isLoading={editRequestsLoading}
            error={editRequestsError instanceof Error ? editRequestsError : null}
          />
        </AppCard>
      ) : null}

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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-2.5">
          <QuestionBankStatTile
            label="Total"
            value={bankStats.total}
            status="active"
            active={listFilter === "all"}
            onClick={() => selectListFilter("all")}
          />
          <QuestionBankStatTile
            label="Draft"
            value={bankStats.draft}
            status="pending"
            active={listFilter === "draft"}
            onClick={() => selectListFilter("draft")}
          />
          <QuestionBankStatTile
            label="Published"
            value={bankStats.published}
            status="approved"
            active={listFilter === "published"}
            onClick={() => selectListFilter("published")}
          />
          <QuestionBankStatTile
            label="Assigned"
            value={bankStats.assigned}
            status="active"
            active={listFilter === "assigned"}
            onClick={() => selectListFilter("assigned")}
          />
          <QuestionBankStatTile
            label="Archived"
            value={bankStats.archived}
            status="deactivated"
            active={listFilter === "archived"}
            onClick={() => selectListFilter("archived")}
          />
        </div>
      </AppCard>

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
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {canAuthor ? (
              <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={showMineOnly}
                  onChange={(event) =>
                    startTransition(() => setShowMineOnly(event.target.checked))
                  }
                  className="rounded border-input"
                />
                Mine only
              </label>
            ) : null}
            <AppSearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search quizzes…"
              containerClassName="min-w-0 flex-1 sm:max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => setCategoryExpanded((expanded) => !expanded)}
              aria-expanded={categoryExpanded}
              aria-controls="quiz-category-overview"
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
            id="quiz-category-overview"
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

      <AppCard padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-foreground">
            {tableRows.length} quiz{tableRows.length === 1 ? "" : "zes"}
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
              title="No quizzes match these filters"
              description={
                isAdminAssigner
                  ? "Clear filters, approve teacher quizzes, or create a new quiz to get started."
                  : "Clear filters or create a new quiz to get started."
              }
              actionLabel={canAuthor ? "New quiz" : undefined}
              onAction={
                canAuthor ? () => navigate("/quizzes/new") : undefined
              }
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
                Questions
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Marks
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                School
              </p>
            </div>

            <ul className="divide-y divide-border">
              {tableRows.map((quiz) => {
                const timeLabel =
                  quiz.timeLimitMinutes != null
                    ? `${quiz.timeLimitMinutes} min`
                    : "—";

                return (
                  <li key={quiz.id}>
                    <Link
                      to={`/quizzes/${quiz.id}`}
                      className="block px-4 py-3.5 transition hover:bg-muted/30 sm:px-5"
                    >
                      <p
                        className="truncate text-sm font-semibold text-foreground"
                        title={quiz.title}
                      >
                        {quiz.title}
                      </p>

                      <div className="mt-2 grid grid-cols-2 items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-8">
                        <p className="min-w-0 truncate font-medium text-foreground">
                          {quiz.subject || "—"}
                        </p>
                        <p className="min-w-0 truncate">{quiz.grade || "—"}</p>
                        <p className="min-w-0 truncate">
                          {quiz.difficulty || "—"}
                        </p>
                        <p className="min-w-0 truncate">
                          {quiz.quizType || "—"}
                        </p>
                        <div className="min-w-0">
                          <StatusBadge
                            label={displayQuizListStatusLabel(quiz.status)}
                            status={getQuizListStatusKey(quiz.status)}
                          />
                        </div>
                        <p className="min-w-0 truncate tabular-nums sm:hidden">
                          {quiz.questionCount} Q · {quiz.totalMarks} marks ·{" "}
                          {timeLabel}
                        </p>
                        <p className="hidden min-w-0 truncate tabular-nums sm:block">
                          {quiz.questionCount}
                        </p>
                        <p className="hidden min-w-0 truncate tabular-nums sm:block">
                          {quiz.totalMarks}
                        </p>
                        <p className="hidden min-w-0 truncate sm:block">
                          {quiz.schoolName || "—"}
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
