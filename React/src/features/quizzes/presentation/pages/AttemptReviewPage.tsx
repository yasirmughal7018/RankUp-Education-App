import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import type { MarkAttemptAnswerInput } from "@/features/quizzes/domain/quizMonitorTypes";
import {
  useAttemptReviewQuery,
  useFinalizeAttemptReviewMutation,
  useMarkAttemptAnswersMutation,
} from "@/features/quizzes/presentation/hooks/useQuizQueries";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AttemptReviewPage() {
  const { quizId, attemptId } = useParams();
  const navigate = useNavigate();
  const numericQuizId = Number(quizId);
  const numericAttemptId = Number(attemptId);

  const { data: review, isLoading, error } = useAttemptReviewQuery(
    numericQuizId,
    numericAttemptId,
  );
  const markAnswers = useMarkAttemptAnswersMutation(
    numericQuizId,
    numericAttemptId,
  );
  const finalizeReview = useFinalizeAttemptReviewMutation(
    numericQuizId,
    numericAttemptId,
  );

  const [marks, setMarks] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!review) {
      return;
    }

    setMarks(
      Object.fromEntries(
        review.questions.map((question) => [
          question.questionId,
          question.awardedMarks,
        ]),
      ),
    );
    setFeedback(
      Object.fromEntries(
        review.questions.map((question) => [
          question.questionId,
          question.parentFeedback ?? "",
        ]),
      ),
    );
  }, [review]);

  function buildAnswers(): MarkAttemptAnswerInput[] {
    if (!review) {
      return [];
    }

    return review.questions.map((question) => ({
      questionId: question.questionId,
      awardedMarks: marks[question.questionId] ?? question.awardedMarks,
      feedback: feedback[question.questionId]?.trim() || null,
    }));
  }

  const isSubmitting = markAnswers.isPending || finalizeReview.isPending;

  async function handleSaveMarks() {
    if (!review) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);

    try {
      await markAnswers.mutateAsync(buildAnswers());
      setSuccessMessage("Marks saved.");
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to save marks.");
    }
  }

  async function handleFinalize() {
    if (!review) {
      return;
    }

    const confirmed = window.confirm(
      "Finalize this review? The student result will be locked.",
    );

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);

    try {
      await markAnswers.mutateAsync(buildAnswers());
      await finalizeReview.mutateAsync();
      navigate("/quizzes/reviews/pending");
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to finalize review.");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading attempt review...
      </div>
    );
  }

  if (!review) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Review not found"
          description={error?.message ?? "Unable to load attempt review."}
        />
        <Link
          to="/quizzes/reviews/pending"
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to pending reviews
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Review attempt #${review.attemptNumber}`}
        description={`${review.quizTitle} · ${review.studentName?.trim() || `Student ${review.studentId}`}`}
        action={
          <Link
            to="/quizzes/reviews/pending"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to list
          </Link>
        }
      />

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge
            label={review.status}
            tone={getQuestionStatusTone(review.status, !review.isReviewDone)}
          />
          {review.isReviewDone ? (
            <StatusBadge label="Finalized" tone="success" />
          ) : null}
        </div>

        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <p>Submitted: {formatDateTime(review.submittedAt)}</p>
          <p>
            Score: {review.obtainedMarks}/{review.totalMarks} ({review.percentage}
            %)
          </p>
        </div>
      </section>

      <div className="space-y-4">
        {review.questions.map((question, index) => (
          <article
            key={question.questionId}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {index + 1}. {question.questionText}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {question.questionType} · Max {question.maxMarks} marks
                  {question.requiresReview ? " · Requires review" : ""}
                </p>
              </div>
              {question.isCorrect ? (
                <StatusBadge label="Auto-correct" tone="success" />
              ) : null}
            </div>

            {question.submittedText ? (
              <div className="mb-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="mb-1 text-xs font-medium uppercase text-slate-500">
                  Student answer
                </p>
                {question.submittedText}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Awarded marks
                </label>
                <input
                  type="number"
                  min={0}
                  max={question.maxMarks}
                  value={marks[question.questionId] ?? 0}
                  disabled={review.isReviewDone || isSubmitting}
                  onChange={(event) =>
                    setMarks((current) => ({
                      ...current,
                      [question.questionId]: Number(event.target.value),
                    }))
                  }
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Feedback
                </label>
                <input
                  type="text"
                  value={feedback[question.questionId] ?? ""}
                  disabled={review.isReviewDone || isSubmitting}
                  onChange={(event) =>
                    setFeedback((current) => ({
                      ...current,
                      [question.questionId]: event.target.value,
                    }))
                  }
                  className={inputClassName}
                  placeholder="Optional feedback"
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      {!review.isReviewDone ? (
        <section className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleSaveMarks()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            {isSubmitting ? "Saving..." : "Save marks"}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleFinalize()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
          >
            Finalize review
          </button>
        </section>
      ) : null}
    </div>
  );
}
