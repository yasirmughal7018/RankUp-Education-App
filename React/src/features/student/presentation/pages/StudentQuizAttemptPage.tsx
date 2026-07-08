import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import type {
  StartQuizAttempt,
  SubmitQuizAnswer,
} from "@/features/student/domain/studentQuizTypes";
import { isTextQuestionType } from "@/features/student/domain/studentQuizTypes";
import { useSubmitQuizAttemptMutation } from "@/features/student/presentation/hooks/useStudentQuizQueries";

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

const attemptStorageKey = (attemptId: number) => `rankup-quiz-attempt-${attemptId}`;
const answersStorageKey = (attemptId: number) =>
  `rankup-quiz-answers-${attemptId}`;
const startedAtStorageKey = (attemptId: number) =>
  `rankup-quiz-started-${attemptId}`;

function readStoredAttempt(attemptId: number): StartQuizAttempt | null {
  const raw = sessionStorage.getItem(attemptStorageKey(attemptId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StartQuizAttempt;
  } catch {
    return null;
  }
}

function readStoredAnswers(
  attemptId: number,
): Record<number, { selectedOptionId: number | null; submittedText: string }> {
  const raw = sessionStorage.getItem(answersStorageKey(attemptId));
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<
      number,
      { selectedOptionId: number | null; submittedText: string }
    >;
  } catch {
    return {};
  }
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function StudentQuizAttemptPage() {
  const { quizId, attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const numericQuizId = Number(quizId);
  const numericAttemptId = Number(attemptId);

  const attemptFromNavigation = (
    location.state as { attempt?: StartQuizAttempt } | null
  )?.attempt;

  const [attempt, setAttempt] = useState<StartQuizAttempt | null>(() => {
    if (attemptFromNavigation) {
      return attemptFromNavigation;
    }

    return readStoredAttempt(numericAttemptId);
  });

  const submitAttempt = useSubmitQuizAttemptMutation(
    numericQuizId,
    numericAttemptId,
  );

  const [answers, setAnswers] = useState<
    Record<number, { selectedOptionId: number | null; submittedText: string }>
  >(() => readStoredAnswers(numericAttemptId));

  const [startedAt] = useState(() => {
    const stored = sessionStorage.getItem(startedAtStorageKey(numericAttemptId));
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    const now = Date.now();
    if (numericAttemptId > 0) {
      sessionStorage.setItem(startedAtStorageKey(numericAttemptId), String(now));
    }
    return now;
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false);

  useEffect(() => {
    if (attemptFromNavigation) {
      sessionStorage.setItem(
        attemptStorageKey(attemptFromNavigation.attemptId),
        JSON.stringify(attemptFromNavigation),
      );
      setAttempt(attemptFromNavigation);
    }
  }, [attemptFromNavigation]);

  useEffect(() => {
    if (!attempt && numericAttemptId > 0) {
      const stored = readStoredAttempt(numericAttemptId);
      if (stored) {
        setAttempt(stored);
      }
    }
  }, [attempt, numericAttemptId]);

  const questions = attempt?.questions ?? [];

  useEffect(() => {
    if (questions.length === 0) {
      return;
    }

    setAnswers((current) => {
      if (Object.keys(current).length > 0) {
        return current;
      }

      return Object.fromEntries(
        questions.map((question) => [
          question.id,
          { selectedOptionId: null, submittedText: "" },
        ]),
      );
    });
  }, [questions]);

  useEffect(() => {
    if (numericAttemptId <= 0 || Object.keys(answers).length === 0) {
      return;
    }

    sessionStorage.setItem(answersStorageKey(numericAttemptId), JSON.stringify(answers));
  }, [answers, numericAttemptId]);

  const orderedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.displayOrder - b.displayOrder),
    [questions],
  );

  const timeLimitSeconds = attempt?.timeLimitMinutes
    ? attempt.timeLimitMinutes * 60
    : null;

  useEffect(() => {
    if (timeLimitSeconds == null) {
      setRemainingSeconds(null);
      return;
    }

    function tick() {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setRemainingSeconds(Math.max(0, (timeLimitSeconds ?? 0) - elapsed));
    }

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, timeLimitSeconds]);

  async function handleSubmit(isAuto = false) {
    if (submitAttempt.isPending) {
      return;
    }

    const payload: SubmitQuizAnswer[] = orderedQuestions.map((question) => ({
      questionId: question.id,
      selectedOptionId: answers[question.id]?.selectedOptionId ?? null,
      submittedText: answers[question.id]?.submittedText?.trim()
        ? answers[question.id].submittedText.trim()
        : null,
    }));

    const timeSpentSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAt) / 1000),
    );

    try {
      const result = await submitAttempt.mutateAsync({
        answers: payload,
        timeSpentSeconds,
      });
      sessionStorage.removeItem(attemptStorageKey(numericAttemptId));
      sessionStorage.removeItem(answersStorageKey(numericAttemptId));
      sessionStorage.removeItem(startedAtStorageKey(numericAttemptId));
      navigate(
        `/student/quizzes/${numericQuizId}/attempts/${result.attemptId}/result`,
        { state: isAuto ? { autoSubmitted: true } : undefined },
      );
    } catch {
      // Error surfaced via mutation state
    }
  }

  useEffect(() => {
    if (
      remainingSeconds === 0 &&
      timeLimitSeconds != null &&
      !autoSubmitTriggered &&
      orderedQuestions.length > 0
    ) {
      setAutoSubmitTriggered(true);
      void handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, timeLimitSeconds, autoSubmitTriggered, orderedQuestions.length]);

  if (!attempt) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Attempt not found"
          description="Start the quiz again from the quiz details page. In-progress attempts are restored from this browser session when available."
        />
        <Link
          to={`/student/quizzes/${quizId}`}
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to quiz
        </Link>
      </div>
    );
  }

  const timerUrgent =
    remainingSeconds != null && remainingSeconds <= 60;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Attempt #${attempt.attemptNumber}`}
        description={
          attempt.timeLimitMinutes
            ? `${attempt.timeLimitMinutes} minute time limit`
            : "Answer all questions and submit when ready."
        }
        action={
          remainingSeconds != null ? (
            <div
              className={`rounded-lg px-4 py-2 text-sm font-semibold tabular-nums ${
                timerUrgent
                  ? "bg-red-50 text-red-700"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {formatCountdown(remainingSeconds)}
            </div>
          ) : undefined
        }
      />

      {submitAttempt.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitAttempt.error.message}
        </div>
      ) : null}

      <div className="space-y-6">
        {orderedQuestions.map((question, index) => (
          <section
            key={question.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Q{index + 1}. {question.text}
              </h2>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                {question.marks} marks
              </span>
            </div>

            {question.hint ? (
              <p className="mb-3 text-xs text-slate-500">Hint: {question.hint}</p>
            ) : null}

            {isTextQuestionType(question.questionType) ? (
              <textarea
                rows={4}
                value={answers[question.id]?.submittedText ?? ""}
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: {
                      selectedOptionId: null,
                      submittedText: event.target.value,
                    },
                  }))
                }
                className={inputClassName}
                placeholder="Type your answer..."
              />
            ) : (
              <div className="space-y-2">
                {question.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      checked={answers[question.id]?.selectedOptionId === option.id}
                      onChange={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: {
                            selectedOptionId: option.id,
                            submittedText: "",
                          },
                        }))
                      }
                      className="mt-1"
                    />
                    <span className="flex-1 text-sm text-slate-700">
                      {option.text}
                      {option.imageUrl ? (
                        <img
                          src={option.imageUrl}
                          alt=""
                          className="mt-2 max-h-40 rounded-lg border border-slate-200 object-contain"
                        />
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          disabled={submitAttempt.isPending}
          onClick={() => void handleSubmit(false)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
        >
          {submitAttempt.isPending ? "Submitting..." : "Submit quiz"}
        </button>
        <Link
          to={`/student/quizzes/${quizId}`}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
