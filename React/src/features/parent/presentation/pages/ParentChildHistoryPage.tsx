import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ClipboardList,
  History,
  Percent,
  RefreshCw,
  GraduationCap,
  Eye,
} from "lucide-react";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { Button } from "@/components/ui/button";
import { useChildQuizHistoryQuery } from "@/features/parent/presentation/hooks/useParentQueries";
import { formatMonitorStatus } from "@/features/quizzes/domain/quizMonitorTypes";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Linked-child quiz history — compact stats + themed quiz table. */
export function ParentChildHistoryPage() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const numericStudentId = Number(studentId);
  const { data, isLoading, error, refetch, isFetching } =
    useChildQuizHistoryQuery(numericStudentId);

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    const scored = items
      .map((item) => item.bestPercentage)
      .filter((value): value is number => value != null);
    const average =
      scored.length === 0
        ? null
        : Math.round(
            scored.reduce((sum, value) => sum + value, 0) / scored.length,
          );
    const reviewed = items.filter((item) => item.isReviewDone).length;
    return {
      total: items.length,
      withScore: scored.length,
      average,
      reviewed,
    };
  }, [data?.items]);

  const studentLabel =
    data?.studentName?.trim() ||
    (data?.studentId ? `Student ${data.studentId}` : "Child");

  if (!Number.isFinite(numericStudentId) || numericStudentId <= 0) {
    return (
      <div className="space-y-5">
        <AppPageHeader
          title="Quiz history"
          subtitle="Choose a linked child to view their quiz results."
          backTo="/parent/children"
          backAriaLabel="Back to children"
          className="mb-0 [&_h1]:text-lg sm:[&_h1]:text-xl"
        />
        <AppErrorState message="This child link is not valid." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AppPageHeader
        title="Quiz history"
        eyebrow={studentLabel}
        subtitle="Submitted quizzes and announced results for this linked student."
        backTo="/parent/children"
        backAriaLabel="Back to children"
        className="mb-0 [&_h1]:text-lg sm:[&_h1]:text-xl"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/parent/children">Children</Link>
            </Button>
          </div>
        }
      />

      {error ? (
        <AppErrorState
          message={error.message}
          onRetry={() => void refetch()}
        />
      ) : null}

      {isLoading ? (
        <AppLoadingSkeleton count={3} />
      ) : data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AppStatCard
            compact
            title="Quizzes"
            value={stats.total}
            icon={History}
            colorVariant="primary"
            description="In this child's history"
          />
          <AppStatCard
            compact
            title="With a score"
            value={stats.withScore}
            icon={ClipboardList}
            colorVariant="success"
            description="Announced results"
          />
          <AppStatCard
            compact
            title="Best average"
            value={stats.average == null ? "—" : `${stats.average}%`}
            icon={Percent}
            colorVariant="achievement"
            description="Across announced scores"
          />
          <AppStatCard
            compact
            title="Reviewed"
            value={stats.reviewed}
            icon={GraduationCap}
            colorVariant="neutral"
            description="Owner review done"
          />
        </div>
      ) : null}

      <section>
        <AppSectionHeader
          title="Past quizzes"
          description="Open a result when it is available for that quiz."
          className="mb-3 [&_h2]:text-base"
        />

        {isLoading ? (
          <AppLoadingSkeleton variant="table" count={5} />
        ) : !data ? (
          <AppEmptyState
            icon={History}
            title="Quiz history unavailable"
            description={error?.message ?? "Unable to load quiz history."}
            actionLabel="Back to children"
            onAction={() => navigate("/parent/children")}
          />
        ) : data.items.length === 0 ? (
          <AppEmptyState
            icon={History}
            title="No quiz history yet"
            description="When this child submits a quiz, it will show up here."
            actionLabel="Back to children"
            onAction={() => navigate("/parent/children")}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Quiz
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Best %
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Result
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Last submitted
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {data.items.map((item) => (
                    <tr
                      key={`${item.quizId}-${item.attemptId ?? 0}`}
                      className="hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {item.quizTitle}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground">
                        {item.bestPercentage == null
                          ? "—"
                          : `${item.bestPercentage}%`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <AppStatusBadge
                            status={item.resultStatus}
                            label={formatMonitorStatus(item.resultStatus)}
                          />
                          {item.isReviewDone ? (
                            <span className="text-xs text-muted-foreground">
                              – Reviewed
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(item.lastSubmittedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.attemptId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 rounded-full px-2.5 text-[11px] font-semibold leading-none"
                            asChild
                          >
                            <Link
                              to={`/parent/children/${data.studentId}/quizzes/${item.quizId}/attempts/${item.attemptId}/result`}
                            >
                              <Eye className="!size-3.5" aria-hidden />
                              View result
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
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
