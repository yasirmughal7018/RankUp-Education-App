import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  QuizNavigationMode,
  SavedQuizAnswer,
  StartQuizAttempt,
  SubmitQuizAnswer,
} from "@/features/student/domain/studentQuizTypes";
import {
  isMultiSelectQuestionType,
  isTextQuestionType,
} from "@/features/student/domain/studentQuizTypes";
import {
  clearOfflineQuizSyncQueue,
  enqueueOfflineQuizSync,
  isBrowserOffline,
} from "@/features/student/domain/offlineQuizSyncQueue";
import { STUDENT_DEVICE_ID } from "@/features/student/domain/studentQuizTypes";
import {
  useSubmitQuizAttemptMutation,
} from "@/features/student/presentation/hooks/useStudentQuizQueries";
import { useQuizAttemptAutosave } from "@/features/student/presentation/hooks/useQuizAttemptAutosave";
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
  const [timeWarning, setTimeWarning] = useState<string | null>(null);
  const [showLowTimeDialog, setShowLowTimeDialog] = useState(false);
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

  const warnedAt300Ref = useRef(false);
  const warnedAt60Ref = useRef(false);
  const focusLossDeltaRef = useRef(0);
  const clipboardPasteDeltaRef = useRef(0);
  const questionTimeSpentRef = useRef(questionTimeSpent);
  const answersRef = useRef(answers);
  const markedForReviewRef = useRef(markedForReview);
  const [expiredQuestionIds, setExpiredQuestionIds] = useState<Set<number>>(
    () => new Set(),
  );

  // Seed locked questions from already-exhausted per-question timers (resume).
  useEffect(() => {
    if (!attempt?.enablePerQuestionTimer) {
      return;
    }

    setExpiredQuestionIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const question of attempt.questions) {
        const estimated = Math.max(0, question.estimatedTimeSeconds ?? 0);
        if (estimated <= 0) {
          continue;
        }

        const spent = Math.max(
          question.timeSpentSeconds ?? 0,
          questionTimeSpentRef.current[question.id] ?? 0,
        );
        if (spent >= estimated && !next.has(question.id)) {
          next.add(question.id);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [attempt]);

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
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    markedForReviewRef.current = markedForReview;
  }, [markedForReview]);

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
      setShowLowTimeDialog(true);
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioCtx();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.value = 0.05;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        window.setTimeout(() => {
          oscillator.stop();
          void ctx.close();
        }, 180);
      } catch {
        // Audio is best-effort; visual modal remains.
      }
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
        const previous = currentTimes[current.id] ?? 0;
        const spent = showQuestionTimer
          ? Math.min(estimated, previous + 1)
          : previous + 1;
        const next = { ...currentTimes, [current.id]: spent };
        questionTimeSpentRef.current = next;

        if (showQuestionTimer) {
          const remaining = Math.max(0, estimated - spent);
          setQuestionRemainingSeconds(remaining);
          if (remaining <= 0) {
            setExpiredQuestionIds((ids) => {
              if (ids.has(current.id)) {
                return ids;
              }

              const next = new Set(ids);
              next.add(current.id);
              return next;
            });
          }
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

  const autoAdvancedQuestionIdsRef = useRef<Set<number>>(new Set());

  const buildDraftAnswers = useCallback(() => {
    const times = questionTimeSpentRef.current;
    const currentAnswers = answersRef.current;
    const currentReview = markedForReviewRef.current;
    return orderedQuestions.map((question) =>
      toSubmitAnswer(
        question.id,
        currentAnswers[question.id],
        currentReview[question.id],
        times[question.id] ?? 0,
      ),
    );
  }, [orderedQuestions]);

  const {
    statusLabel: draftStatus,
    isSaving: isDraftSaving,
    isOffline,
    pendingOfflineCount,
    markDirty,
    flush: persistDraft,
    flushRef,
    flushOfflineQueue,
  } = useQuizAttemptAutosave({
    enabled: Boolean(attempt) && orderedQuestions.length > 0,
    quizId: numericQuizId,
    attemptId: numericAttemptId,
    startedAt,
    isSubmitPending: submitAttempt.isPending,
    buildAnswers: buildDraftAnswers,
    focusLossDeltaRef,
    clipboardPasteDeltaRef,
    onBackground: () => {
      focusLossDeltaRef.current += 1;
      setFocusLossCount((count) => count + 1);
    },
    onSaved: (result) => {
      if (result.focusLossCount != null) {
        setFocusLossCount(result.focusLossCount);
      }
      if (result.clipboardPasteCount != null) {
        setClipboardPasteCount(result.clipboardPasteCount);
      }
    },
    onOfflineSubmitSynced: (result) => {
      clearOfflineQuizSyncQueue(numericAttemptId);
      sessionStorage.removeItem(attemptStorageKey(numericAttemptId));
      sessionStorage.removeItem(answersStorageKey(numericAttemptId));
      sessionStorage.removeItem(startedAtStorageKey(numericAttemptId));
      sessionStorage.removeItem(reviewStorageKey(numericAttemptId));
      sessionStorage.removeItem(questionTimeStorageKey(numericAttemptId));
      navigate(
        `/student/quizzes/${numericQuizId}/attempts/${result.attemptId}/result`,
        { state: { offlineSynced: true } },
      );
    },
  });

  const [offlineSubmitQueued, setOfflineSubmitQueued] = useState(false);

  // Lock + auto-advance once when a per-question timer first expires.
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

    setExpiredQuestionIds((ids) => {
      if (ids.has(current.id)) {
        return ids;
      }

      const next = new Set(ids);
      next.add(current.id);
      return next;
    });

    if (autoAdvancedQuestionIdsRef.current.has(current.id)) {
      return;
    }

    autoAdvancedQuestionIdsRef.current.add(current.id);

    if (currentIndex < orderedQuestions.length - 1) {
      setCurrentIndex((value) =>
        Math.min(orderedQuestions.length - 1, value + 1),
      );
      void flushRef.current(true);
      return;
    }

    // Last question expired — flush draft; quiz-level timer still owns auto-submit.
    void flushRef.current(true);
  }, [
    autoSubmitTriggered,
    currentIndex,
    enablePerQuestionTimer,
    flushRef,
    orderedQuestions,
    questionRemainingSeconds,
  ]);

  function handleAnswerPaste() {
    clipboardPasteDeltaRef.current += 1;
    setClipboardPasteCount((count) => count + 1);
    void persistDraft(true);
  }

  async function handleSubmit(isAuto = false) {
    if (submitAttempt.isPending || offlineSubmitQueued) {
      return;
    }

    // Flush the latest answers before final submit (especially important for timer auto-submit).
    await persistDraft(true);

    const times = questionTimeSpentRef.current;
    const payload: SubmitQuizAnswer[] = orderedQuestions.map((question) =>
      toSubmitAnswer(
        question.id,
        answersRef.current[question.id],
        markedForReviewRef.current[question.id],
        times[question.id] ?? 0,
      ),
    );

    const timeSpentSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAt) / 1000),
    );

    if (isBrowserOffline()) {
      enqueueOfflineQuizSync({
        quizId: numericQuizId,
        attemptId: numericAttemptId,
        answers: payload,
        timeSpentSeconds,
        deviceId: STUDENT_DEVICE_ID,
        submit: true,
        isAutoSubmit: isAuto,
        focusLossDelta: null,
        clipboardPasteDelta: null,
      });
      setOfflineSubmitQueued(true);
      return;
    }

    await flushOfflineQueue();

    try {
      const result = await submitAttempt.mutateAsync({
        answers: payload,
        timeSpentSeconds,
        isAutoSubmit: isAuto,
      });
      clearOfflineQuizSyncQueue(numericAttemptId);
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
      enqueueOfflineQuizSync({
        quizId: numericQuizId,
        attemptId: numericAttemptId,
        answers: payload,
        timeSpentSeconds,
        deviceId: STUDENT_DEVICE_ID,
        submit: true,
        isAutoSubmit: isAuto,
        focusLossDelta: null,
        clipboardPasteDelta: null,
      });
      setOfflineSubmitQueued(true);
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
    (navigationMode === "Free" || currentAnswered);
  const showIntegrity =
    focusLossCount > 0 || clipboardPasteCount > 0;
  const integrityLocked =
    focusLossCount >= 5 || clipboardPasteCount >= 3;
  const currentQuestionLocked =
    integrityLocked ||
    (Boolean(enablePerQuestionTimer) &&
    Boolean(currentQuestion) &&
    (currentQuestion?.estimatedTimeSeconds ?? 0) > 0 &&
    (expiredQuestionIds.has(currentQuestion!.id) ||
      (questionRemainingSeconds != null && questionRemainingSeconds <= 0)));

  function updateCurrentAnswer(next: AnswerState) {
    if (!currentQuestion || currentQuestionLocked) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: next,
    }));
    markDirty();
  }

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

      {integrityLocked ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Integrity limit exceeded (too many focus losses or paste events).
          Answers are locked — submit your attempt now.
        </div>
      ) : null}

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

      <Dialog open={showLowTimeDialog} onOpenChange={setShowLowTimeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Less than one minute left</DialogTitle>
            <DialogDescription>
              Submit soon — the quiz will auto-submit when time runs out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowLowTimeDialog(false)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Continue
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {submitAttempt.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitAttempt.error.message}
        </div>
      ) : null}

      {draftStatus ? (
        <div className="mb-4 text-xs text-slate-500">{draftStatus}</div>
      ) : null}

      {isOffline || pendingOfflineCount > 0 || offlineSubmitQueued ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {offlineSubmitQueued
            ? "Submit is queued on this device. It will sync automatically when you are back online."
            : isOffline
              ? "You are offline. Answers are saved on this device and will sync when the connection returns."
              : `${pendingOfflineCount} change(s) waiting to sync.`}
        </div>
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

          {currentQuestionLocked ? (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Time is up for this question. Your last in-time answer is locked.
            </p>
          ) : null}

          {isTextQuestionType(currentQuestion.questionType) ? (
            <textarea
              rows={4}
              value={currentAnswer?.submittedText ?? ""}
              disabled={currentQuestionLocked}
              onChange={(event) =>
                updateCurrentAnswer({
                  selectedOptionId: null,
                  selectedOptionIds: [],
                  submittedText: event.target.value,
                })
              }
              onPaste={currentQuestionLocked ? undefined : handleAnswerPaste}
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
                    className={`flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 ${
                      currentQuestionLocked
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type={multiSelect ? "checkbox" : "radio"}
                      name={`question-${currentQuestion.id}`}
                      checked={checked}
                      disabled={currentQuestionLocked}
                      onChange={() => {
                        if (currentQuestionLocked) {
                          return;
                        }

                        if (multiSelect) {
                          const existing =
                            currentAnswer?.selectedOptionIds ?? [];
                          const nextIds = existing.includes(option.id)
                            ? existing.filter((id) => id !== option.id)
                            : [...existing, option.id];
                          updateCurrentAnswer({
                            selectedOptionId: nextIds[0] ?? null,
                            selectedOptionIds: nextIds,
                            submittedText: "",
                          });
                          return;
                        }

                        updateCurrentAnswer({
                          selectedOptionId: option.id,
                          selectedOptionIds: [option.id],
                          submittedText: "",
                        });
                      }}
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
              disabled={currentQuestionLocked}
              onClick={() => {
                if (currentQuestionLocked) {
                  return;
                }

                setMarkedForReview((current) => ({
                  ...current,
                  [currentQuestion.id]: !current[currentQuestion.id],
                }));
                markDirty();
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
          disabled={isDraftSaving || submitAttempt.isPending}
          onClick={() => void persistDraft(true)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
        >
          {isDraftSaving ? "Saving..." : "Save now"}
        </button>
        <Link
          to={`/student/quizzes/${quizId}`}
          onClick={(event) => {
            event.preventDefault();
            void persistDraft(true).finally(() => {
              navigate(`/student/quizzes/${quizId}`);
            });
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
