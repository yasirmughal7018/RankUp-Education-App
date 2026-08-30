import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { formatAnnouncedResultsLabel } from "@/features/student/domain/quizResultDisplay";
import {
  classifyStudentQuiz,
  hasInProgressAttempt,
} from "@/features/student/domain/studentQuizTypes";
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

    const bucket = classifyStudentQuiz(
      {
        id: quiz.id,
        resultStatus: quiz.resultStatus,
        status: quiz.status,
        startAt: quiz.startAt,
        dueAt: quiz.dueAt,
        lastAttemptId: quiz.lastAttemptId,
      },
      new Date(),
    );
    if (bucket === "upcoming" || bucket === "expired") {
      return;
    }

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

  const announcedLabel = formatAnnouncedResultsLabel(
    quiz.resultAnnouncedPercent,
  );
  const attemptsRemaining =
    quiz.attemptLimit > 0
      ? Math.max(quiz.attemptLimit - quiz.attemptsUsed, 0)
      : null;
  const continueQuiz = hasInProgressAttempt(quiz);
  const bucket = classifyStudentQuiz(
    {
      id: quiz.id,
      resultStatus: quiz.resultStatus,
      status: quiz.status,
      startAt: quiz.startAt,
      dueAt: quiz.dueAt,
      lastAttemptId: quiz.lastAttemptId,
    },
    new Date(),
  );
  const settingsOnly = bucket === "upcoming" || bucket === "expired";
  const canStart =
    !settingsOnly &&
    (continueQuiz || attemptsRemaining === null || attemptsRemaining > 0);
  const requiresInstructionsAck =
    !continueQuiz && quiz.instructions.length > 0;
  const canClickStart =
    canStart && (!requiresInstructionsAck || instructionsAcknowledged);
  const resultPath =
    quiz.lastAttemptId != null
      ? `/student/quizzes/${quiz.id}/attempts/${quiz.lastAttemptId}/result`
      : null;

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
            {quiz.questionsPerAttempt != null &&
            quiz.questionsPerAttempt < quiz.questionCount
              ? `${quiz.questionsPerAttempt} of ${quiz.questionCount}`
              : quiz.questionCount}
          </p>
          {quiz.questionsPerAttempt != null &&
          quiz.questionsPerAttempt < quiz.questionCount ? (
            <p className="mt-1 text-xs text-slate-500">
              Random subset per attempt
            </p>
          ) : null}
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
          {announcedLabel ? (
            <StatusBadge label={announcedLabel} status="pending" />
          ) : null}
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
            {requiresInstructionsAck && canStart ? (
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

      {bucket === "upcoming" ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This quiz is upcoming. You can review the settings now. Questions stay
          hidden until it opens {formatDateTime(quiz.startAt)}.
        </p>
      ) : null}

      {bucket === "expired" ? (
        <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          This quiz has ended. You can review the settings, but questions are not
          available.
        </p>
      ) : null}

      {quiz.attempts && quiz.attempts.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Your attempts
            </h2>
            <p className="text-xs font-semibold tabular-nums text-slate-500">
              {quiz.attempts.length}{" "}
              {quiz.attempts.length === 1 ? "attempt" : "attempts"}
            </p>
          </div>
          <ul className="space-y-2">
            {quiz.attempts.map((attempt) => {
              const resultTo = `/student/quizzes/${quiz.id}/attempts/${attempt.attemptId}/result`;
              const showScore = quiz.resultPercent != null;
              return (
                <li key={attempt.attemptId}>
                  <Link
                    to={resultTo}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-brand-300 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        Attempt #{attempt.attemptNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(attempt.submittedAt)}
                        {showScore ? ` · ${attempt.percentage}%` : ""}
                      </p>
                    </div>
                    <StatusBadge
                      label={attempt.status}
                      tone={getQuestionStatusTone(attempt.status, true)}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        {bucket === "attempted" && resultPath ? (
          <Button className="flex-1" asChild>
            <Link to={resultPath}>View last result</Link>
          </Button>
        ) : null}

        {canStart ? (
          <button
            type="button"
            disabled={startAttempt.isPending || !canClickStart}
            onClick={() => void handleStartAttempt()}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
          >
            {startAttempt.isPending
              ? continueQuiz
                ? "Resuming..."
                : "Starting attempt..."
              : continueQuiz
                ? "Continue quiz"
                : bucket === "attempted"
                  ? "Start another attempt"
                  : "Start quiz"}
          </button>
        ) : null}
      </div>
      {canStart && requiresInstructionsAck && !instructionsAcknowledged ? (
        <p className="mt-2 text-center text-xs text-slate-500">
          Acknowledge the instructions above to start.
        </p>
      ) : null}
    </div>
  );
}
