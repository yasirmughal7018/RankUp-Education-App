export interface QuizDetail {
  id: number;
  title: string;
  description: string;
  subject: string;
  grade: string;
  topic: string;
  quizType: string;
  difficulty: string;
  questionCount: number;
  totalMarks: number;
  timeLimitMinutes: number | null;
  attemptLimit: number;
  attemptsUsed: number;
  startAt: string | null;
  dueAt: string | null;
  status: string;
  instructions: string[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  hintsAllowed: boolean;
  reviewAvailable: boolean;
  createdBy: string;
  schoolName: string;
  resultStatus: string;
  resultPercent: number | null;
}

export interface QuizAttemptOption {
  id: number;
  text: string;
  imageUrl: string | null;
}

export interface QuizAttemptQuestion {
  id: number;
  text: string;
  questionType: string;
  marks: number;
  displayOrder: number;
  hint: string | null;
  options: QuizAttemptOption[];
  estimatedTimeSeconds?: number;
  timeSpentSeconds?: number;
}

export type QuizNavigationMode = "Free" | "Sequential" | "Locked";

export interface SavedQuizAnswer {
  questionId: number;
  selectedOptionId: number | null;
  submittedText: string | null;
  selectedOptionIds?: number[] | null;
  isMarkedForReview?: boolean;
}

export interface StartQuizAttempt {
  attemptId: number;
  quizId: number;
  attemptNumber: number;
  timeLimitMinutes: number | null;
  startedAt: string;
  resumed: boolean;
  questions: QuizAttemptQuestion[];
  savedAnswers: SavedQuizAnswer[];
  navigationMode?: QuizNavigationMode | string;
  enforceDeviceLock?: boolean;
  focusLossCount?: number;
  clipboardPasteCount?: number;
  enablePerQuestionTimer?: boolean;
}

export interface SubmitQuizAnswer {
  questionId: number;
  selectedOptionId: number | null;
  submittedText: string | null;
  selectedOptionIds?: number[] | null;
  isMarkedForReview?: boolean | null;
  timeSpentSeconds?: number | null;
}

export interface SaveQuizDraftInput {
  answers: SubmitQuizAnswer[];
  timeSpentSeconds?: number | null;
  focusLossDelta?: number | null;
  clipboardPasteDelta?: number | null;
  deviceId?: string | null;
  isOfflineSync?: boolean | null;
  clientSyncId?: string | null;
}

export interface SaveQuizDraftResult {
  attemptId: number;
  savedCount: number;
  focusLossCount?: number;
  clipboardPasteCount?: number;
  isOfflineAttempt?: boolean;
  clientSyncId?: string | null;
}

export interface SyncOfflineQuizAttemptInput {
  clientSyncId: string;
  answers: SubmitQuizAnswer[];
  timeSpentSeconds: number;
  deviceId?: string | null;
  submit?: boolean;
  isAutoSubmit?: boolean;
  focusLossDelta?: number | null;
  clipboardPasteDelta?: number | null;
}

export interface SyncOfflineQuizAttemptResult {
  attemptId: number;
  alreadySynced: boolean;
  submitted: boolean;
  isOfflineAttempt: boolean;
  clientSyncId: string;
  draft?: SaveQuizDraftResult | null;
  result?: QuizAttemptResult | null;
}

export interface QuizResultQuestion {
  id: number;
  text: string;
  marks: number;
  awardedMarks: number;
  isCorrect: boolean;
  explanation: string | null;
  selectedOptionId: number | null;
  correctOptionId: number | null;
  submittedText: string | null;
  selectedOptionIds?: number[] | null;
  correctOptionIds?: number[] | null;
}

export interface QuizAttemptResult {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  attemptNumber: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  timeSpentSeconds: number;
  resultStatus: string;
  reviewAvailable: boolean;
  reviewPending?: boolean;
  reviewDisplayMode?: string;
  questions: QuizResultQuestion[];
}

export const STUDENT_DEVICE_ID_STORAGE_KEY = "rankup-student-device-id";
const DEVICE_ID_MAX_LENGTH = 100;

function createWebDeviceId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `web-${uuid}`.slice(0, DEVICE_ID_MAX_LENGTH);
}

/**
 * Stable per-browser device id for Competition attempt lock.
 * Persisted in localStorage so resume/submit on another browser/profile is blocked.
 */
export function getStudentDeviceId(): string {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return createWebDeviceId();
  }

  try {
    const existing = localStorage.getItem(STUDENT_DEVICE_ID_STORAGE_KEY)?.trim();
    if (existing) {
      return existing.slice(0, DEVICE_ID_MAX_LENGTH);
    }

    const created = createWebDeviceId();
    localStorage.setItem(STUDENT_DEVICE_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return createWebDeviceId();
  }
}

/** True only for Student role. */
export function canTakeStudentQuizzes(role: string): boolean {
  return role === "Student";
}

/** Question requires free-text answer (Fill / Descriptive / essay-style). */
export function isTextQuestionType(questionType: string): boolean {
  const normalized = questionType.toLowerCase().replace(/\s+/g, "");
  return (
    normalized.includes("fill") ||
    normalized.includes("blank") ||
    normalized.includes("text") ||
    normalized.includes("short") ||
    normalized.includes("long") ||
    normalized.includes("essay") ||
    normalized.includes("descriptive")
  );
}

/** Multiple Choice — students may select more than one option. */
export function isMultiSelectQuestionType(questionType: string): boolean {
  const normalized = questionType.toLowerCase().replace(/\s+/g, "");
  return (
    normalized.includes("multiplechoice") ||
    normalized.includes("multiselect") ||
    normalized === "multiple"
  );
}

/** Student has an unfinished attempt. */
export function hasInProgressAttempt(quiz: QuizDetail): boolean {
  const result = quiz.resultStatus.toLowerCase();
  return result.includes("in progress") || result.includes("inprogress");
}
