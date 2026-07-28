import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
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
          backTo="/student/quizzes"
          backAriaLabel="Back to quizzes"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title={result.quizTitle}
        description={`Attempt #${result.attemptNumber} · ${result.timeSpentSeconds}s spent`}
        backTo={`/student/quizzes/${quizId}`}
        backAriaLabel="Back to quiz"
        action={
          <Link
            to="/student/quizzes"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            All quizzes
          </Link>
        }
      />

      <QuizAttemptResultBody result={result} />
    </div>
  );
}
