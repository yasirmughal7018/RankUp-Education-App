import { Link, useParams } from "react-router-dom";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { Button } from "@/components/ui/button";
import { QuizAttemptResultBody } from "@/features/student/presentation/components/QuizAttemptResultBody";
import { useStudentQuizResultQuery } from "@/features/student/presentation/hooks/useStudentQuizQueries";

export function StudentQuizResultPage() {
  const { quizId, attemptId } = useParams();
  const numericQuizId = Number(quizId);
  const numericAttemptId = Number(attemptId);

  const { data: result, isLoading, error } = useStudentQuizResultQuery(
    numericQuizId,
    numericAttemptId,
  );

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading result...</div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl">
        <AppPageHeader
          studentFacing
          title="Result unavailable"
          subtitle={error?.message ?? "Unable to load attempt result."}
          backTo="/student/quizzes"
          backAriaLabel="Back to quizzes"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AppPageHeader
        studentFacing
        title={result.quizTitle}
        subtitle={`Attempt #${result.attemptNumber} · ${result.timeSpentSeconds}s spent`}
        backTo={`/student/quizzes/${quizId}`}
        backAriaLabel="Back to quiz"
        action={
          <Button variant="outline" asChild>
            <Link to="/student/quizzes">All quizzes</Link>
          </Button>
        }
      />

      <QuizAttemptResultBody result={result} />
    </div>
  );
}
