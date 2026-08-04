import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import {
  isBrowserOffline,
  loadOfflineAttemptSession,
  persistOfflineAttemptSession,
} from "@/features/student/domain/offlineAttemptSession";
import { hasInProgressAttempt } from "@/features/student/domain/studentQuizTypes";
import {
  useStartQuizAttemptMutation,
  useStudentQuizDetailQuery,
} from "@/features/student/presentation/hooks/useStudentQuizQueries";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StudentQuizDetailPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const numericQuizId = Number(quizId);
  const [instructionsAcknowledged, setInstructionsAcknowledged] = useState(false);
  const [offlineStartError, setOfflineStartError] = useState<string | null>(null);

  const { data: quiz, isLoading, error } = useStudentQuizDetailQuery(numericQuizId);
  const startAttempt = useStartQuizAttemptMutation(numericQuizId);

  function hydrateLocalAnswers(attempt: {
    attemptId: number;
    resumed: boolean;
    startedAt: string;
    savedAnswers: Array<{
      questionId: number;
      selectedOptionId: number | null;
      selectedOptionIds?: number[] | null;
      submittedText: string | null;
    }>;
  }) {
    if (!attempt.resumed) {
      sessionStorage.setItem(
        `rankup-quiz-started-${attempt.attemptId}`,
        String(Date.now()),
      );
    } else if (
      !sessionStorage.getItem(`rankup-quiz-started-${attempt.attemptId}`)
    ) {
      const startedMs = Date.parse(attempt.startedAt);
      sessionStorage.setItem(
        `rankup-quiz-started-${attempt.attemptId}`,
        String(Number.isNaN(startedMs) ? Date.now() : startedMs),
      );
    }

    if (attempt.savedAnswers.length > 0) {
      const hydrated = Object.fromEntries(
        attempt.savedAnswers.map((answer) => {
          const selectedOptionIds =
            answer.selectedOptionIds && answer.selectedOptionIds.length > 0
              ? answer.selectedOptionIds
              : answer.selectedOptionId != null
                ? [answer.selectedOptionId]
                : [];
          return [
            answer.questionId,
            {
              selectedOptionId: selectedOptionIds[0] ?? null,
              selectedOptionIds,
              submittedText: answer.submittedText ?? "",
            },
          ];
        }),
      );
      sessionStorage.setItem(
        `rankup-quiz-answers-${attempt.attemptId}`,
        JSON.stringify(hydrated),
      );
    }
  }

  async function handleStartAttempt() {
    if (!quiz) {
      return;
    }

    setOfflineStartError(null);

    try {
      const requiresAck =
        !hasInProgressAttempt(quiz) && quiz.instructions.length > 0;
      if (requiresAck && !instructionsAcknowledged) {
        return;
      }

      if (isBrowserOffline()) {
        const cached = loadOfflineAttemptSession(numericQuizId);
        if (cached && hasInProgressAttempt(quiz)) {
          persistOfflineAttemptSession(cached);
          hydrateLocalAnswers(cached);
          navigate(
            `/student/quizzes/${numericQuizId}/attempts/${cached.attemptId}`,
            { state: { attempt: cached, offlineResume: true } },
          );
          return;
        }

        setOfflineStartError(
          cached
            ? "This quiz is not marked In Progress. Connect to start or continue."
            : "Connect to the internet to start a new quiz. You can resume offline only after starting on this device.",
        );
        return;
      }

      const attempt = await startAttempt.mutateAsync({
        instructionsAcknowledged: requiresAck ? instructionsAcknowledged : true,
      });
      persistOfflineAttemptSession(attempt);
      hydrateLocalAnswers(attempt);

      navigate(`/student/quizzes/${numericQuizId}/attempts/${attempt.attemptId}`, {
        state: { attempt },
      });
    } catch {
      // Error surfaced via mutation state — try cached resume as fallback.
      if (hasInProgressAttempt(quiz)) {
        const cached = loadOfflineAttemptSession(numericQuizId);
        if (cached) {
          persistOfflineAttemptSession(cached);
          hydrateLocalAnswers(cached);
          navigate(
            `/student/quizzes/${numericQuizId}/attempts/${cached.attemptId}`,
            { state: { attempt: cached, offlineResume: true } },
          );
          return;
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading quiz details...
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Quiz unavailable"
          description={error?.message ?? "Unable to load this quiz."}
          backTo="/student/quizzes"
          backAriaLabel="Back to quizzes"
        />
      </div>
    );
  }

  const attemptsRemaining =
    quiz.attemptLimit > 0
      ? Math.max(quiz.attemptLimit - quiz.attemptsUsed, 0)
      : null;
  const continueQuiz = hasInProgressAttempt(quiz);
  const canStart =
    continueQuiz || attemptsRemaining === null || attemptsRemaining > 0;
  const requiresInstructionsAck =
    !continueQuiz && quiz.instructions.length > 0;
  const canClickStart =
    canStart && (!requiresInstructionsAck || instructionsAcknowledged);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title={quiz.title}
        description={quiz.description || `${quiz.subject} · ${quiz.grade}`}
        backTo="/student/quizzes"
        backAriaLabel="Back to quizzes"
      />

      {startAttempt.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {startAttempt.error.message}
        </div>
      ) : null}

      {offlineStartError ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {offlineStartError}
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Questions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {quiz.questionCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total marks</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {quiz.totalMarks}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Time limit</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "No limit"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Attempts</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {quiz.attemptsUsed} used
            {attemptsRemaining != null ? ` · ${attemptsRemaining} left` : ""}
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge
            label={quiz.status}
            tone={getQuestionStatusTone(quiz.status, true)}
          />
          <StatusBadge
            label={quiz.resultStatus}
            tone={getQuestionStatusTone(quiz.resultStatus, true)}
          />
        </div>

        <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-900">Available from</dt>
            <dd>{formatDateTime(quiz.startAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Due</dt>
            <dd>{formatDateTime(quiz.dueAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Topic</dt>
            <dd>{quiz.topic}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Difficulty</dt>
            <dd>{quiz.difficulty}</dd>
          </div>
        </dl>

        {quiz.instructions.length > 0 ? (
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-slate-900">Instructions</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {quiz.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ul>
            {requiresInstructionsAck ? (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={instructionsAcknowledged}
                  onChange={(event) =>
                    setInstructionsAcknowledged(event.target.checked)
                  }
                  className="mt-0.5"
                />
                <span>
                  I have read and understand these instructions and am ready to
                  start the quiz.
                </span>
              </label>
            ) : null}
          </div>
        ) : null}
      </section>

      <button
        type="button"
        disabled={startAttempt.isPending || !canClickStart}
        onClick={() => void handleStartAttempt()}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
      >
        {startAttempt.isPending
          ? continueQuiz
            ? "Resuming..."
            : "Starting attempt..."
          : continueQuiz
            ? "Continue quiz"
            : "Start quiz"}
      </button>
      {requiresInstructionsAck && !instructionsAcknowledged ? (
        <p className="mt-2 text-center text-xs text-slate-500">
          Acknowledge the instructions above to start.
        </p>
      ) : null}
    </div>
  );
}
