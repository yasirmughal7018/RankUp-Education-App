import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Sparkles,
  ClipboardList,
  Target,
  Flame,
  Activity,
} from "lucide-react";
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
 * Student Learning Dashboard — design-system example.
 * Uses Poppins via studentFacing header; progress + achievement accents.
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
        subtitle="Stay focused — track quizzes, rank, and AI tips in one calm view."
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
        <AppLoadingSkeleton count={6} />
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
            description="Keep going"
          />
          <AppStatCard
            title="Rank & level"
            value="—"
            icon={Trophy}
            colorVariant="achievement"
            description="Earn ranks by completing quizzes"
          />
          <AppStatCard
            title="AI recommendation"
            value="Practice"
            icon={Sparkles}
            colorVariant="ai"
            description="Review weak topics after your next quiz"
          />
          <AppStatCard
            title="Weak topic"
            value="—"
            icon={Target}
            colorVariant="danger"
            description="Appears after graded attempts"
          />
          <AppStatCard
            title="Recent activity"
            value={progress.total}
            icon={Activity}
            colorVariant="success"
            description="Assigned quizzes"
          />
        </div>
      )}

      <AppCard>
        <AppSectionHeader
          title="Overall completion"
          description="Simple progress bar — charts stay optional."
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
                    Due {quiz.dueAt ? new Date(quiz.dueAt).toLocaleString() : "—"}
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
          </div>
        )}
      </section>
    </div>
  );
}
