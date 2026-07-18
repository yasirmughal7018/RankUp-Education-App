import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import type {
  SavedQuizAnswer,
  StartQuizAttempt,
  SubmitQuizAnswer,
} from "@/features/student/domain/studentQuizTypes";
import { isTextQuestionType } from "@/features/student/domain/studentQuizTypes";
import {
  useSaveQuizDraftMutation,
  useSubmitQuizAttemptMutation,
} from "@/features/student/presentation/hooks/useStudentQuizQueries";

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

type AnswerState = {
  selectedOptionId: number | null;
  submittedText: string;
};

const attemptStorageKey = (attemptId: number) => `rankup-quiz-attempt-${attemptId}`;
const answersStorageKey = (attemptId: number) =>
  `rankup-quiz-answers-${attemptId}`;
const startedAtStorageKey = (attemptId: number) =>
  `rankup-quiz-started-${attemptId}`;
const reviewStorageKey = (attemptId: number) =>
  `rankup-quiz-review-${attemptId}`;

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

function readStoredAnswers(attemptId: number): Record<number, AnswerState> {
  const raw = sessionStorage.getItem(answersStorageKey(attemptId));
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<number, AnswerState>;
  } catch {
    return {};
  }
}

function readStoredReviewFlags(attemptId: number): Record<number, boolean> {
  const raw = sessionStorage.getItem(reviewStorageKey(attemptId));
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<number, boolean>;
  } catch {
    return {};
  }
}

function hydrateAnswers(
  questions: StartQuizAttempt["questions"],
  savedAnswers: SavedQuizAnswer[] | undefined,
  stored: Record<number, AnswerState>,
): Record<number, AnswerState> {
  const fromSaved = Object.fromEntries(
    (savedAnswers ?? []).map((answer) => [
      answer.questionId,
      {
        selectedOptionId: answer.selectedOptionId,
        submittedText: answer.submittedText ?? "",
      },
    ]),
  );

  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      stored[question.id] ??
        fromSaved[question.id] ?? {
          selectedOptionId: null,
          submittedText: "",
        },
    ]),
  );
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isAnswered(answer: AnswerState | undefined): boolean {
  if (!answer) {
    return false;
  }

  return (
    answer.selectedOptionId != null || Boolean(answer.submittedText.trim())
  );
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
  const saveDraft = useSaveQuizDraftMutation(numericQuizId, numericAttemptId);

  const [answers, setAnswers] = useState<Record<number, AnswerState>>(() => {
    const initialAttempt = attemptFromNavigation ?? readStoredAttempt(numericAttemptId);
    if (!initialAttempt) {
      return readStoredAnswers(numericAttemptId);
    }

    return hydrateAnswers(
      initialAttempt.questions,
      initialAttempt.savedAnswers,
      readStoredAnswers(numericAttemptId),
    );
  });

  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>(
    () => readStoredReviewFlags(numericAttemptId),
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const answersDirtyRef = useRef(false);
  const lastSavedSnapshotRef = useRef("");

  const [startedAt] = useState(() => {
    const stored = sessionStorage.getItem(startedAtStorageKey(numericAttemptId));
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    const fromAttempt = attemptFromNavigation?.startedAt
      ? new Date(attemptFromNavigation.startedAt).getTime()
      : NaN;
    const now = !Number.isNaN(fromAttempt) ? fromAttempt : Date.now();
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
      setAnswers(
        hydrateAnswers(
          attemptFromNavigation.questions,
          attemptFromNavigation.savedAnswers,
          readStoredAnswers(attemptFromNavigation.attemptId),
        ),
      );
    }
  }, [attemptFromNavigation]);

  useEffect(() => {
    if (!attempt && numericAttemptId > 0) {
      const stored = readStoredAttempt(numericAttemptId);
      if (stored) {
        setAttempt(stored);
        setAnswers(
          hydrateAnswers(
            stored.questions,
            stored.savedAnswers,
            readStoredAnswers(numericAttemptId),
          ),
        );
      }
    }
  }, [attempt, numericAttemptId]);

  const questions = attempt?.questions ?? [];

  const orderedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.displayOrder - b.displayOrder),
    [questions],
  );

  useEffect(() => {
    if (orderedQuestions.length === 0) {
      return;
    }

    setCurrentIndex((current) =>
      Math.min(Math.max(current, 0), orderedQuestions.length - 1),
    );
  }, [orderedQuestions.length]);

  useEffect(() => {
    if (numericAttemptId <= 0 || Object.keys(answers).length === 0) {
      return;
    }

    sessionStorage.setItem(answersStorageKey(numericAttemptId), JSON.stringify(answers));
    answersDirtyRef.current = true;
  }, [answers, numericAttemptId]);

  useEffect(() => {
    if (numericAttemptId <= 0) {
      return;
    }

    sessionStorage.setItem(
      reviewStorageKey(numericAttemptId),
      JSON.stringify(markedForReview),
    );
  }, [markedForReview, numericAttemptId]);

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

  async function persistDraft(force = false) {
    if (
      !attempt ||
      orderedQuestions.length === 0 ||
      saveDraft.isPending ||
      submitAttempt.isPending
    ) {
      return;
    }

    if (!force && !answersDirtyRef.current) {
      return;
    }

    const payload: SubmitQuizAnswer[] = orderedQuestions.map((question) => ({
      questionId: question.id,
      selectedOptionId: answers[question.id]?.selectedOptionId ?? null,
      submittedText: answers[question.id]?.submittedText?.trim()
        ? answers[question.id].submittedText.trim()
        : null,
    }));

    const snapshot = JSON.stringify(payload);
    if (!force && snapshot === lastSavedSnapshotRef.current) {
      answersDirtyRef.current = false;
      return;
    }

    const timeSpentSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAt) / 1000),
    );

    try {
      await saveDraft.mutateAsync({
        answers: payload,
        timeSpentSeconds,
      });
      lastSavedSnapshotRef.current = snapshot;
      answersDirtyRef.current = false;
      setDraftStatus("Draft saved");
    } catch {
      setDraftStatus("Draft save failed");
    }
  }

  useEffect(() => {
    if (!attempt || orderedQuestions.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      void persistDraft();
    }, 15000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, orderedQuestions.length, answers, startedAt]);

  useEffect(() => {
    if (!attempt || orderedQuestions.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistDraft();
    }, 1200);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

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
      sessionStorage.removeItem(reviewStorageKey(numericAttemptId));
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

  const timerUrgent = remainingSeconds != null && remainingSeconds <= 60;
  const currentQuestion = orderedQuestions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Attempt #${attempt.attemptNumber}`}
        description={
          attempt.resumed
            ? "Continuing your in-progress attempt."
            : attempt.timeLimitMinutes
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

      {draftStatus ? (
        <div className="mb-4 text-xs text-slate-500">{draftStatus}</div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {orderedQuestions.map((question, index) => {
          const answered = isAnswered(answers[question.id]);
          const flagged = Boolean(markedForReview[question.id]);
          const active = index === currentIndex;

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`h-9 min-w-9 rounded-lg border px-2 text-xs font-medium transition ${
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : flagged
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : answered
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      {currentQuestion ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Q{currentIndex + 1}. {currentQuestion.text}
            </h2>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {currentQuestion.marks} marks
            </span>
          </div>

          {currentQuestion.hint ? (
            <p className="mb-3 text-xs text-slate-500">
              Hint: {currentQuestion.hint}
            </p>
          ) : null}

          {isTextQuestionType(currentQuestion.questionType) ? (
            <textarea
              rows={4}
              value={currentAnswer?.submittedText ?? ""}
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  [currentQuestion.id]: {
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
              {currentQuestion.options.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    checked={currentAnswer?.selectedOptionId === option.id}
                    onChange={() =>
                      setAnswers((current) => ({
                        ...current,
                        [currentQuestion.id]: {
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setMarkedForReview((current) => ({
                  ...current,
                  [currentQuestion.id]: !current[currentQuestion.id],
                }))
              }
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                markedForReview[currentQuestion.id]
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {markedForReview[currentQuestion.id]
                ? "Marked for review"
                : "Mark for review"}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentIndex >= orderedQuestions.length - 1}
                onClick={() =>
                  setCurrentIndex((value) =>
                    Math.min(orderedQuestions.length - 1, value + 1),
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          disabled={submitAttempt.isPending}
          onClick={() => void handleSubmit(false)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
        >
          {submitAttempt.isPending ? "Submitting..." : "Submit quiz"}
        </button>
        <button
          type="button"
          disabled={saveDraft.isPending || submitAttempt.isPending}
          onClick={() => void persistDraft(true)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
        >
          {saveDraft.isPending ? "Saving..." : "Save draft"}
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
