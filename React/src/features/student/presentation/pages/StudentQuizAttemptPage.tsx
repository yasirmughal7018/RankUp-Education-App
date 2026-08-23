import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Save,
} from "lucide-react";
import { PageHeader } from "@/core/components/PageHeader";
import { AppCard } from "@/components/ui/app-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  QuizNavigationMode,
  SavedQuizAnswer,
  StartQuizAttempt,
  SubmitQuizAnswer,
} from "@/features/student/domain/studentQuizTypes";
import {
  isMatchingQuestionType,
  isMultiSelectQuestionType,
  isOrderingQuestionType,
  isFileUploadQuestionType,
  isTextQuestionType,
} from "@/features/student/domain/studentQuizTypes";
import * as studentQuizApi from "@/features/student/data/studentQuizApi";
import {
  clearOfflineQuizSyncQueue,
  enqueueOfflineQuizSync,
  isBrowserOffline,
  isOfflineQueueableError,
} from "@/features/student/domain/offlineQuizSyncQueue";
import {
  clearOfflineAttemptSession,
  persistOfflineAttemptSession,
  readStoredAttemptShell,
} from "@/features/student/domain/offlineAttemptSession";
import { getStudentDeviceId } from "@/features/student/domain/studentQuizTypes";
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
  return readStoredAttemptShell(attemptId);
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

function shuffleOptionIds(ids: number[]): number[] {
  const next = [...ids];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  if (
    next.length > 1 &&
    next.every((id, index) => id === ids[index])
  ) {
    [next[0], next[1]] = [next[1], next[0]];
  }
  return next;
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
      const isOrdering = isOrderingQuestionType(question.questionType);
      const optionIds = question.options.map((option) => option.id);

      if (
        isOrdering &&
        (!existing ||
          (existing.selectedOptionIds?.filter((id) => id > 0).length ?? 0) ===
            0)
      ) {
        const shuffled = shuffleOptionIds(optionIds);
        return [
          question.id,
          {
            selectedOptionId: shuffled[0] ?? null,
            selectedOptionIds: shuffled,
            submittedText: existing?.submittedText ?? "",
          },
        ];
      }

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

function ExamAlert({
  tone,
  children,
  onDismiss,
}: {
  tone: "warning" | "danger" | "info";
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        tone === "warning" &&
          "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
        tone === "danger" &&
          "border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]",
        tone === "info" && "border-border bg-muted/70 text-muted-foreground",
      )}
    >
      <div className="min-w-0">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function isAnswered(answer: AnswerState | undefined): boolean {
  if (!answer) {
    return false;
  }

  const selectedIds = (answer.selectedOptionIds ?? []).filter((id) => id > 0);
  return (
    selectedIds.length > 0 ||
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
  const selectedOptionIds = (answer?.selectedOptionIds ?? []).filter(
    (id) => id > 0,
  );
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
  const [fileUploadBusy, setFileUploadBusy] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
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
      persistOfflineAttemptSession(attemptFromNavigation);
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

  const navigationMode = normalizeNavigationMode(attempt?.navigationMode);
  const enablePerQuestionTimer = Boolean(attempt?.enablePerQuestionTimer);

  const orderedQuestions = useMemo(() => {
    const items = attempt?.questions ?? [];
    return [...items].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [attempt?.questions]);

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
      clearOfflineAttemptSession(numericQuizId, numericAttemptId);
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
        deviceId: getStudentDeviceId(),
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
      clearOfflineAttemptSession(numericQuizId, numericAttemptId);
      sessionStorage.removeItem(answersStorageKey(numericAttemptId));
      sessionStorage.removeItem(startedAtStorageKey(numericAttemptId));
      sessionStorage.removeItem(reviewStorageKey(numericAttemptId));
      sessionStorage.removeItem(questionTimeStorageKey(numericAttemptId));
      navigate(
        `/student/quizzes/${numericQuizId}/attempts/${result.attemptId}/result`,
        { state: isAuto ? { autoSubmitted: true } : undefined },
      );
    } catch (error) {
      if (isOfflineQueueableError(error)) {
        enqueueOfflineQuizSync({
          quizId: numericQuizId,
          attemptId: numericAttemptId,
          answers: payload,
          timeSpentSeconds,
          deviceId: getStudentDeviceId(),
          submit: true,
          isAutoSubmit: isAuto,
          focusLossDelta: null,
          clipboardPasteDelta: null,
        });
        setOfflineSubmitQueued(true);
      }
      // Non-network failures (integrity/validation) surface via submitAttempt.error.
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
      <div className="mx-auto max-w-3xl">
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

  const answeredCount = orderedQuestions.filter((question) =>
    isAnswered(answers[question.id]),
  ).length;
  const reviewCount = orderedQuestions.filter((question) =>
    Boolean(markedForReview[question.id]),
  ).length;
  const progressPct =
    orderedQuestions.length > 0
      ? Math.round((answeredCount / orderedQuestions.length) * 100)
      : 0;

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

  async function handleFileUploadSelected(file: File | null) {
    if (!currentQuestion || currentQuestionLocked || !file) {
      return;
    }

    setFileUploadError(null);
    setFileUploadBusy(true);
    try {
      const result = await studentQuizApi.uploadQuizAttemptFile(
        numericQuizId,
        numericAttemptId,
        currentQuestion.id,
        file,
      );
      updateCurrentAnswer({
        selectedOptionId: null,
        selectedOptionIds: [],
        submittedText: result.fileUrl,
      });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to upload file.";
      setFileUploadError(message);
    } finally {
      setFileUploadBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <AppCard padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Quiz attempt
            </p>
            <h1 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Attempt #{attempt.attemptNumber}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {attempt.resumed
                ? "Continuing your in-progress attempt."
                : attempt.timeLimitMinutes
                  ? `${attempt.timeLimitMinutes} minute time limit`
                  : "Answer all questions and submit when ready."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {remainingSeconds != null ? (
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums",
                  timerUrgent
                    ? "border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]"
                    : "border-primary/20 bg-primary/10 text-primary",
                )}
              >
                <Clock className="h-4 w-4 shrink-0" aria-hidden />
                <span>{formatCountdown(remainingSeconds)}</span>
              </div>
            ) : null}
            {questionRemainingSeconds != null ? (
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold tabular-nums",
                  questionTimerUrgent
                    ? "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                Question {formatCountdown(questionRemainingSeconds)}
              </div>
            ) : null}
          </div>
        </div>
        <div className="border-t border-border/80 px-4 py-3 sm:px-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Question {currentIndex + 1} of {orderedQuestions.length}
              {currentQuestion ? ` · ${currentQuestion.marks} marks` : ""}
            </span>
            <span>
              {answeredCount} answered
              {reviewCount > 0 ? ` · ${reviewCount} for review` : ""}
              {draftStatus ? ` · ${draftStatus}` : ""}
            </span>
          </div>
          <Progress value={progressPct} className="h-2" />
          {showIntegrity ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Focus leaves {focusLossCount}
              {clipboardPasteCount > 0 ? ` · Pastes ${clipboardPasteCount}` : ""}
            </p>
          ) : null}
        </div>
      </AppCard>

      {integrityLocked ? (
        <ExamAlert tone="danger">
          Integrity limit exceeded (too many focus losses or paste events).
          Answers are locked — submit your attempt now.
        </ExamAlert>
      ) : null}

      {timeWarning ? (
        <ExamAlert tone="warning" onDismiss={() => setTimeWarning(null)}>
          {timeWarning}
        </ExamAlert>
      ) : null}

      <Dialog open={showLowTimeDialog} onOpenChange={setShowLowTimeDialog}>
        <DialogContent className="max-w-md rounded-2xl border-border/80">
          <DialogHeader>
            <DialogTitle>Less than one minute left</DialogTitle>
            <DialogDescription>
              Submit soon — the quiz will auto-submit when time runs out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setShowLowTimeDialog(false)}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {submitAttempt.error ? (
        <ExamAlert tone="danger">{submitAttempt.error.message}</ExamAlert>
      ) : null}

      {isOffline || pendingOfflineCount > 0 || offlineSubmitQueued ? (
        <ExamAlert tone="warning">
          {offlineSubmitQueued
            ? "Submit is queued on this device. It will sync automatically when you are back online."
            : isOffline
              ? "You are offline. Answers are saved on this device and will sync when the connection returns."
              : `${pendingOfflineCount} change(s) waiting to sync.`}
        </ExamAlert>
      ) : null}

      <AppCard>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Questions
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
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
                aria-current={active ? "true" : undefined}
                aria-label={`Question ${index + 1}${answered ? ", answered" : ""}${flagged ? ", marked for review" : ""}`}
                onClick={() => {
                  if (canJumpByNumber) {
                    setCurrentIndex(index);
                  }
                }}
                className={cn(
                  "h-10 min-w-10 rounded-xl border px-2.5 text-sm font-semibold transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : flagged
                      ? "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]"
                      : answered
                        ? "border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] text-[var(--status-approved-text)]"
                        : "border-border bg-card text-foreground hover:border-primary/35 hover:bg-muted",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-card",
                )}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Current
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--status-approved-border)]" />{" "}
            Answered
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--status-pending-border)]" />{" "}
            Review
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-border bg-card" />{" "}
            Unanswered
          </span>
        </div>
      </AppCard>

      {currentQuestion ? (
        <AppCard>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-display text-sm font-semibold text-primary">
                {currentIndex + 1}
              </span>
              <h2 className="font-display text-base font-semibold leading-6 tracking-tight text-foreground sm:text-lg">
                {currentQuestion.text}
              </h2>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {currentQuestion.marks} marks
            </span>
          </div>

          {currentQuestion.hint ? (
            <p className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
              <span className="font-semibold text-primary">Hint: </span>
              {currentQuestion.hint}
            </p>
          ) : null}

          {currentQuestionLocked ? (
            <div className="mb-4">
              <ExamAlert tone="warning">
                Time is up for this question. Your last in-time answer is locked.
              </ExamAlert>
            </div>
          ) : null}

          {isFileUploadQuestionType(currentQuestion.questionType) ? (
            <div className="space-y-3">
              <label className="block text-sm text-foreground">
                <span className="mb-1 block font-medium">Upload file</span>
                <input
                  type="file"
                  disabled={currentQuestionLocked || fileUploadBusy}
                  onChange={(event) => {
                    void handleFileUploadSelected(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
                />
              </label>
              {fileUploadBusy ? (
                <p className="text-xs text-muted-foreground">Uploading…</p>
              ) : null}
              {fileUploadError ? (
                <p className="text-xs text-destructive">{fileUploadError}</p>
              ) : null}
              {currentAnswer?.submittedText?.trim() ? (
                <p className="text-xs font-medium text-[hsl(var(--success))]">
                  Attached:{" "}
                  <a
                    href={currentAnswer.submittedText}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {currentAnswer.submittedText}
                  </a>
                </p>
              ) : null}
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Or paste a file link (Drive, OneDrive, etc.)
                </p>
                <input
                  type="url"
                  value={currentAnswer?.submittedText ?? ""}
                  disabled={currentQuestionLocked}
                  onChange={(event) =>
                    updateCurrentAnswer({
                      selectedOptionId: null,
                      selectedOptionIds: [],
                      submittedText: event.target.value,
                    })
                  }
                  className={inputClassName}
                  placeholder="https://..."
                />
              </div>
            </div>
          ) : isTextQuestionType(currentQuestion.questionType) ? (
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
          ) : isMatchingQuestionType(currentQuestion.questionType) ? (
            (() => {
              const options = currentQuestion.options;
              const half = Math.floor(options.length / 2);
              const lefts = options.slice(0, half);
              const rights = options.slice(half);
              const selectedIds = currentAnswer?.selectedOptionIds ?? [];
              return (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Match each left item to a right item.
                  </p>
                  {lefts.map((left, index) => {
                    const selectedRightId = selectedIds[index] ?? null;
                    const usedRights = new Set(
                      selectedIds.filter(
                        (id, rightIndex) =>
                          rightIndex !== index && id != null && id > 0,
                      ),
                    );
                    return (
                      <div
                        key={left.id}
                        className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/40 px-3 py-2.5 sm:flex-row sm:items-center"
                      >
                        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                          {left.text}
                        </span>
                        <select
                          className={inputClassName}
                          disabled={currentQuestionLocked}
                          value={selectedRightId ?? ""}
                          onChange={(event) => {
                            if (currentQuestionLocked) {
                              return;
                            }
                            const next = Array.from(
                              { length: lefts.length },
                              (_, slot) => selectedIds[slot] ?? 0,
                            );
                            next[index] = Number(event.target.value) || 0;
                            updateCurrentAnswer({
                              selectedOptionId:
                                next.find((id) => id > 0) ?? null,
                              selectedOptionIds: next,
                              submittedText: "",
                            });
                          }}
                        >
                          <option value="">Select match…</option>
                          {rights.map((right) => (
                            <option
                              key={right.id}
                              value={right.id}
                              disabled={
                                usedRights.has(right.id) &&
                                selectedRightId !== right.id
                              }
                            >
                              {right.text}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : isOrderingQuestionType(currentQuestion.questionType) ? (
            (() => {
              const options = currentQuestion.options;
              const orderedIds =
                currentAnswer?.selectedOptionIds &&
                currentAnswer.selectedOptionIds.length === options.length
                  ? currentAnswer.selectedOptionIds
                  : options.map((option) => option.id);
              const byId = new Map(options.map((option) => [option.id, option]));
              return (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Arrange items in the correct order (top = first).
                  </p>
                  {orderedIds.map((optionId, index) => {
                    const option = byId.get(optionId);
                    if (!option) {
                      return null;
                    }
                    return (
                      <div
                        key={optionId}
                        className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-3 py-2.5"
                      >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-sm text-foreground">
                          {option.text}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={currentQuestionLocked || index === 0}
                          onClick={() => {
                            if (currentQuestionLocked || index === 0) {
                              return;
                            }
                            const next = [...orderedIds];
                            [next[index - 1], next[index]] = [
                              next[index],
                              next[index - 1],
                            ];
                            updateCurrentAnswer({
                              selectedOptionId: next[0] ?? null,
                              selectedOptionIds: next,
                              submittedText: "",
                            });
                          }}
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            currentQuestionLocked ||
                            index === orderedIds.length - 1
                          }
                          onClick={() => {
                            if (
                              currentQuestionLocked ||
                              index === orderedIds.length - 1
                            ) {
                              return;
                            }
                            const next = [...orderedIds];
                            [next[index], next[index + 1]] = [
                              next[index + 1],
                              next[index],
                            ];
                            updateCurrentAnswer({
                              selectedOptionId: next[0] ?? null,
                              selectedOptionIds: next,
                              submittedText: "",
                            });
                          }}
                        >
                          Down
                        </Button>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <div className="space-y-2.5">
              {currentQuestion.options.map((option, optionIndex) => {
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
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-4 py-3.5 transition",
                      checked
                        ? "border-primary/40 bg-primary/10 ring-2 ring-primary/15"
                        : "border-border/80 bg-card hover:border-primary/30 hover:bg-muted/50",
                      currentQuestionLocked
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-pointer",
                    )}
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
                      className="mt-1.5 accent-primary"
                    />
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                        checked
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {optionLetter(optionIndex)}
                    </span>
                    <span className="flex-1 text-sm leading-6 text-foreground">
                      {option.text}
                      {option.imageUrl ? (
                        <img
                          src={option.imageUrl}
                          alt=""
                          className="mt-2 max-h-40 rounded-xl border border-border object-contain"
                        />
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
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
              className={cn(
                markedForReview[currentQuestion.id] &&
                  "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)] hover:bg-[var(--status-pending-bg)]",
              )}
            >
              <Flag className="h-4 w-4" aria-hidden />
              {markedForReview[currentQuestion.id]
                ? "Marked for review"
                : "Mark for review"}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoPrevious}
                onClick={() =>
                  setCurrentIndex((value) => Math.max(0, value - 1))
                }
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoNext}
                onClick={() =>
                  setCurrentIndex((value) =>
                    Math.min(orderedQuestions.length - 1, value + 1),
                  )
                }
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </AppCard>
      ) : null}

      <div className="sticky bottom-24 z-10 flex flex-wrap gap-3 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:bottom-4">
        <Button
          type="button"
          disabled={submitAttempt.isPending}
          onClick={() => void handleSubmit(false)}
          className="flex-1 sm:flex-none"
        >
          {submitAttempt.isPending ? "Submitting..." : "Submit quiz"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isDraftSaving || submitAttempt.isPending}
          onClick={() => void persistDraft(true)}
        >
          <Save className="h-4 w-4" aria-hidden />
          {isDraftSaving ? "Saving..." : "Save now"}
        </Button>
        <Button variant="ghost" asChild>
          <Link
            to={`/student/quizzes/${quizId}`}
            onClick={(event) => {
              event.preventDefault();
              void persistDraft(true).finally(() => {
                navigate(`/student/quizzes/${quizId}`);
              });
            }}
          >
            Save and exit
          </Link>
        </Button>
      </div>
    </div>
  );
}
