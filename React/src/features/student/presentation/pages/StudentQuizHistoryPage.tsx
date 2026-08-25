import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardList, History, Percent, RefreshCw } from "lucide-react";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppCard } from "@/components/ui/app-card";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { formatMonitorStatus } from "@/features/quizzes/domain/quizMonitorTypes";
import { useStudentQuizHistoryReportQuery } from "@/features/reports/presentation/hooks/useReportQueries";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Student self quiz history via Reports API (permissions: History self only). */
export function StudentQuizHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.profileId ?? 0;
  const { data, isLoading, error, refetch, isFetching } =
    useStudentQuizHistoryReportQuery(studentId, studentId > 0);

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    const scored = items
      .map((item) => item.bestPercentage)
      .filter((value): value is number => value != null);
    const average =
      scored.length === 0
        ? null
        : Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length);
    return {
      total: items.length,
      withScore: scored.length,
      average,
    };
  }, [data?.items]);

  if (!user?.profileId) {
    return (
      <div className="space-y-6">
        <AppPageHeader
          studentFacing
          title="Quiz history"
          subtitle="Your student profile was not found on this account."
        />
        <AppErrorState message="Sign in with a student account to see past attempts." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppPageHeader
        studentFacing
        title="Quiz history"
        subtitle="Submitted attempts and announced results from your quizzes."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {error ? (
        <AppErrorState message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {isLoading ? (
        <AppLoadingSkeleton count={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AppStatCard
            title="Quizzes"
            value={stats.total}
            icon={History}
            colorVariant="primary"
            description="Attempts in your history"
          />
          <AppStatCard
            title="With a score"
            value={stats.withScore}
            icon={ClipboardList}
            colorVariant="success"
            description="Results that have been announced"
          />
          <AppStatCard
            title="Best average"
            value={stats.average == null ? "—" : `${stats.average}%`}
            icon={Percent}
            colorVariant="achievement"
            description="Across announced quiz scores"
          />
        </div>
      )}

      <section>
        <AppSectionHeader
          title="Past attempts"
          description="Open a result when it is available for that attempt."
        />

        {isLoading ? (
          <AppLoadingSkeleton variant="table" count={5} />
        ) : !data || data.items.length === 0 ? (
          <AppEmptyState
            icon={History}
            title="No quiz history yet"
            description="When you submit a quiz, it will show up here."
            actionLabel="My quizzes"
            onAction={() => navigate("/student/quizzes")}
          />
        ) : (
          <div className="space-y-3">
            {data.items.map((item) => (
              <AppCard
                key={`${item.quizId}-${item.attemptId ?? 0}`}
                className="flex flex-wrap items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-foreground">
                    {item.quizTitle}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Last submitted {formatDateTime(item.lastSubmittedAt)}
                    {item.attemptCount > 0
                      ? ` · ${item.attemptCount} attempt${item.attemptCount === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-display text-lg font-semibold tabular-nums text-primary">
                    {item.bestPercentage == null ? "—" : `${item.bestPercentage}%`}
                  </p>
                  <AppStatusBadge
                    status={item.resultStatus}
                    label={formatMonitorStatus(item.resultStatus)}
                  />
                  {item.attemptId ? (
                    <Button size="sm" asChild>
                      <Link
                        to={`/student/quizzes/${item.quizId}/attempts/${item.attemptId}/result`}
                      >
                        View result
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/student/quizzes/${item.quizId}`}>Open quiz</Link>
                    </Button>
                  )}
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
