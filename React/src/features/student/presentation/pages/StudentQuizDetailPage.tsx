import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
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

  const { data: quiz, isLoading, error } = useStudentQuizDetailQuery(numericQuizId);
  const startAttempt = useStartQuizAttemptMutation(numericQuizId);

  async function handleStartAttempt() {
    try {
      const attempt = await startAttempt.mutateAsync();
      sessionStorage.setItem(
        `rankup-quiz-attempt-${attempt.attemptId}`,
        JSON.stringify(attempt),
      );

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
          attempt.savedAnswers.map((answer) => [
            answer.questionId,
            {
              selectedOptionId: answer.selectedOptionId,
              submittedText: answer.submittedText ?? "",
            },
          ]),
        );
        sessionStorage.setItem(
          `rankup-quiz-answers-${attempt.attemptId}`,
          JSON.stringify(hydrated),
        );
      }

      navigate(`/student/quizzes/${numericQuizId}/attempts/${attempt.attemptId}`, {
        state: { attempt },
      });
    } catch {
      // Error surfaced via mutation state
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
        />
        <Link
          to="/student/quizzes"
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to quizzes
        </Link>
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title={quiz.title}
        description={quiz.description || `${quiz.subject} · ${quiz.grade}`}
        action={
          <Link
            to="/student/quizzes"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back
          </Link>
        }
      />

      {startAttempt.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {startAttempt.error.message}
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
          </div>
        ) : null}
      </section>

      <button
        type="button"
        disabled={startAttempt.isPending || !canStart}
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
    </div>
  );
}
