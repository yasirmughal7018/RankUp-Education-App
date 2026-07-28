/** Local queue for quiz attempt drafts/submits while the browser is offline. */
import type { SubmitQuizAnswer } from "@/features/student/domain/studentQuizTypes";

export type OfflineQuizSyncItem = {
  id: string;
  quizId: number;
  attemptId: number;
  clientSyncId: string;
  answers: SubmitQuizAnswer[];
  timeSpentSeconds: number;
  deviceId: string;
  submit: boolean;
  isAutoSubmit: boolean;
  focusLossDelta: number | null;
  clipboardPasteDelta: number | null;
  queuedAt: string;
};

const queueKey = (attemptId: number) => `rankup-quiz-offline-queue-${attemptId}`;

function readQueue(attemptId: number): OfflineQuizSyncItem[] {
  if (attemptId <= 0) {
    return [];
  }

  const raw = localStorage.getItem(queueKey(attemptId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as OfflineQuizSyncItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(attemptId: number, items: OfflineQuizSyncItem[]) {
  if (attemptId <= 0) {
    return;
  }

  if (items.length === 0) {
    localStorage.removeItem(queueKey(attemptId));
    return;
  }

  localStorage.setItem(queueKey(attemptId), JSON.stringify(items));
}

/** True when the browser reports offline (best-effort). */
export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function createClientSyncId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listOfflineQuizSyncQueue(attemptId: number): OfflineQuizSyncItem[] {
  return readQueue(attemptId);
}

export function countOfflineQuizSyncQueue(attemptId: number): number {
  return readQueue(attemptId).length;
}

/** Enqueue (or replace) the latest pending payload for this attempt. */
export function enqueueOfflineQuizSync(
  item: Omit<OfflineQuizSyncItem, "id" | "queuedAt" | "clientSyncId"> & {
    clientSyncId?: string;
  },
): OfflineQuizSyncItem {
  const existing = readQueue(item.attemptId);
  const clientSyncId =
    item.clientSyncId
    ?? existing.find((entry) => entry.submit === item.submit)?.clientSyncId
    ?? createClientSyncId();

  const nextItem: OfflineQuizSyncItem = {
    ...item,
    id: `${item.attemptId}-${clientSyncId}-${item.submit ? "submit" : "draft"}`,
    clientSyncId,
    queuedAt: new Date().toISOString(),
  };

  // Keep at most one draft + one submit pending per attempt.
  const filtered = existing.filter((entry) => entry.submit !== item.submit);
  writeQueue(item.attemptId, [...filtered, nextItem]);
  return nextItem;
}

export function removeOfflineQuizSyncItem(attemptId: number, id: string) {
  writeQueue(
    attemptId,
    readQueue(attemptId).filter((item) => item.id !== id),
  );
}

export function clearOfflineQuizSyncQueue(attemptId: number) {
  writeQueue(attemptId, []);
}
