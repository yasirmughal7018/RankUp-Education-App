/** Autosave for in-progress quiz attempts: on-change debounce, interval, background flush. */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as studentQuizApi from "@/features/student/data/studentQuizApi";
import type {
  QuizAttemptResult,
  SaveQuizDraftResult,
  SubmitQuizAnswer,
} from "@/features/student/domain/studentQuizTypes";
import { getStudentDeviceId } from "@/features/student/domain/studentQuizTypes";
import {
  countOfflineQuizSyncQueue,
  enqueueOfflineQuizSync,
  isBrowserOffline,
  isOfflineQueueableError,
  listOfflineQuizSyncQueue,
  removeOfflineQuizSyncItem,
} from "@/features/student/domain/offlineQuizSyncQueue";

const CHANGE_DEBOUNCE_MS = 1200;
const INTERVAL_MS = 15_000;

export type QuizAutosaveStatus =
  | "idle"
  | "unsaved"
  | "saving"
  | "saved"
  | "error"
  | "offline";

type UseQuizAttemptAutosaveOptions = {
  enabled: boolean;
  quizId: number;
  attemptId: number;
  startedAt: number;
  /** True while final submit is in flight — blocks draft writes. */
  isSubmitPending: boolean;
  /** Latest answers + review flags (+ per-question times). */
  buildAnswers: () => SubmitQuizAnswer[];
  focusLossDeltaRef: MutableRefObject<number>;
  clipboardPasteDeltaRef: MutableRefObject<number>;
  onSaved?: (result: SaveQuizDraftResult) => void;
  /** Called when the tab is hidden (before background flush) — e.g. focus-loss counter. */
  onBackground?: () => void;
  /** Fired when a queued offline submit finishes after reconnect. */
  onOfflineSubmitSynced?: (result: QuizAttemptResult) => void;
};

function formatSavedLabel(savedAt: number | null): string {
  if (savedAt == null) {
    return "Draft saved";
  }

  const seconds = Math.max(0, Math.round((Date.now() - savedAt) / 1000));
  if (seconds < 5) {
    return "Saved just now";
  }
  if (seconds < 60) {
    return `Saved ${seconds}s ago`;
  }

  return `Saved at ${new Date(savedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/**
 * Persists draft answers via:
 * - debounced on-change (1.2s after markDirty)
 * - 15s interval (snapshot-diff, including question timers)
 * - visibilitychange / pagehide / beforeunload (keepalive when possible)
 * - explicit flush() before submit / manual save
 *
 * Concurrent saves are queued so a change during an in-flight request is not dropped.
 */
export function useQuizAttemptAutosave({
  enabled,
  quizId,
  attemptId,
  startedAt,
  isSubmitPending,
  buildAnswers,
  focusLossDeltaRef,
  clipboardPasteDeltaRef,
  onSaved,
  onBackground,
  onOfflineSubmitSynced,
}: UseQuizAttemptAutosaveOptions) {
  const [status, setStatus] = useState<QuizAutosaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(() =>
    countOfflineQuizSyncQueue(attemptId),
  );
  const [isOffline, setIsOffline] = useState(() => isBrowserOffline());

  const dirtyRef = useRef(false);
  const dirtyVersionRef = useRef(0);
  const savingRef = useRef(false);
  const queuedForceRef = useRef(false);
  const lastSnapshotRef = useRef("");
  const enabledRef = useRef(enabled);
  const isSubmitPendingRef = useRef(isSubmitPending);
  const buildAnswersRef = useRef(buildAnswers);
  const onSavedRef = useRef(onSaved);
  const onBackgroundRef = useRef(onBackground);
  const onOfflineSubmitSyncedRef = useRef(onOfflineSubmitSynced);
  const startedAtRef = useRef(startedAt);

  enabledRef.current = enabled;
  isSubmitPendingRef.current = isSubmitPending;
  buildAnswersRef.current = buildAnswers;
  onSavedRef.current = onSaved;
  onBackgroundRef.current = onBackground;
  onOfflineSubmitSyncedRef.current = onOfflineSubmitSynced;
  startedAtRef.current = startedAt;

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    dirtyVersionRef.current += 1;
    setDirtyVersion(dirtyVersionRef.current);
    setStatus((current) => (current === "saving" ? current : "unsaved"));
  }, []);

  const flush = useCallback(async (force = false): Promise<boolean> => {
    if (
      !enabledRef.current ||
      quizId <= 0 ||
      attemptId <= 0 ||
      isSubmitPendingRef.current
    ) {
      return false;
    }

    if (savingRef.current) {
      queuedForceRef.current = queuedForceRef.current || force;
      return false;
    }

    const answers = buildAnswersRef.current();
    const focusLossDelta = focusLossDeltaRef.current;
    const clipboardPasteDelta = clipboardPasteDeltaRef.current;
    const hasIntegrityDelta = focusLossDelta > 0 || clipboardPasteDelta > 0;
    const versionAtStart = dirtyVersionRef.current;

    const snapshot = JSON.stringify({
      answers,
      focusLossDelta,
      clipboardPasteDelta,
    });

    // Soft path: skip when nothing changed (interval still picks up timer drift via snapshot).
    if (
      !force &&
      !dirtyRef.current &&
      !hasIntegrityDelta &&
      snapshot === lastSnapshotRef.current
    ) {
      return true;
    }

    const timeSpentSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAtRef.current) / 1000),
    );

    // Claim deltas only once we commit to a network write / offline queue.
    focusLossDeltaRef.current = 0;
    clipboardPasteDeltaRef.current = 0;

    savingRef.current = true;
    setStatus("saving");

    let succeeded = false;
    try {
      if (isBrowserOffline()) {
        enqueueOfflineQuizSync({
          quizId,
          attemptId,
          answers,
          timeSpentSeconds,
          deviceId: getStudentDeviceId(),
          submit: false,
          isAutoSubmit: false,
          focusLossDelta: focusLossDelta > 0 ? focusLossDelta : null,
          clipboardPasteDelta:
            clipboardPasteDelta > 0 ? clipboardPasteDelta : null,
        });
        setPendingOfflineCount(countOfflineQuizSyncQueue(attemptId));
        lastSnapshotRef.current = JSON.stringify({
          answers,
          focusLossDelta: 0,
          clipboardPasteDelta: 0,
        });
        if (dirtyVersionRef.current === versionAtStart) {
          dirtyRef.current = false;
        }
        setStatus("offline");
        succeeded = true;
        return true;
      }

      const result = await studentQuizApi.saveQuizAttemptDraft(
        quizId,
        attemptId,
        {
          answers,
          timeSpentSeconds,
          focusLossDelta: focusLossDelta > 0 ? focusLossDelta : null,
          clipboardPasteDelta:
            clipboardPasteDelta > 0 ? clipboardPasteDelta : null,
          deviceId: getStudentDeviceId(),
        },
      );
      lastSnapshotRef.current = JSON.stringify({
        answers,
        focusLossDelta: 0,
        clipboardPasteDelta: 0,
      });
      if (dirtyVersionRef.current === versionAtStart) {
        dirtyRef.current = false;
        setStatus("saved");
      } else {
        dirtyRef.current = true;
        setStatus("unsaved");
      }
      setSavedAt(Date.now());
      onSavedRef.current?.(result);
      succeeded = true;
      return true;
    } catch (error) {
      focusLossDeltaRef.current += focusLossDelta;
      clipboardPasteDeltaRef.current += clipboardPasteDelta;
      dirtyRef.current = true;

      if (isOfflineQueueableError(error)) {
        // Network / transient failure mid-flight — queue for reconnect sync.
        enqueueOfflineQuizSync({
          quizId,
          attemptId,
          answers,
          timeSpentSeconds,
          deviceId: getStudentDeviceId(),
          submit: false,
          isAutoSubmit: false,
          focusLossDelta: focusLossDelta > 0 ? focusLossDelta : null,
          clipboardPasteDelta:
            clipboardPasteDelta > 0 ? clipboardPasteDelta : null,
        });
        setPendingOfflineCount(countOfflineQuizSyncQueue(attemptId));
        setStatus(isBrowserOffline() ? "offline" : "error");
      } else {
        // Integrity/validation/business errors must not be treated as offline.
        setStatus("error");
      }
      return false;
    } finally {
      savingRef.current = false;
      const shouldReplay =
        queuedForceRef.current || (succeeded && dirtyRef.current);
      const nextForce = queuedForceRef.current;
      queuedForceRef.current = false;
      if (shouldReplay) {
        void flush(nextForce);
      }
    }
  }, [attemptId, clipboardPasteDeltaRef, focusLossDeltaRef, quizId]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  /** Best-effort keepalive write when the tab is closing / backgrounded. */
  const flushKeepalive = useCallback(() => {
    if (
      !enabledRef.current ||
      quizId <= 0 ||
      attemptId <= 0 ||
      isSubmitPendingRef.current
    ) {
      return;
    }

    const answers = buildAnswersRef.current();
    const focusLossDelta = focusLossDeltaRef.current;
    const clipboardPasteDelta = clipboardPasteDeltaRef.current;
    const snapshot = JSON.stringify({
      answers,
      focusLossDelta,
      clipboardPasteDelta,
    });

    if (
      !dirtyRef.current &&
      focusLossDelta <= 0 &&
      clipboardPasteDelta <= 0 &&
      snapshot === lastSnapshotRef.current
    ) {
      return;
    }

    const timeSpentSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAtRef.current) / 1000),
    );

    focusLossDeltaRef.current = 0;
    clipboardPasteDeltaRef.current = 0;

    if (isBrowserOffline()) {
      enqueueOfflineQuizSync({
        quizId,
        attemptId,
        answers,
        timeSpentSeconds,
        deviceId: getStudentDeviceId(),
        submit: false,
        isAutoSubmit: false,
        focusLossDelta: focusLossDelta > 0 ? focusLossDelta : null,
        clipboardPasteDelta:
          clipboardPasteDelta > 0 ? clipboardPasteDelta : null,
      });
      setPendingOfflineCount(countOfflineQuizSyncQueue(attemptId));
      lastSnapshotRef.current = JSON.stringify({
        answers,
        focusLossDelta: 0,
        clipboardPasteDelta: 0,
      });
      dirtyRef.current = false;
      setStatus("offline");
      return;
    }

    void studentQuizApi
      .saveQuizAttemptDraft(
        quizId,
        attemptId,
        {
          answers,
          timeSpentSeconds,
          focusLossDelta: focusLossDelta > 0 ? focusLossDelta : null,
          clipboardPasteDelta:
            clipboardPasteDelta > 0 ? clipboardPasteDelta : null,
          deviceId: getStudentDeviceId(),
        },
        { keepalive: true },
      )
      .then((result) => {
        lastSnapshotRef.current = JSON.stringify({
          answers,
          focusLossDelta: 0,
          clipboardPasteDelta: 0,
        });
        dirtyRef.current = false;
        setSavedAt(Date.now());
        setStatus("saved");
        onSavedRef.current?.(result);
      })
      .catch((error: unknown) => {
        focusLossDeltaRef.current += focusLossDelta;
        clipboardPasteDeltaRef.current += clipboardPasteDelta;
        dirtyRef.current = true;

        if (isOfflineQueueableError(error)) {
          enqueueOfflineQuizSync({
            quizId,
            attemptId,
            answers,
            timeSpentSeconds,
            deviceId: getStudentDeviceId(),
            submit: false,
            isAutoSubmit: false,
            focusLossDelta: focusLossDelta > 0 ? focusLossDelta : null,
            clipboardPasteDelta:
              clipboardPasteDelta > 0 ? clipboardPasteDelta : null,
          });
          setPendingOfflineCount(countOfflineQuizSyncQueue(attemptId));
        }
        setStatus(isBrowserOffline() ? "offline" : "error");
      });
  }, [attemptId, clipboardPasteDeltaRef, focusLossDeltaRef, quizId]);

  const flushOfflineQueue = useCallback(async () => {
    if (isBrowserOffline() || quizId <= 0 || attemptId <= 0) {
      return;
    }

    const queue = listOfflineQuizSyncQueue(attemptId);
    if (queue.length === 0) {
      return;
    }

    setStatus("saving");
    for (const item of queue) {
      try {
        const result = await studentQuizApi.syncOfflineQuizAttempt(
          item.quizId,
          item.attemptId,
          {
            clientSyncId: item.clientSyncId,
            answers: item.answers,
            timeSpentSeconds: item.timeSpentSeconds,
            deviceId: item.deviceId,
            submit: item.submit,
            isAutoSubmit: item.isAutoSubmit,
            focusLossDelta: item.focusLossDelta,
            clipboardPasteDelta: item.clipboardPasteDelta,
          },
        );
        removeOfflineQuizSyncItem(attemptId, item.id);
        if (result.draft) {
          onSavedRef.current?.(result.draft);
        }
        if (result.submitted && result.result) {
          onOfflineSubmitSyncedRef.current?.(result.result);
        }
      } catch (error) {
        if (!isOfflineQueueableError(error)) {
          // Drop stale integrity/validation payloads so they cannot block the queue.
          removeOfflineQuizSyncItem(attemptId, item.id);
          setPendingOfflineCount(countOfflineQuizSyncQueue(attemptId));
          setStatus("error");
          continue;
        }
        setStatus("error");
        setPendingOfflineCount(countOfflineQuizSyncQueue(attemptId));
        return;
      }
    }

    setPendingOfflineCount(countOfflineQuizSyncQueue(attemptId));
    setSavedAt(Date.now());
    setStatus("saved");
  }, [attemptId, quizId]);

  // Debounced on-change
  useEffect(() => {
    if (!enabled || dirtyVersion === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      void flushRef.current(false);
    }, CHANGE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [dirtyVersion, enabled]);

  // Stable interval (does not reset on every keystroke)
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = window.setInterval(() => {
      void flushRef.current(false);
    }, INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [enabled]);

  // Online / offline reconnect
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function onOnline() {
      setIsOffline(false);
      void flushOfflineQueue();
    }

    function onOffline() {
      setIsOffline(true);
      setStatus("offline");
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!isBrowserOffline() && countOfflineQuizSyncQueue(attemptId) > 0) {
      void flushOfflineQueue();
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [attemptId, enabled, flushOfflineQueue]);

  // Background / unload
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function onVisibilityChange() {
      if (document.hidden) {
        onBackgroundRef.current?.();
        flushKeepalive();
      }
    }

    function onPageHide() {
      flushKeepalive();
    }

    function onBeforeUnload() {
      flushKeepalive();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [enabled, flushKeepalive]);

  const statusLabel =
    status === "saving"
      ? pendingOfflineCount > 0
        ? "Syncing offline answers…"
        : "Saving…"
      : status === "error"
        ? pendingOfflineCount > 0
          ? "Draft save failed — will retry"
          : "Draft save failed"
        : status === "offline" || isOffline
          ? pendingOfflineCount > 0
            ? `Offline — ${pendingOfflineCount} pending sync`
            : "Offline — answers saved on this device"
          : status === "unsaved"
            ? "Unsaved changes"
            : status === "saved"
              ? pendingOfflineCount > 0
                ? `Saved · ${pendingOfflineCount} pending sync`
                : formatSavedLabel(savedAt)
              : pendingOfflineCount > 0
                ? `${pendingOfflineCount} pending sync`
                : null;

  return {
    status,
    statusLabel,
    isSaving: status === "saving",
    isOffline,
    pendingOfflineCount,
    markDirty,
    flush,
    flushRef,
    flushOfflineQueue,
  };
}
