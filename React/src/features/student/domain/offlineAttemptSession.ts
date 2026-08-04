/**
 * Persists InProgress attempt sessions so students can resume offline
 * after an online start. New starts still require the network.
 */
import type { StartQuizAttempt } from "@/features/student/domain/studentQuizTypes";
import { isBrowserOffline } from "@/features/student/domain/offlineQuizSyncQueue";

const quizSessionKey = (quizId: number) =>
  `rankup-quiz-offline-session-${quizId}`;

const attemptShellKey = (attemptId: number) =>
  `rankup-quiz-attempt-${attemptId}`;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** Save attempt shell for offline resume (localStorage + sessionStorage). */
export function persistOfflineAttemptSession(attempt: StartQuizAttempt): void {
  if (!canUseStorage()) {
    return;
  }

  const payload = JSON.stringify(attempt);
  try {
    localStorage.setItem(quizSessionKey(attempt.quizId), payload);
    localStorage.setItem(attemptShellKey(attempt.attemptId), payload);
    sessionStorage.setItem(attemptShellKey(attempt.attemptId), payload);
  } catch {
    // Quota / private mode — ignore.
  }
}

/** Load cached session for a quiz (offline resume). */
export function loadOfflineAttemptSession(
  quizId: number,
): StartQuizAttempt | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(quizSessionKey(quizId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StartQuizAttempt;
    if (!parsed?.attemptId || parsed.quizId !== quizId) {
      return null;
    }
    return { ...parsed, resumed: true };
  } catch {
    return null;
  }
}

/** Read attempt shell by attempt id (localStorage fallback for sessionStorage). */
export function readStoredAttemptShell(
  attemptId: number,
): StartQuizAttempt | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const fromSession = sessionStorage.getItem(attemptShellKey(attemptId));
    const raw =
      fromSession ?? localStorage.getItem(attemptShellKey(attemptId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StartQuizAttempt;
  } catch {
    return null;
  }
}

/** Clear cached session after submit / finalize. */
export function clearOfflineAttemptSession(
  quizId: number,
  attemptId: number,
): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    localStorage.removeItem(quizSessionKey(quizId));
    localStorage.removeItem(attemptShellKey(attemptId));
    sessionStorage.removeItem(attemptShellKey(attemptId));
  } catch {
    // ignore
  }
}

export { isBrowserOffline };
