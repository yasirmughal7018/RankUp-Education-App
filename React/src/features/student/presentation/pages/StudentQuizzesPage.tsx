import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  LayoutDashboard,
  PlayCircle,
  RefreshCw,
  TimerOff,
} from "lucide-react";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/core/components/FieldLabel";
import { StatusBadge } from "@/features/questions/presentation/components/StatusBadge";
import type { ApprovalStatusKey } from "@/lib/constants/approval-status";
import type { QuizSummary } from "@/features/quizzes/domain/quizTypes";
import {
  classifyStudentQuiz,
  formatStudentQuizListResult,
  isStudentQuizInLastMonth,
  resolveStudentQuizAction,
  type StudentQuizBucket,
} from "@/features/student/domain/studentQuizTypes";
import { useStudentQuizzesQuery } from "@/features/student/presentation/hooks/useStudentQuizQueries";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

const inputClassName = FORM_FIELD_CLASS;

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function bucketLabel(bucket: StudentQuizBucket): string {
  switch (bucket) {
    case "inProgress":
      return "In progress";
    case "upcoming":
      return "Upcoming";
    case "expired":
      return "Expired";
    case "attempted":
      return "Attempted";
    default:
      return "Open now";
  }
}

function bucketThemeKey(bucket: StudentQuizBucket): ApprovalStatusKey {
  switch (bucket) {
    case "inProgress":
      return "locked";
    case "upcoming":
      return "pending";
    case "expired":
      return "deactivated";
    case "attempted":
      return "approved";
    default:
      return "active";
  }
}

function actionIcon(label: string) {
  if (label === "View result") {
    return CheckCircle2;
  }
  if (label === "View quiz" || label === "Open") {
    return Eye;
  }
  return PlayCircle;
}

export function StudentQuizzesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showAll = searchParams.get("all") === "1";
  const { data: quizzes = [], isLoading, error, refetch, isFetching } =
    useStudentQuizzesQuery();

  const [search, setSearch] = useState("");
  const [quizTypeFilter, setQuizTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentQuizBucket | "">("");

  const now = useMemo(() => new Date(), [quizzes]);

  const quizTypeOptions = useMemo(
    () =>
      [...new Set(quizzes.map((quiz) => quiz.quizType).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [quizzes],
  );

  const dashboard = useMemo(() => {
    const counts = {
      active: 0,
      upcoming: 0,
      expired: 0,
      attempted: 0,
      inProgress: 0,
    };
    for (const quiz of quizzes) {
      counts[classifyStudentQuiz(quiz, now)] += 1;
    }
    return counts;
  }, [quizzes, now]);

  const visibleQuizzes = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      if (!showAll && !isStudentQuizInLastMonth(quiz, now)) {
        return false;
      }

      if (quizTypeFilter && quiz.quizType !== quizTypeFilter) {
        return false;
      }

      if (statusFilter === "active") {
        const bucket = classifyStudentQuiz(quiz, now);
        if (bucket !== "active" && bucket !== "inProgress") {
          return false;
        }
      } else if (statusFilter && classifyStudentQuiz(quiz, now) !== statusFilter) {
        return false;
      }

      if (!needle) {
        return true;
      }

      const haystack = [
        quiz.title,
        quiz.subject,
        quiz.grade,
        quiz.quizType,
        quiz.resultStatus,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [quizzes, showAll, now, search, quizTypeFilter, statusFilter]);

  function setShowAll(next: boolean) {
    const nextParams = new URLSearchParams(searchParams);
    if (next) {
      nextParams.set("all", "1");
    } else {
      nextParams.delete("all");
    }
    setSearchParams(nextParams, { replace: true });
    setStatusFilter("");
  }

  return (
    <div className="space-y-6">
      <AppPageHeader
        studentFacing
        title={showAll ? "All quizzes" : "My quizzes"}
        subtitle={
          showAll
            ? "Every assigned quiz, with a snapshot of what is open, upcoming, expired, or already attempted."
            : "Quizzes from the last month. Older quizzes stay in All quizzes."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {showAll ? (
              <Button type="button" variant="outline" onClick={() => setShowAll(false)}>
                Last month
              </Button>
            ) : (
              <Button type="button" onClick={() => setShowAll(true)}>
                <LayoutDashboard className="h-4 w-4" />
                All quizzes
              </Button>
            )}
          </div>
        }
      />

      {error ? (
        <AppErrorState message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {showAll ? (
        isLoading ? (
          <AppLoadingSkeleton count={4} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AppStatCard
              compact
              title="Open now"
              value={dashboard.active + dashboard.inProgress}
              icon={PlayCircle}
              colorVariant="primary"
              onClick={() => setStatusFilter("active")}
            />
            <AppStatCard
              compact
              title="Upcoming"
              value={dashboard.upcoming}
              icon={CalendarClock}
              colorVariant="warning"
              onClick={() => setStatusFilter("upcoming")}
            />
            <AppStatCard
              compact
              title="Expired"
              value={dashboard.expired}
              icon={TimerOff}
              colorVariant="neutral"
              onClick={() => setStatusFilter("expired")}
            />
            <AppStatCard
              compact
              title="Attempted"
              value={dashboard.attempted}
              icon={CheckCircle2}
              colorVariant="success"
              onClick={() => setStatusFilter("attempted")}
            />
          </div>
        )
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-border/80 bg-card/90 p-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <FieldLabel htmlFor="student-quiz-search" optional>
            Search
          </FieldLabel>
          <input
            id="student-quiz-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title, subject, type…"
            className={inputClassName}
          />
        </div>
        <div>
          <FieldLabel htmlFor="student-quiz-type" optional>
            Quiz type
          </FieldLabel>
          <select
            id="student-quiz-type"
            value={quizTypeFilter}
            onChange={(event) => setQuizTypeFilter(event.target.value)}
            className={inputClassName}
          >
            <option value="">All types</option>
            {quizTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="student-quiz-bucket" optional>
            Status
          </FieldLabel>
          <select
            id="student-quiz-bucket"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter((event.target.value || "") as StudentQuizBucket | "")
            }
            className={inputClassName}
          >
            <option value="">All statuses</option>
            <option value="active">Open now</option>
            <option value="inProgress">In progress</option>
            <option value="upcoming">Upcoming</option>
            <option value="expired">Expired</option>
            <option value="attempted">Attempted</option>
          </select>
        </div>
      </section>

      <section>
        <AppSectionHeader
          title={showAll ? "Quiz list" : "Last month"}
          description={
            statusFilter
              ? `Showing ${bucketLabel(statusFilter).toLowerCase()} quizzes.`
              : showAll
                ? "Open a quiz to start, review settings, or see your result."
                : "Active, upcoming, and recently closed quizzes."
          }
        />

        {isLoading ? (
          <AppLoadingSkeleton variant="table" count={5} />
        ) : visibleQuizzes.length === 0 ? (
          <AppEmptyState
            icon={ClipboardList}
            title={
              quizzes.length === 0
                ? "No quizzes assigned yet"
                : showAll
                  ? "No quizzes match your filters"
                  : "No quizzes in the last month"
            }
            description={
              quizzes.length === 0
                ? "When a teacher or parent assigns work, it will show up here."
                : showAll
                  ? "Try clearing search or status filters."
                  : "Use All quizzes to see older assignments and a full snapshot."
            }
            actionLabel={showAll || quizzes.length === 0 ? undefined : "All quizzes"}
            onAction={
              showAll || quizzes.length === 0 ? undefined : () => setShowAll(true)
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Quiz</th>
                    <th className="px-4 py-2.5 font-medium">Subject</th>
                    <th className="px-4 py-2.5 font-medium">Due</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Result</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleQuizzes.map((quiz) => (
                    <StudentQuizTableRow
                      key={quiz.id}
                      quiz={quiz}
                      now={now}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StudentQuizTableRow({
  quiz,
  now,
}: {
  quiz: QuizSummary;
  now: Date;
}) {
  const bucket = classifyStudentQuiz(quiz, now);
  const action = resolveStudentQuizAction(quiz, now);
  const result = formatStudentQuizListResult(quiz, now);
  const Icon = action ? actionIcon(action.label) : Eye;

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-2 align-middle">
        <Link
          to={`/student/quizzes/${quiz.id}`}
          className="font-display font-semibold text-foreground hover:text-primary"
        >
          {quiz.title}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {quiz.quizType}
          {quiz.attemptLimit > 0 ? ` · ${quiz.attemptLimit} attempts` : ""}
        </p>
      </td>
      <td className="px-4 py-2 align-middle text-muted-foreground">
        {quiz.subject} / {quiz.grade}
      </td>
      <td className="whitespace-nowrap px-4 py-2 align-middle text-muted-foreground">
        {bucket === "upcoming"
          ? `Opens ${formatDateTime(quiz.startAt)}`
          : formatDateTime(quiz.dueAt)}
      </td>
      <td className="whitespace-nowrap px-4 py-2 align-middle">
        <StatusBadge
          label={bucketLabel(bucket)}
          status={bucketThemeKey(bucket)}
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2 align-middle">
        <p className="font-semibold tabular-nums text-foreground">
          {result.label}
        </p>
        {result.detail ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{result.detail}</p>
        ) : null}
      </td>
      <td className="px-4 py-2 align-middle">
        <div className="flex justify-end">
          {action ? (
            <Button
              size="sm"
              variant={action.variant}
              className="h-7 rounded-full px-2.5 text-[11px] font-semibold leading-none"
              asChild
            >
              <Link to={action.to}>
                <Icon className="h-3 w-3" />
                {action.label}
              </Link>
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
