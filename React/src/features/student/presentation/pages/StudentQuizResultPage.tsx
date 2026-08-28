import { Link, useParams } from "react-router-dom";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { Button } from "@/components/ui/button";
import { QuizAttemptResultBody } from "@/features/student/presentation/components/QuizAttemptResultBody";
import { useStudentQuizResultQuery } from "@/features/student/presentation/hooks/useStudentQuizQueries";

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  if (minutes <= 0) {
    return `${rest}s spent`;
  }
  return rest > 0 ? `${minutes}m ${rest}s spent` : `${minutes}m spent`;
}

export function StudentQuizResultPage() {
  const { quizId, attemptId } = useParams();
  const numericQuizId = Number(quizId);
  const numericAttemptId = Number(attemptId);
  const quizPath = `/student/quizzes/${quizId}`;

  const { data: result, isLoading, error, refetch } = useStudentQuizResultQuery(
    numericQuizId,
    numericAttemptId,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AppPageHeader
          studentFacing
          title="Quiz result"
          subtitle="Loading your attempt…"
          backTo="/student/quizzes"
          backAriaLabel="Back to quizzes"
        />
        <AppLoadingSkeleton variant="detail" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="space-y-6">
        <AppPageHeader
          studentFacing
          title="Result unavailable"
          subtitle="This attempt could not be opened."
          backTo="/student/quizzes"
          backAriaLabel="Back to quizzes"
        />
        <AppErrorState
          message={error?.message ?? "Unable to load attempt result."}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppPageHeader
        studentFacing
        title={result.quizTitle}
        subtitle={`Attempt #${result.attemptNumber} · ${formatDuration(result.timeSpentSeconds)}`}
        backTo={quizPath}
        backAriaLabel="Back to quiz"
        action={
          <Button variant="outline" asChild>
            <Link to="/student/quizzes">All quizzes</Link>
          </Button>
        }
      />

      <QuizAttemptResultBody
        result={result}
        attemptResultTo={(id) =>
          `/student/quizzes/${result.quizId}/attempts/${id}/result`
        }
      />
    </div>
  );
}
