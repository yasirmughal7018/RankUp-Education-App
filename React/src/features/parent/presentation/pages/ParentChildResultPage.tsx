import { useParams } from "react-router-dom";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { useParentChildResultQuery } from "@/features/parent/presentation/hooks/useParentQueries";
import { QuizAttemptResultBody } from "@/features/student/presentation/components/QuizAttemptResultBody";

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  if (minutes <= 0) {
    return `${rest}s spent`;
  }
  return rest > 0 ? `${minutes}m ${rest}s spent` : `${minutes}m spent`;
}

export function ParentChildResultPage() {
  const { studentId, quizId, attemptId } = useParams();
  const numericQuizId = Number(quizId);
  const numericAttemptId = Number(attemptId);
  const historyPath = `/parent/children/${studentId}/history`;

  const { data: result, isLoading, error, refetch } = useParentChildResultQuery(
    numericQuizId,
    numericAttemptId,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AppPageHeader
          title="Quiz result"
          subtitle="Loading this attempt…"
          backTo={historyPath}
          backAriaLabel="Back to history"
        />
        <AppLoadingSkeleton variant="detail" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="space-y-6">
        <AppPageHeader
          title="Result unavailable"
          subtitle="This attempt could not be opened."
          backTo={historyPath}
          backAriaLabel="Back to history"
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
        title={result.quizTitle}
        subtitle={`Attempt #${result.attemptNumber} · ${formatDuration(result.timeSpentSeconds)}`}
        backTo={historyPath}
        backAriaLabel="Back to history"
      />

      <QuizAttemptResultBody result={result} answerLabel="Answer" />
    </div>
  );
}
