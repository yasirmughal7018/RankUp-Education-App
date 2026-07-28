import { useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useParentChildResultQuery } from "@/features/parent/presentation/hooks/useParentQueries";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";

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

  const reviewPending = Boolean(result.reviewPending);
  const scoreVisible = !reviewPending;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title={result.quizTitle}
        description={`Attempt #${result.attemptNumber} · ${result.timeSpentSeconds}s spent`}
        backTo={historyPath}
        backAriaLabel="Back to history"
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Score</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {scoreVisible
              ? `${result.obtainedMarks}/${result.totalMarks}`
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Percentage
          </p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">
            {scoreVisible ? `${result.percentage}%` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
          <div className="mt-2">
            <StatusBadge
              label={result.resultStatus}
              tone={getQuestionStatusTone(result.resultStatus, true)}
            />
          </div>
        </div>
      </section>

      {reviewPending ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Results are withheld until review is published. Final marks may change.
        </div>
      ) : null}

      {!reviewPending && !result.reviewAvailable ? (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Correct answers and explanations are not shown for this quiz.
        </div>
      ) : null}

      <div className="space-y-4">
        {result.questions.map((question, index) => (
          <section
            key={question.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Q{index + 1}. {question.text}
              </h2>
              {scoreVisible ? (
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                    question.isCorrect
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {question.awardedMarks}/{question.marks}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                  Pending
                </span>
              )}
            </div>

            {question.submittedText ? (
              <p className="text-sm text-slate-700">
                Answer: {question.submittedText}
              </p>
            ) : null}

            {question.explanation ? (
              <p className="mt-2 text-sm text-slate-600">{question.explanation}</p>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
