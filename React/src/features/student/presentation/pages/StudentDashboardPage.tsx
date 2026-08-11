import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Flame, Activity } from "lucide-react";
import { useStudentQuizzesQuery } from "@/features/student/presentation/hooks/useStudentQuizQueries";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppCard } from "@/components/ui/app-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/**
 * Student Learning Dashboard — quiz progress from assigned quizzes only.
 * Rank / AI / weak-topic cards are omitted until those APIs exist.
 */
export function StudentDashboardPage() {
  const { data: quizzes = [], isLoading, error, refetch } =
    useStudentQuizzesQuery();

  const progress = useMemo(() => {
    const total = quizzes.length;
    const completed = quizzes.filter((q) =>
      (q.resultStatus ?? q.status ?? "").toLowerCase().includes("complete"),
    ).length;
    const inProgress = quizzes.filter((q) =>
      (q.status ?? "").toLowerCase().includes("progress"),
    ).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, inProgress, pct };
  }, [quizzes]);

  return (
    <div className="space-y-6">
      <AppPageHeader
        studentFacing
        title="Today’s learning"
        subtitle="Track assigned quizzes and pick up where you left off."
        action={
          <Button asChild>
            <Link to="/student/quizzes">My quizzes</Link>
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
            title="Quiz progress"
            value={`${progress.pct}%`}
            icon={ClipboardList}
            colorVariant="primary"
            description={`${progress.completed} of ${progress.total} completed`}
          />
          <AppStatCard
            title="In progress"
            value={progress.inProgress}
            icon={Flame}
            colorVariant="warning"
            description="Continue an open attempt"
          />
          <AppStatCard
            title="Assigned"
            value={progress.total}
            icon={Activity}
            colorVariant="success"
            description="Quizzes on your list"
          />
        </div>
      )}

      <AppCard>
        <AppSectionHeader
          title="Overall completion"
          description="Based on quizzes currently assigned to you."
        />
        <Progress value={progress.pct} className="h-3" />
        <p className="mt-2 text-sm text-muted-foreground">
          {progress.pct}% complete
        </p>
      </AppCard>

      <section>
        <AppSectionHeader title="Assigned quizzes" />
        {isLoading ? (
          <AppLoadingSkeleton variant="table" />
        ) : quizzes.length === 0 ? (
          <AppEmptyState
            title="No quizzes yet"
            description="When your teacher assigns work, it will show up here."
          />
        ) : (
          <div className="space-y-3">
            {quizzes.slice(0, 6).map((quiz) => (
              <AppCard
                key={quiz.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-display font-semibold text-foreground">
                    {quiz.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Due{" "}
                    {quiz.dueAt ? new Date(quiz.dueAt).toLocaleString() : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <AppStatusBadge
                    status={quiz.resultStatus ?? quiz.status ?? "Assigned"}
                  />
                  <Button size="sm" asChild>
                    <Link to={`/student/quizzes/${quiz.id}`}>Open</Link>
                  </Button>
                </div>
              </AppCard>
            ))}
            {quizzes.length > 6 ? (
              <div className="pt-1">
                <Button variant="outline" asChild>
                  <Link to="/student/quizzes">View all quizzes</Link>
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
