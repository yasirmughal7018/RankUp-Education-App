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
  resultAnnouncedPercent?: number | null;
  /** Questions presented per attempt when random subset is enabled. */
  questionsPerAttempt?: number | null;
  lastAttemptId?: number | null;
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

export interface QuizResultOption {
  id: number;
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
}

export interface QuizResultQuestion {
  id: number;
  text: string;
  questionType?: string | null;
  marks: number;
  awardedMarks: number;
  isCorrect: boolean;
  explanation: string | null;
  selectedOptionId: number | null;
  correctOptionId: number | null;
  submittedText: string | null;
  selectedOptionIds?: number[] | null;
  correctOptionIds?: number[] | null;
  options?: QuizResultOption[];
  resultPending?: boolean;
  teacherFeedback?: string | null;
  parentFeedback?: string | null;
  aiFeedback?: string | null;
}

export interface QuizAttemptSummary {
  attemptId: number;
  attemptNumber: number;
  status: string;
  percentage: number;
  submittedAt: string;
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
  resultAnnouncedPercent?: number;
  resultsAnnounceAt?: string | null;
  questions: QuizResultQuestion[];
  attempts?: QuizAttemptSummary[];
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

/** File Upload — link or uploaded binary URL in submitted text. */
export function isFileUploadQuestionType(questionType: string): boolean {
  const normalized = questionType.toLowerCase().replace(/\s+/g, "");
  return normalized.includes("file");
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

/** Matching — left items paired to right items. */
export function isMatchingQuestionType(questionType: string): boolean {
  const normalized = questionType.toLowerCase().replace(/\s+/g, "");
  return normalized === "matching" || normalized === "match";
}

/** Ordering — rearrange items into the correct sequence. */
export function isOrderingQuestionType(questionType: string): boolean {
  const normalized = questionType.toLowerCase().replace(/\s+/g, "");
  return (
    normalized === "ordering" ||
    normalized === "order" ||
    normalized === "sequence"
  );
}

/** Student has an unfinished attempt. */
export function hasInProgressAttempt(quiz: {
  resultStatus: string;
  status?: string;
}): boolean {
  const result = normalizeStudentQuizStatus(quiz.resultStatus);
  const status = normalizeStudentQuizStatus(quiz.status ?? "");
  return result.includes("inprogress") || status.includes("inprogress");
}

export type StudentQuizBucket =
  | "inProgress"
  | "upcoming"
  | "expired"
  | "attempted"
  | "active";

export interface StudentQuizListItemLike {
  id: number;
  resultStatus: string;
  status?: string;
  startAt: string | null;
  dueAt: string | null;
  completedAt?: string | null;
  lastAttemptId?: number | null;
}

function normalizeStudentQuizStatus(value: string): string {
  return value.toLowerCase().replace(/[_\s-]/g, "");
}

export function isStudentQuizUpcoming(
  quiz: StudentQuizListItemLike,
  now = new Date(),
): boolean {
  if (hasInProgressAttempt(quiz) || isStudentQuizAttempted(quiz, now)) {
    return false;
  }

  const result = normalizeStudentQuizStatus(quiz.resultStatus);
  if (result.includes("upcoming") || result.includes("coming")) {
    return true;
  }

  return quiz.startAt != null && new Date(quiz.startAt) > now;
}

export function isStudentQuizAttempted(
  quiz: StudentQuizListItemLike,
  now = new Date(),
): boolean {
  if (hasInProgressAttempt(quiz)) {
    return false;
  }

  const result = normalizeStudentQuizStatus(quiz.resultStatus);
  if (result.includes("expir")) {
    return false;
  }

  if (quiz.lastAttemptId != null) {
    return true;
  }

  if (
    result.includes("complete") ||
    result.includes("review") ||
    result.includes("submit") ||
    result.includes("result")
  ) {
    return true;
  }

  return quiz.completedAt != null && new Date(quiz.completedAt) <= now;
}

export function isStudentQuizExpired(
  quiz: StudentQuizListItemLike,
  now = new Date(),
): boolean {
  if (hasInProgressAttempt(quiz) || isStudentQuizAttempted(quiz, now)) {
    return false;
  }

  const result = normalizeStudentQuizStatus(quiz.resultStatus);
  if (result.includes("expir")) {
    return true;
  }

  if (isStudentQuizUpcoming(quiz, now)) {
    return false;
  }

  return quiz.dueAt != null && new Date(quiz.dueAt) < now;
}

export function classifyStudentQuiz(
  quiz: StudentQuizListItemLike,
  now = new Date(),
): StudentQuizBucket {
  if (hasInProgressAttempt(quiz)) {
    return "inProgress";
  }

  if (isStudentQuizAttempted(quiz, now)) {
    return "attempted";
  }

  if (isStudentQuizUpcoming(quiz, now)) {
    return "upcoming";
  }

  if (isStudentQuizExpired(quiz, now)) {
    return "expired";
  }

  return "active";
}

export function isStudentQuizInLastMonth(
  quiz: StudentQuizListItemLike,
  now = new Date(),
): boolean {
  const from = new Date(now);
  from.setMonth(from.getMonth() - 1);
  const ahead = new Date(now);
  ahead.setMonth(ahead.getMonth() + 1);

  const start = quiz.startAt ? new Date(quiz.startAt) : null;
  const due = quiz.dueAt ? new Date(quiz.dueAt) : null;
  const completed = quiz.completedAt ? new Date(quiz.completedAt) : null;

  if (start && due && start <= now && due >= now) {
    return true;
  }

  if (start && start > now && start <= ahead) {
    return true;
  }

  return [start, due, completed].some(
    (value) => value != null && value >= from && value <= now,
  );
}

export function resolveStudentQuizAction(
  quiz: StudentQuizListItemLike,
  now = new Date(),
): { label: string; to: string; variant: "default" | "outline" } {
  const bucket = classifyStudentQuiz(quiz, now);
  const detailPath = `/student/quizzes/${quiz.id}`;

  if (bucket === "inProgress") {
    return { label: "Continue quiz", to: detailPath, variant: "default" };
  }

  if (bucket === "attempted") {
    return { label: "View result", to: detailPath, variant: "default" };
  }

  if (bucket === "active") {
    return { label: "Start quiz", to: detailPath, variant: "default" };
  }

  return { label: "Open", to: detailPath, variant: "outline" };
}

/** Compact score/pending label for the student quiz list Result column. */
export function formatStudentQuizListResult(quiz: {
  resultStatus: string;
  resultPercent?: number | null;
  resultAnnouncedPercent?: number | null;
  lastAttemptId?: number | null;
}): { label: string; detail: string | null } {
  const hasAttempt =
    quiz.lastAttemptId != null || typeof quiz.resultPercent === "number";
  const status = quiz.resultStatus.trim();
  const statusKey = normalizeStudentQuizStatus(status);
  const lookedLikeResult =
    statusKey.includes("complete") ||
    statusKey.includes("review") ||
    statusKey.includes("submit") ||
    statusKey.includes("result");

  if (!hasAttempt && !lookedLikeResult) {
    return { label: "—", detail: null };
  }

  if (typeof quiz.resultPercent === "number") {
    const noisy = /^(completed|attempted|submitted)$/i.test(status);
    return {
      label: `${Math.round(quiz.resultPercent)}%`,
      detail: noisy || status.length === 0 ? null : status,
    };
  }

  const announced = quiz.resultAnnouncedPercent;
  if (typeof announced === "number") {
    return {
      label: status.length > 0 ? status : "Pending",
      detail: `${Math.round(announced)}% announced`,
    };
  }

  return { label: "Pending", detail: status.length > 0 ? status : null };
}

/** Show the other-attempts control when a quiz has more than two submitted runs. */
export function canSwitchOtherQuizAttempts(
  attempts: readonly QuizAttemptSummary[] | null | undefined,
): boolean {
  return (attempts?.length ?? 0) > 2;
}
