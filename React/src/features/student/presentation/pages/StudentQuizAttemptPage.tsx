import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import type {
  QuizNavigationMode,
  SavedQuizAnswer,
  StartQuizAttempt,
  SubmitQuizAnswer,
} from "@/features/student/domain/studentQuizTypes";
import {
  isMultiSelectQuestionType,
  isTextQuestionType,
  STUDENT_DEVICE_ID,
} from "@/features/student/domain/studentQuizTypes";
import {
  useSaveQuizDraftMutation,
  useSubmitQuizAttemptMutation,
} from "@/features/student/presentation/hooks/useStudentQuizQueries";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

const inputClassName = FORM_FIELD_CLASS;

type AnswerState = {
  selectedOptionId: number | null;
  selectedOptionIds: number[];
  submittedText: string;
};

const attemptStorageKey = (attemptId: number) => `rankup-quiz-attempt-${attemptId}`;
const answersStorageKey = (attemptId: number) =>
  `rankup-quiz-answers-${attemptId}`;
const startedAtStorageKey = (attemptId: number) =>
  `rankup-quiz-started-${attemptId}`;
const reviewStorageKey = (attemptId: number) =>
  `rankup-quiz-review-${attemptId}`;
const questionTimeStorageKey = (attemptId: number) =>
  `rankup-quiz-question-time-${attemptId}`;

function normalizeNavigationMode(
  value: string | null | undefined,
): QuizNavigationMode {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "sequential") {
    return "Sequential";
  }
  if (normalized === "locked") {
    return "Locked";
  }
  return "Free";
}

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

function readStoredQuestionTimes(attemptId: number): Record<number, number> {
  const raw = sessionStorage.getItem(questionTimeStorageKey(attemptId));
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<number, number>;
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
    (savedAnswers ?? []).map((answer) => {
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

  return Object.fromEntries(
    questions.map((question) => {
      const existing = stored[question.id] ?? fromSaved[question.id];
      if (!existing) {
        return [
          question.id,
          {
            selectedOptionId: null,
            selectedOptionIds: [],
            submittedText: "",
          },
        ];
      }

      const selectedOptionIds =
        existing.selectedOptionIds ??
        (existing.selectedOptionId != null ? [existing.selectedOptionId] : []);

      return [
        question.id,
        {
          selectedOptionId: selectedOptionIds[0] ?? null,
          selectedOptionIds,
          submittedText: existing.submittedText ?? "",
        },
      ];
    }),
  );
}

function hydrateReviewFlags(
  questions: StartQuizAttempt["questions"],
  savedAnswers: SavedQuizAnswer[] | undefined,
  stored: Record<number, boolean>,
): Record<number, boolean> {
  const fromSaved = Object.fromEntries(
    (savedAnswers ?? []).map((answer) => [
      answer.questionId,
      Boolean(answer.isMarkedForReview),
    ]),
  );

  return Object.fromEntries(
    questions.map((question) => {
      const flagged = stored[question.id] ?? fromSaved[question.id] ?? false;
      return [question.id, flagged];
    }),
  );
}

function hydrateQuestionTimes(
  questions: StartQuizAttempt["questions"],
  stored: Record<number, number>,
): Record<number, number> {
  return Object.fromEntries(
    questions.map((question) => {
      const fromServer = Math.max(0, question.timeSpentSeconds ?? 0);
      const fromStored = Math.max(0, stored[question.id] ?? 0);
      return [question.id, Math.max(fromServer, fromStored)];
    }),
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
    (answer.selectedOptionIds?.length ?? 0) > 0 ||
    answer.selectedOptionId != null ||
    Boolean(answer.submittedText.trim())
  );
}

function toSubmitAnswer(
  questionId: number,
  answer: AnswerState | undefined,
  isMarkedForReview?: boolean,
  timeSpentSeconds?: number,
): SubmitQuizAnswer {
  const selectedOptionIds = answer?.selectedOptionIds ?? [];
  const selectedOptionId =
    selectedOptionIds[0] ?? answer?.selectedOptionId ?? null;
  const submittedText = answer?.submittedText?.trim()
    ? answer.submittedText.trim()
    : null;

  return {
    questionId,
    selectedOptionId,
    submittedText,
    selectedOptionIds: selectedOptionIds.length > 0 ? selectedOptionIds : null,
    isMarkedForReview: Boolean(isMarkedForReview),
    timeSpentSeconds:
      timeSpentSeconds != null && timeSpentSeconds > 0
        ? Math.round(timeSpentSeconds)
        : null,
  };
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
    () => {
      const initialAttempt =
        attemptFromNavigation ?? readStoredAttempt(numericAttemptId);
      if (!initialAttempt) {
        return readStoredReviewFlags(numericAttemptId);
      }

      return hydrateReviewFlags(
        initialAttempt.questions,
        initialAttempt.savedAnswers,
        readStoredReviewFlags(numericAttemptId),
      );
    },
  );

  const [questionTimeSpent, setQuestionTimeSpent] = useState<
    Record<number, number>
  >(() => {
    const initialAttempt =
      attemptFromNavigation ?? readStoredAttempt(numericAttemptId);
    if (!initialAttempt) {
      return readStoredQuestionTimes(numericAttemptId);
    }

    return hydrateQuestionTimes(
      initialAttempt.questions,
      readStoredQuestionTimes(numericAttemptId),
    );
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const [timeWarning, setTimeWarning] = useState<string | null>(null);
  const [focusLossCount, setFocusLossCount] = useState(
    () =>
      attemptFromNavigation?.focusLossCount ??
      readStoredAttempt(numericAttemptId)?.focusLossCount ??
      0,
  );
  const [clipboardPasteCount, setClipboardPasteCount] = useState(
    () =>
      attemptFromNavigation?.clipboardPasteCount ??
      readStoredAttempt(numericAttemptId)?.clipboardPasteCount ??
      0,
  );
  const [questionRemainingSeconds, setQuestionRemainingSeconds] = useState<
    number | null
  >(null);

  const answersDirtyRef = useRef(false);
  const lastSavedSnapshotRef = useRef("");
  const warnedAt300Ref = useRef(false);
  const warnedAt60Ref = useRef(false);
  const focusLossDeltaRef = useRef(0);
  const clipboardPasteDeltaRef = useRef(0);
  const questionTimeSpentRef = useRef(questionTimeSpent);
  const expiredQuestionIdsRef = useRef<Set<number>>(new Set());
  const persistDraftRef = useRef<(force?: boolean) => Promise<void>>(
    async () => undefined,
  );

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
    questionTimeSpentRef.current = questionTimeSpent;
  }, [questionTimeSpent]);

  useEffect(() => {
    if (attemptFromNavigation) {
      sessionStorage.setItem(
        attemptStorageKey(attemptFromNavigation.attemptId),
        JSON.stringify(attemptFromNavigation),
      );
      setAttempt(attemptFromNavigation);
      setFocusLossCount(attemptFromNavigation.focusLossCount ?? 0);
      setClipboardPasteCount(attemptFromNavigation.clipboardPasteCount ?? 0);
      setAnswers(
        hydrateAnswers(
          attemptFromNavigation.questions,
          attemptFromNavigation.savedAnswers,
          readStoredAnswers(attemptFromNavigation.attemptId),
        ),
      );
      setMarkedForReview(
        hydrateReviewFlags(
          attemptFromNavigation.questions,
          attemptFromNavigation.savedAnswers,
          readStoredReviewFlags(attemptFromNavigation.attemptId),
        ),
      );
      setQuestionTimeSpent(
        hydrateQuestionTimes(
          attemptFromNavigation.questions,
          readStoredQuestionTimes(attemptFromNavigation.attemptId),
        ),
      );
    }
  }, [attemptFromNavigation]);

  useEffect(() => {
    if (!attempt && numericAttemptId > 0) {
      const stored = readStoredAttempt(numericAttemptId);
      if (stored) {
        setAttempt(stored);
        setFocusLossCount(stored.focusLossCount ?? 0);
        setClipboardPasteCount(stored.clipboardPasteCount ?? 0);
        setAnswers(
          hydrateAnswers(
            stored.questions,
            stored.savedAnswers,
            readStoredAnswers(numericAttemptId),
          ),
        );
        setMarkedForReview(
          hydrateReviewFlags(
            stored.questions,
            stored.savedAnswers,
            readStoredReviewFlags(numericAttemptId),
          ),
        );
        setQuestionTimeSpent(
          hydrateQuestionTimes(
            stored.questions,
            readStoredQuestionTimes(numericAttemptId),
          ),
        );
      }
    }
  }, [attempt, numericAttemptId]);

  const questions = attempt?.questions ?? [];
  const navigationMode = normalizeNavigationMode(attempt?.navigationMode);
  const enablePerQuestionTimer = Boolean(attempt?.enablePerQuestionTimer);

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
    answersDirtyRef.current = true;
  }, [markedForReview, numericAttemptId]);

  useEffect(() => {
    if (numericAttemptId <= 0 || Object.keys(questionTimeSpent).length === 0) {
      return;
    }

    sessionStorage.setItem(
      questionTimeStorageKey(numericAttemptId),
      JSON.stringify(questionTimeSpent),
    );
  }, [questionTimeSpent, numericAttemptId]);

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

  useEffect(() => {
    if (remainingSeconds == null) {
      return;
    }

    if (remainingSeconds <= 300 && remainingSeconds > 60 && !warnedAt300Ref.current) {
      warnedAt300Ref.current = true;
      setTimeWarning("5 minutes remaining. Wrap up and review your answers.");
    }

    if (remainingSeconds <= 60 && !warnedAt60Ref.current) {
      warnedAt60Ref.current = true;
      setTimeWarning("Less than 1 minute remaining. Submit soon — auto-submit is imminent.");
    }
  }, [remainingSeconds]);

  // Accumulate per-question time and drive per-question countdown.
  useEffect(() => {
    const current = orderedQuestions[currentIndex];
    if (!current || autoSubmitTriggered) {
      setQuestionRemainingSeconds(null);
      return;
    }

    const estimated = Math.max(0, current.estimatedTimeSeconds ?? 0);
    const showQuestionTimer = enablePerQuestionTimer && estimated > 0;

    function tickQuestionTime() {
      setQuestionTimeSpent((currentTimes) => {
        const spent = (currentTimes[current.id] ?? 0) + 1;
        const next = { ...currentTimes, [current.id]: spent };
        questionTimeSpentRef.current = next;

        if (showQuestionTimer) {
          setQuestionRemainingSeconds(Math.max(0, estimated - spent));
        }

        return next;
      });
    }

    if (showQuestionTimer) {
      const spent = questionTimeSpentRef.current[current.id] ?? 0;
      setQuestionRemainingSeconds(Math.max(0, estimated - spent));
    } else {
      setQuestionRemainingSeconds(null);
    }

    const timer = window.setInterval(tickQuestionTime, 1000);
    return () => window.clearInterval(timer);
  }, [
    autoSubmitTriggered,
    currentIndex,
    enablePerQuestionTimer,
    orderedQuestions,
  ]);

  // Auto-advance once when a per-question timer first expires.
  useEffect(() => {
    const current = orderedQuestions[currentIndex];
    if (
      !current ||
      !enablePerQuestionTimer ||
      (current.estimatedTimeSeconds ?? 0) <= 0 ||
      questionRemainingSeconds == null ||
      questionRemainingSeconds > 0 ||
      autoSubmitTriggered
    ) {
      return;
    }

    if (expiredQuestionIdsRef.current.has(current.id)) {
      return;
    }

    expiredQuestionIdsRef.current.add(current.id);

    if (currentIndex < orderedQuestions.length - 1) {
      setCurrentIndex((value) =>
        Math.min(orderedQuestions.length - 1, value + 1),
      );
      void persistDraftRef.current(true);
      return;
    }

    // Last question expired — flush draft; quiz-level timer still owns auto-submit.
    void persistDraftRef.current(true);
  }, [
    autoSubmitTriggered,
    currentIndex,
    enablePerQuestionTimer,
    orderedQuestions,
    questionRemainingSeconds,
  ]);

  async function persistDraft(force = false) {
    if (
      !attempt ||
      orderedQuestions.length === 0 ||
      saveDraft.isPending ||
      submitAttempt.isPending
    ) {
      return;
    }

    const focusLossDelta = focusLossDeltaRef.current;
    const clipboardPasteDelta = clipboardPasteDeltaRef.current;
    const hasIntegrityDelta = focusLossDelta > 0 || clipboardPasteDelta > 0;

    if (!force && !answersDirtyRef.current && !hasIntegrityDelta) {
      return;
    }

    const times = questionTimeSpentRef.current;
    const payload: SubmitQuizAnswer[] = orderedQuestions.map((question) =>
      toSubmitAnswer(
        question.id,
        answers[question.id],
        markedForReview[question.id],
        times[question.id] ?? 0,
      ),
    );

    const snapshot = JSON.stringify({
      answers: payload,
      focusLossDelta,
      clipboardPasteDelta,
    });
    if (!force && !hasIntegrityDelta && snapshot === lastSavedSnapshotRef.current) {
      answersDirtyRef.current = false;
      return;
    }

    const timeSpentSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAt) / 1000),
    );

    // Claim deltas before await so concurrent events accumulate separately.
    focusLossDeltaRef.current = 0;
    clipboardPasteDeltaRef.current = 0;

    try {
      const result = await saveDraft.mutateAsync({
        answers: payload,
        timeSpentSeconds,
        focusLossDelta: focusLossDelta > 0 ? focusLossDelta : null,
        clipboardPasteDelta: clipboardPasteDelta > 0 ? clipboardPasteDelta : null,
        deviceId: STUDENT_DEVICE_ID,
      });
      lastSavedSnapshotRef.current = snapshot;
      answersDirtyRef.current = false;
      if (result.focusLossCount != null) {
        setFocusLossCount(result.focusLossCount);
      }
      if (result.clipboardPasteCount != null) {
        setClipboardPasteCount(result.clipboardPasteCount);
      }
      setDraftStatus("Draft saved");
    } catch {
      // Restore unsent deltas so the next flush retries them.
      focusLossDeltaRef.current += focusLossDelta;
      clipboardPasteDeltaRef.current += clipboardPasteDelta;
      setDraftStatus("Draft save failed");
    }
  }

  persistDraftRef.current = persistDraft;

  useEffect(() => {
    if (!attempt || orderedQuestions.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      void persistDraft();
    }, 15000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, orderedQuestions.length, answers, markedForReview, startedAt]);

  useEffect(() => {
    if (!attempt || orderedQuestions.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistDraft();
    }, 1200);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, markedForReview]);

  useEffect(() => {
    if (!attempt || orderedQuestions.length === 0) {
      return;
    }

    function onVisibilityChange() {
      if (document.hidden) {
        focusLossDeltaRef.current += 1;
        setFocusLossCount((count) => count + 1);
        void persistDraftRef.current(true);
      }
    }

    function onPageHide() {
      void persistDraftRef.current(true);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [attempt, orderedQuestions.length]);

  function handleAnswerPaste() {
    clipboardPasteDeltaRef.current += 1;
    setClipboardPasteCount((count) => count + 1);
    void persistDraftRef.current(true);
  }

  async function handleSubmit(isAuto = false) {
    if (submitAttempt.isPending) {
      return;
    }

    // Flush the latest answers before final submit (especially important for timer auto-submit).
    await persistDraft(true);

    const times = questionTimeSpentRef.current;
    const payload: SubmitQuizAnswer[] = orderedQuestions.map((question) =>
      toSubmitAnswer(
        question.id,
        answers[question.id],
        markedForReview[question.id],
        times[question.id] ?? 0,
      ),
    );

    const timeSpentSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAt) / 1000),
    );

    try {
      const result = await submitAttempt.mutateAsync({
        answers: payload,
        timeSpentSeconds,
        isAutoSubmit: isAuto,
      });
      sessionStorage.removeItem(attemptStorageKey(numericAttemptId));
      sessionStorage.removeItem(answersStorageKey(numericAttemptId));
      sessionStorage.removeItem(startedAtStorageKey(numericAttemptId));
      sessionStorage.removeItem(reviewStorageKey(numericAttemptId));
      sessionStorage.removeItem(questionTimeStorageKey(numericAttemptId));
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
          backTo={`/student/quizzes/${quizId}`}
          backAriaLabel="Back to quiz"
        />
      </div>
    );
  }

  const timerUrgent = remainingSeconds != null && remainingSeconds <= 60;
  const questionTimerUrgent =
    questionRemainingSeconds != null && questionRemainingSeconds <= 10;
  const currentQuestion = orderedQuestions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;
  const currentAnswered = isAnswered(currentAnswer);
  const canJumpByNumber = navigationMode === "Free";
  const canGoPrevious = navigationMode !== "Locked" && currentIndex > 0;
  const canGoNext =
    currentIndex < orderedQuestions.length - 1 &&
    (navigationMode !== "Locked" || currentAnswered);
  const showIntegrity =
    focusLossCount > 0 || clipboardPasteCount > 0;

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
          <div className="flex flex-col items-end gap-1">
            {remainingSeconds != null ? (
              <div
                className={`rounded-lg px-4 py-2 text-sm font-semibold tabular-nums ${
                  timerUrgent
                    ? "bg-red-50 text-red-700"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {formatCountdown(remainingSeconds)}
              </div>
            ) : null}
            {questionRemainingSeconds != null ? (
              <div
                className={`rounded-md px-2.5 py-1 text-xs font-medium tabular-nums ${
                  questionTimerUrgent
                    ? "bg-amber-50 text-amber-800"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                Question {formatCountdown(questionRemainingSeconds)}
              </div>
            ) : null}
            {showIntegrity ? (
              <p className="text-[11px] text-slate-400">
                Focus leaves {focusLossCount}
                {clipboardPasteCount > 0
                  ? ` · Pastes ${clipboardPasteCount}`
                  : ""}
              </p>
            ) : null}
          </div>
        }
      />

      {timeWarning ? (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>{timeWarning}</span>
          <button
            type="button"
            onClick={() => setTimeWarning(null)}
            className="shrink-0 text-xs font-medium text-amber-800 hover:text-amber-950"
          >
            Dismiss
          </button>
        </div>
      ) : null}

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
          const jumpDisabled = !canJumpByNumber && !active;

          return (
            <button
              key={question.id}
              type="button"
              disabled={jumpDisabled}
              onClick={() => {
                if (canJumpByNumber) {
                  setCurrentIndex(index);
                }
              }}
              className={`h-9 min-w-9 rounded-lg border px-2 text-xs font-medium transition ${
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : flagged
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : answered
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white`}
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
                    selectedOptionIds: [],
                    submittedText: event.target.value,
                  },
                }))
              }
              onPaste={handleAnswerPaste}
              className={inputClassName}
              placeholder="Type your answer..."
            />
          ) : (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => {
                const multiSelect = isMultiSelectQuestionType(
                  currentQuestion.questionType,
                );
                const selectedIds = currentAnswer?.selectedOptionIds ?? [];
                const checked = multiSelect
                  ? selectedIds.includes(option.id)
                  : currentAnswer?.selectedOptionId === option.id;

                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                  >
                    <input
                      type={multiSelect ? "checkbox" : "radio"}
                      name={`question-${currentQuestion.id}`}
                      checked={checked}
                      onChange={() =>
                        setAnswers((current) => {
                          if (multiSelect) {
                            const existing =
                              current[currentQuestion.id]?.selectedOptionIds ??
                              [];
                            const nextIds = existing.includes(option.id)
                              ? existing.filter((id) => id !== option.id)
                              : [...existing, option.id];
                            return {
                              ...current,
                              [currentQuestion.id]: {
                                selectedOptionId: nextIds[0] ?? null,
                                selectedOptionIds: nextIds,
                                submittedText: "",
                              },
                            };
                          }

                          return {
                            ...current,
                            [currentQuestion.id]: {
                              selectedOptionId: option.id,
                              selectedOptionIds: [option.id],
                              submittedText: "",
                            },
                          };
                        })
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
                );
              })}
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
                disabled={!canGoPrevious}
                onClick={() =>
                  setCurrentIndex((value) => Math.max(0, value - 1))
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!canGoNext}
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
