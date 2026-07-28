import { useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useParentChildResultQuery } from "@/features/parent/presentation/hooks/useParentQueries";
import { QuizAttemptResultBody } from "@/features/student/presentation/components/QuizAttemptResultBody";

export function ParentChildResultPage() {
  const { studentId, quizId, attemptId } = useParams();
  const numericQuizId = Number(quizId);
  const numericAttemptId = Number(attemptId);
  const historyPath = `/parent/children/${studentId}/history`;

  const { data: result, isLoading, error } = useParentChildResultQuery(
    numericQuizId,
    numericAttemptId,
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading result...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Result unavailable"
          description={error?.message ?? "Unable to load attempt result."}
          backTo={historyPath}
          backAriaLabel="Back to history"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title={result.quizTitle}
        description={`Attempt #${result.attemptNumber} · ${result.timeSpentSeconds}s spent`}
        backTo={historyPath}
        backAriaLabel="Back to history"
      />

      <QuizAttemptResultBody result={result} answerLabel="Answer" />
    </div>
  );
}
