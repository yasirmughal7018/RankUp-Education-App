/**
 * Question bank domain types and helpers.
 *
 * 3-tier approval visibility (set by who approves):
 *   CampusAdmin → Campus | SchoolAdmin → School | PortalAdmin → Public
 * Lifecycle (activate / deactivate / archive) is PortalAdmin-only.
 */
import type { UserRole } from "@/core/api/types";

export interface QuestionOptionInput {
  optionText: string;
  isCorrect: boolean;
  optionImageUrl?: string | null;
}

export interface QuestionOption extends QuestionOptionInput {
  optionId: number;
}

export interface QuestionAcceptedAnswerInput {
  answerText: string;
  isCaseSensitive: boolean;
  allowPartialMatch: boolean;
  minimumLength: number;
  maximumLength: number;
  allowAiReview: boolean;
  allowTeacherReview: boolean;
}

export interface QuestionAcceptedAnswer extends QuestionAcceptedAnswerInput {
  acceptedAnswerId: number;
}

/** Visibility tier after approval: None | Campus | School | Public. */
export type QuestionVisibility = "None" | "Campus" | "School" | "Public" | string;

/** List-row shape returned by GET /questions. */
export interface QuestionSummary {
  questionId: number;
  questionText: string;
  questionType: string;
  status: string;
  classId: number;
  subjectId: number;
  difficultyLevel: number;
  marks: number;
  estimatedTimeSeconds?: number;
  /** Comma-separated correct options / accepted answers when provided by list API. */
  correctAnswerPreview?: string;
  isActive: boolean;
  createdBy: string;
  /** Display name for creator (from app_users). */
  createdByName?: string;
  approvedBy: string | null;
  /** Display name for approver (from app_users). */
  approvedByName?: string | null;
  /** Legacy compatibility flag (not an AI gate). Prefer approvedBy + Approved + Public. */
  isAiApproved: boolean;
  schoolId?: number | null;
  campusId?: number | null;
  /** Campus / School / Public once approved; None while pending. */
  visibility?: QuestionVisibility;
  createdDate: string;
  modifiedDate: string;
}

/** Full question including options / accepted answers for detail & edit. */
export interface QuestionDetail {
  questionId: number;
  questionText: string;
  questionType: string;
  classId: number;
  subjectId: number;
  topicId: number | null;
  difficultyLevel: number;
  status: string;
  marks: number;
  estimatedTimeSeconds: number;
  hint: string | null;
  explanation: string | null;
  isActive: boolean;
  createdBy: string;
  /** Display name for creator (from app_users). */
  createdByName?: string;
  approvedBy: string | null;
  /** Display name for approver (from app_users). */
  approvedByName?: string | null;
  /** Legacy compatibility flag (not an AI gate). Prefer approvedBy + Approved + Public. */
  isAiApproved: boolean;
  schoolId?: number | null;
  campusId?: number | null;
  visibility?: QuestionVisibility;
  createdDate: string;
  modifiedDate: string;
  options: QuestionOption[];
  acceptedAnswers: QuestionAcceptedAnswer[];
  rejectionReason?: string | null;
  /** Workflow trail from app_approval, oldest first. */
  approvalHistory?: QuestionApprovalHistoryEntry[];
}

/** One entry in a question's approval trail. */
export interface QuestionApprovalHistoryEntry {
  approvalId: number;
  /** Created | SubmittedForReview | Endorsed | Published | Rejected | Activated | Deactivated | Archived | Unarchived | Modified. */
  action: string;
  actorUserId: number;
  actorName: string;
  actorRole: string;
  reason: string | null;
  occurredAt: string;
}

/** Client form model for create / edit. */
export interface QuestionFormValues {
  questionText: string;
  questionType: string;
  classId: number;
  subjectId: number;
  topicId: number | null;
  difficultyLevel: number;
  marks: number;
  estimatedTimeSeconds: number;
  hint: string;
  explanation: string;
  options: QuestionOptionInput[];
  acceptedAnswers: QuestionAcceptedAnswerInput[];
}

/** Optional server-side list query params. */
export interface QuestionListFilters {
  isActive?: boolean;
  subjectId?: number;
  classId?: number;
  pendingApprovalOnly?: boolean;
  eligibleForQuizOnly?: boolean;
}

/** Sticky scope kept while adding multiple questions in one session. */
export interface QuestionScopeValues {
  classId: number;
  subjectId: number;
  topicId: number | null;
  difficultyLevel: number;
}

/**
 * Types offered on create: web (`/questions/new`), quiz inline, Mobile, and Excel import.
 * File Upload and Media stay in the bank for existing rows; they are not offered on create.
 */
export const QUESTION_TYPES_NOW = [
  "Single Choice",
  "Multiple Choice",
  "True/False",
  "Fill in the Blanks",
  "Descriptive",
  "Matching",
  "Ordering",
] as const;

/** All known types, including File Upload / Media kept for existing rows and later re-enable. */
export const QUESTION_TYPES = [
  ...QUESTION_TYPES_NOW,
  "File Upload",
  "Media",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];
export type QuestionTypeNow = (typeof QUESTION_TYPES_NOW)[number];

/** True when the type can be created via the current UI. */
export function isCreatableQuestionType(type: string): boolean {
  const normalized = normalizeQuestionType(type);
  return (QUESTION_TYPES_NOW as readonly string[]).includes(normalized);
}

export const QUESTION_TYPE_META: Record<
  QuestionType,
  { label: string; shortLabel: string; description: string }
> = {
  "Single Choice": {
    label: "Single Choice",
    shortLabel: "Single",
    description: "Student picks exactly one correct option.",
  },
  "Multiple Choice": {
    label: "Multiple Choice",
    shortLabel: "Multi",
    description: "Student can select one or more correct options.",
  },
  "True/False": {
    label: "True / False",
    shortLabel: "T/F",
    description: "Fixed True and False options; mark one as correct.",
  },
  "Fill in the Blanks": {
    label: "Fill in the Blanks",
    shortLabel: "Fill",
    description: "Add accepted answer texts students may type.",
  },
  Descriptive: {
    label: "Descriptive",
    shortLabel: "Essay",
    description: "Open written answer; marked by a teacher.",
  },
  "File Upload": {
    label: "File Upload",
    shortLabel: "File",
    description:
      "Student pastes a file link or path (MVP — no binary upload yet); teacher reviews.",
  },
  Matching: {
    label: "Matching",
    shortLabel: "Match",
    description:
      "Author pairs (left ↔ right). Stored as lefts first, then rights; students match each left to a right.",
  },
  Ordering: {
    label: "Ordering",
    shortLabel: "Order",
    description: "List items in the correct sequence (top to bottom).",
  },
  Media: {
    label: "Media",
    shortLabel: "Media",
    description: "Image/media choice; student picks one correct option.",
  },
};

/** Roles allowed into the question bank routes (not Students). */
export const QUESTION_MANAGER_ROLES: UserRole[] = [
  "PortalAdmin",
  "SchoolAdmin",
  "CampusAdmin",
  "Teacher",
  "Parent",
  "Coordinator",
  "Tutor",
];

/** Whether the role may browse / create in the question bank. */
export function canManageQuestions(role: UserRole): boolean {
  return QUESTION_MANAGER_ROLES.includes(role);
}

/**
 * Whether the role may endorse / reject / publish PendingReview items.
 * CampusAdmin and SchoolAdmin endorse; PortalAdmin publishes.
 */
export function canApproveQuestions(role: UserRole): boolean {
  return (
    role === "PortalAdmin" ||
    role === "SchoolAdmin" ||
    role === "CampusAdmin"
  );
}

/**
 * Endorse / reject / publish this question. Matches API: no self-approve except
 * PortalAdmin. Same-tier still 403s if the creator is a peer admin.
 */
export function canApproveOrRejectQuestion(args: {
  role: UserRole;
  userId: number | string;
  createdBy: string;
}): boolean {
  if (!canApproveQuestions(args.role)) {
    return false;
  }

  if (args.role === "PortalAdmin") {
    return true;
  }

  return String(args.userId) !== String(args.createdBy);
}

/**
 * Visibility stamped when this role endorses/publishes.
 * CampusAdmin → Campus (endorsement), SchoolAdmin → School (endorsement),
 * PortalAdmin → Public (publish).
 */
export function approvalVisibilityForRole(role: UserRole): QuestionVisibility {
  switch (role) {
    case "PortalAdmin":
      return "Public";
    case "SchoolAdmin":
      return "School";
    case "CampusAdmin":
      return "Campus";
    default:
      return "None";
  }
}

/** True when this role's approval publishes (Public + Active). */
export function approvalPublishes(role: UserRole): boolean {
  return role === "PortalAdmin";
}

/** Activate / deactivate / archive — PortalAdmin only. */
export function canLifecycleQuestions(role: UserRole): boolean {
  return role === "PortalAdmin";
}

/** PendingReview (canonical) plus legacy Pending / UnderReview aliases. */
export function isPendingQuestionStatus(status: string): boolean {
  const normalized = status.toLowerCase().replace(/\s+/g, "");
  // Canonical: PendingReview. Legacy aliases still recognized for old rows.
  return ["pendingreview", "pending", "underreview"].includes(normalized);
}

export function isDraftQuestionStatus(status: string): boolean {
  return status.trim().toLowerCase() === "draft";
}

/** Rejected or legacy Declined. */
export function isRejectedQuestionStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized === "rejected" || normalized === "declined";
}

/** Approved (canonical) plus legacy Active / Published status names. */
export function isApprovedQuestionStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  // Canonical: Approved. Legacy Active/Published still recognized for old rows.
  return ["approved", "active", "published"].includes(normalized);
}

export function isArchivedQuestionStatus(status: string): boolean {
  return status.trim().toLowerCase() === "archived";
}

/** Canonical QuestionStatus lookup IDs (110–114). */
export const QUESTION_STATUS_IDS = {
  Draft: 110,
  PendingReview: 111,
  Approved: 112,
  Rejected: 113,
  Archived: 114,
} as const;

/** Statuses where the owner (non-PortalAdmin) may still edit or delete. */
export function isOwnerEditableQuestionStatus(status: string): boolean {
  return (
    isPendingQuestionStatus(status) ||
    isRejectedQuestionStatus(status) ||
    // Legacy Draft rows remain editable until API migrates them to PendingReview.
    isDraftQuestionStatus(status)
  );
}

/**
 * Edit / delete permission: PortalAdmin any status;
 * otherwise owner + PendingReview / Rejected (or legacy Draft).
 */
export function canMutateQuestion(args: {
  role: UserRole;
  userId: number | string;
  createdBy: string;
  status: string;
}): boolean {
  if (canLifecycleQuestions(args.role)) {
    return true;
  }

  const isOwner = String(args.userId) === String(args.createdBy);
  return isOwner && isOwnerEditableQuestionStatus(args.status);
}

/**
 * Quiz-bank attach eligibility: Published by PortalAdmin (Public + Active + Approved).
 */
export function isEligibleForQuizQuestion(question: {
  isActive: boolean;
  approvedBy: string | null;
  status: string;
  visibility?: string | null;
}): boolean {
  const visibility = (question.visibility ?? "").trim().toLowerCase();
  return (
    question.isActive &&
    Boolean(question.approvedBy?.trim()) &&
    isApprovedQuestionStatus(question.status) &&
    visibility === "public"
  );
}

/** True when Approved but not yet Public (Campus/School endorsement). */
export function isEndorsedNotPublishedQuestion(question: {
  status: string;
  visibility?: string | null;
}): boolean {
  if (!isApprovedQuestionStatus(question.status)) {
    return false;
  }
  const visibility = (question.visibility ?? "").trim().toLowerCase();
  return visibility === "campus" || visibility === "school";
}

/** Canonical workflow status label (never mixes IsActive). */
export function displayQuestionStatusLabel(status: string): string {
  if (isPendingQuestionStatus(status) || isDraftQuestionStatus(status)) {
    return "Pending";
  }
  if (isApprovedQuestionStatus(status)) {
    return "Approved";
  }
  if (isRejectedQuestionStatus(status)) {
    return "Rejected";
  }
  if (isArchivedQuestionStatus(status)) {
    return "Archived";
  }
  return status.trim() || "Unknown";
}

/**
 * Single list/table status label.
 * Active is shown only when Status=Approved and IsActive=true;
 * Approved+inactive shows Approved; other statuses stay Pending/Rejected/Archived.
 */
export function displayQuestionListStatusLabel(
  status: string,
  isActive: boolean,
): string {
  if (isApprovedQuestionStatus(status) && isActive) {
    return "Active";
  }
  return displayQuestionStatusLabel(status);
}

/** PortalAdmin may activate only Published (Public) + inactive questions. */
export function canActivateQuestion(args: {
  role: UserRole;
  status: string;
  isActive: boolean;
  visibility?: string | null;
}): boolean {
  const visibility = (args.visibility ?? "").trim().toLowerCase();
  return (
    canLifecycleQuestions(args.role) &&
    isApprovedQuestionStatus(args.status) &&
    visibility === "public" &&
    !args.isActive
  );
}

/** PortalAdmin may deactivate only Published (Public) + active questions. */
export function canDeactivateQuestion(args: {
  role: UserRole;
  status: string;
  isActive: boolean;
  visibility?: string | null;
}): boolean {
  const visibility = (args.visibility ?? "").trim().toLowerCase();
  return (
    canLifecycleQuestions(args.role) &&
    isApprovedQuestionStatus(args.status) &&
    visibility === "public" &&
    args.isActive
  );
}

/** PortalAdmin may archive any non-archived question. */
export function canArchiveQuestion(args: {
  role: UserRole;
  status: string;
}): boolean {
  return (
    canLifecycleQuestions(args.role) && !isArchivedQuestionStatus(args.status)
  );
}

/** PortalAdmin may unarchive an archived question (restores prior Approved/Pending state). */
export function canUnarchiveQuestion(args: {
  role: UserRole;
  status: string;
}): boolean {
  return (
    canLifecycleQuestions(args.role) && isArchivedQuestionStatus(args.status)
  );
}

/** Normalize free-text / legacy type strings to a canonical QuestionType. */
export function normalizeQuestionType(type: string): QuestionType {
  const value = type.trim().toLowerCase();

  if (
    value === "single choice" ||
    value === "singlechoice" ||
    value === "mcq"
  ) {
    return "Single Choice";
  }

  if (
    value === "multiple choice" ||
    value === "multiplechoice" ||
    value === "multi select" ||
    value === "multiselect" ||
    value === "multiple"
  ) {
    return "Multiple Choice";
  }

  if (value.includes("true") && value.includes("false")) {
    return "True/False";
  }

  if (value.includes("fill") && value.includes("blank")) {
    return "Fill in the Blanks";
  }

  if (
    value === "descriptive" ||
    value === "short answer" ||
    value === "shortanswer"
  ) {
    return "Descriptive";
  }

  if (
    value === "file upload" ||
    value === "fileupload" ||
    value === "file" ||
    value === "file answer"
  ) {
    return "File Upload";
  }

  if (value === "matching" || value === "match") {
    return "Matching";
  }

  if (
    value === "ordering" ||
    value === "order" ||
    value === "sequence"
  ) {
    return "Ordering";
  }

  if (
    value === "media" ||
    value === "media question" ||
    value === "image choice"
  ) {
    return "Media";
  }

  return "Single Choice";
}

export function isSingleChoiceType(type: string): boolean {
  const normalized = normalizeQuestionType(type);
  return normalized === "Single Choice" || normalized === "Media";
}

export function isMultipleChoiceType(type: string): boolean {
  return normalizeQuestionType(type) === "Multiple Choice";
}

export function isTrueFalseType(type: string): boolean {
  return normalizeQuestionType(type) === "True/False";
}

export function isFillBlankType(type: string): boolean {
  return normalizeQuestionType(type) === "Fill in the Blanks";
}

export function isDescriptiveType(type: string): boolean {
  return normalizeQuestionType(type) === "Descriptive";
}

export function isFileUploadType(type: string): boolean {
  return normalizeQuestionType(type) === "File Upload";
}

export function isMatchingType(type: string): boolean {
  return normalizeQuestionType(type) === "Matching";
}

export function isOrderingType(type: string): boolean {
  return normalizeQuestionType(type) === "Ordering";
}

export function isMediaType(type: string): boolean {
  return normalizeQuestionType(type) === "Media";
}

/** MCQ-style types that store discrete option rows. */
export function usesAnswerOptions(type: string): boolean {
  const normalized = normalizeQuestionType(type);
  return (
    normalized === "Single Choice" ||
    normalized === "Multiple Choice" ||
    normalized === "True/False" ||
    normalized === "Matching" ||
    normalized === "Ordering" ||
    normalized === "Media"
  );
}

/** Fill-in types that store accepted-answer rows instead of options. */
export function usesAcceptedAnswers(type: string): boolean {
  return isFillBlankType(type);
}

export function createEmptyAcceptedAnswer(): QuestionAcceptedAnswerInput {
  return {
    answerText: "",
    isCaseSensitive: false,
    allowPartialMatch: false,
    minimumLength: 0,
    maximumLength: 1000,
    allowAiReview: false,
    allowTeacherReview: false,
  };
}

/** Seed accepted-answer rows for Fill in the Blanks; empty otherwise. */
export function defaultAcceptedAnswersForType(
  type: string,
): QuestionAcceptedAnswerInput[] {
  return isFillBlankType(type) ? [createEmptyAcceptedAnswer()] : [];
}

/** Matching storage layout: [lefts…, rights…] with equal counts; pair i = lefts[i] ↔ rights[i]. */
export function matchingPairCount(options: QuestionOptionInput[]): number {
  return Math.floor(options.length / 2);
}

/** Append one left + one right, preserving lefts-then-rights order. */
export function addMatchingPair(
  options: QuestionOptionInput[],
): QuestionOptionInput[] {
  const half = matchingPairCount(options);
  const lefts = options.slice(0, half);
  const rights = options.slice(half, half * 2);
  const blank: QuestionOptionInput = { optionText: "", isCorrect: false };
  return [...lefts, blank, ...rights, { ...blank }];
}

/** Remove pair at index while keeping even lefts-then-rights layout (min 2 pairs). */
export function removeMatchingPair(
  options: QuestionOptionInput[],
  pairIndex: number,
): QuestionOptionInput[] {
  const half = matchingPairCount(options);
  if (half <= 2 || pairIndex < 0 || pairIndex >= half) {
    return options;
  }

  const lefts = options.slice(0, half).filter((_, index) => index !== pairIndex);
  const rights = options
    .slice(half, half * 2)
    .filter((_, index) => index !== pairIndex);
  return [...lefts, ...rights];
}

/** Update left or right text for one matching pair. */
export function updateMatchingPairSide(
  options: QuestionOptionInput[],
  pairIndex: number,
  side: "left" | "right",
  optionText: string,
): QuestionOptionInput[] {
  const half = matchingPairCount(options);
  if (pairIndex < 0 || pairIndex >= half) {
    return options;
  }

  const index = side === "left" ? pairIndex : half + pairIndex;
  return options.map((option, currentIndex) =>
    currentIndex === index ? { ...option, optionText } : option,
  );
}

/** Default option rows (or none) for the given question type. */
export function defaultOptionsForType(type: string): QuestionOptionInput[] {
  const normalized = normalizeQuestionType(type);

  switch (normalized) {
    case "True/False":
      return [
        { optionText: "True", isCorrect: true },
        { optionText: "False", isCorrect: false },
      ];
    case "Fill in the Blanks":
    case "Descriptive":
    case "File Upload":
      return [];
    case "Matching":
      return [
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
      ];
    case "Ordering":
      return [
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
      ];
    case "Multiple Choice":
      return [
        { optionText: "", isCorrect: true },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
      ];
    case "Media":
      return [
        { optionText: "", isCorrect: true, optionImageUrl: "" },
        { optionText: "", isCorrect: false, optionImageUrl: "" },
        { optionText: "", isCorrect: false, optionImageUrl: "" },
        { optionText: "", isCorrect: false, optionImageUrl: "" },
      ];
    case "Single Choice":
    default:
      return [
        { optionText: "", isCorrect: true },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
      ];
  }
}

/** Empty create form, optionally pre-filled with sticky batch scope. */
export function createEmptyQuestionForm(
  scope?: Partial<QuestionScopeValues>,
): QuestionFormValues {
  return {
    questionText: "",
    questionType: "Single Choice",
    classId: scope?.classId ?? 0,
    subjectId: scope?.subjectId ?? 0,
    topicId: scope?.topicId ?? null,
    difficultyLevel: scope?.difficultyLevel ?? 0,
    marks: 1,
    estimatedTimeSeconds: 60,
    hint: "",
    explanation: "",
    options: defaultOptionsForType("Single Choice"),
    acceptedAnswers: [],
  };
}

/**
 * After a successful save: keep Class / Subject / Topic / Difficulty (and type/marks),
 * clear question text and rebuild options for the current type.
 */
export function resetQuestionContent(
  current: QuestionFormValues,
): QuestionFormValues {
  return {
    ...createEmptyQuestionForm({
      classId: current.classId,
      subjectId: current.subjectId,
      topicId: current.topicId,
      difficultyLevel: current.difficultyLevel,
    }),
    questionType: current.questionType,
    marks: current.marks,
    estimatedTimeSeconds: current.estimatedTimeSeconds,
    options: defaultOptionsForType(current.questionType),
    acceptedAnswers: defaultAcceptedAnswersForType(current.questionType),
  };
}

/**
 * Map API detail → form values.
 * Legacy fill-in rows stored as options are promoted to acceptedAnswers.
 */
export function mapDetailToForm(detail: QuestionDetail): QuestionFormValues {
  const questionType = normalizeQuestionType(detail.questionType);
  const acceptedFromApi = detail.acceptedAnswers ?? [];
  // Older fill-in questions stored answers as options; migrate into acceptedAnswers.
  const legacyFillFromOptions =
    isFillBlankType(questionType) &&
    acceptedFromApi.length === 0 &&
    detail.options.length > 0;

  return {
    questionText: detail.questionText,
    questionType,
    classId: detail.classId,
    subjectId: detail.subjectId,
    topicId: detail.topicId,
    difficultyLevel: detail.difficultyLevel,
    marks: detail.marks,
    estimatedTimeSeconds: detail.estimatedTimeSeconds,
    hint: detail.hint ?? "",
    explanation: detail.explanation ?? "",
    options: isFillBlankType(questionType) || isFileUploadType(questionType)
      ? []
      : detail.options.length > 0
        ? detail.options.map((option) => ({
            optionText: option.optionText,
            isCorrect: option.isCorrect,
            optionImageUrl: option.optionImageUrl ?? "",
          }))
        : defaultOptionsForType(questionType),
    acceptedAnswers: isFillBlankType(questionType)
      ? acceptedFromApi.length > 0
        ? acceptedFromApi.map((answer) => ({
            answerText: answer.answerText,
            isCaseSensitive: answer.isCaseSensitive,
            allowPartialMatch: answer.allowPartialMatch,
            minimumLength: answer.minimumLength,
            maximumLength: answer.maximumLength,
            allowAiReview: answer.allowAiReview,
            allowTeacherReview: answer.allowTeacherReview,
          }))
        : legacyFillFromOptions
          ? detail.options.map((option) => ({
              ...createEmptyAcceptedAnswer(),
              answerText: option.optionText,
            }))
          : defaultAcceptedAnswersForType(questionType)
      : [],
  };
}

/** Build create/update API body; drops empty options / answers by type. */
export function buildQuestionPayload(values: QuestionFormValues) {
  const questionType = normalizeQuestionType(values.questionType);
  const withOptions = usesAnswerOptions(questionType);
  const withAccepted = usesAcceptedAnswers(questionType);

  return {
    questionText: values.questionText.trim(),
    questionType,
    classId: values.classId,
    subjectId: values.subjectId,
    topicId: values.topicId,
    difficultyLevel: values.difficultyLevel,
    marks: values.marks,
    estimatedTimeSeconds: values.estimatedTimeSeconds,
    hint: values.hint.trim() || null,
    explanation: values.explanation.trim() || null,
    options: withOptions
      ? values.options
          .filter(
            (option) =>
              option.optionText.trim() ||
              Boolean(option.optionImageUrl?.trim()),
          )
          .map((option) => ({
            optionText: option.optionText.trim(),
            isCorrect: option.isCorrect,
            optionImageUrl: option.optionImageUrl?.trim() || null,
          }))
      : [],
    acceptedAnswers: withAccepted
      ? values.acceptedAnswers
          .filter((answer) => answer.answerText.trim())
          .map((answer) => ({
            answerText: answer.answerText.trim(),
            isCaseSensitive: answer.isCaseSensitive,
            allowPartialMatch: answer.allowPartialMatch,
            minimumLength: answer.minimumLength,
            maximumLength: answer.maximumLength,
            allowAiReview: answer.allowAiReview,
            allowTeacherReview: answer.allowTeacherReview,
          }))
      : [],
  };
}

/** Client-side validation; returns the first error message or null if valid. */
export function validateQuestionForm(values: QuestionFormValues): string | null {
  if (!values.questionText.trim()) {
    return "Question text is required.";
  }

  if (values.marks <= 0) {
    return "Marks must be greater than zero.";
  }

  if (values.classId <= 0 || values.subjectId <= 0) {
    return "Class and subject are required.";
  }

  if (values.difficultyLevel <= 0) {
    return "Difficulty level is required.";
  }

  const questionType = normalizeQuestionType(values.questionType);

  if (!isCreatableQuestionType(questionType)) {
    return "Choose a supported question type.";
  }

  if (isDescriptiveType(questionType) || isFileUploadType(questionType)) {
    return null;
  }

  const options = values.options.filter(
    (option) =>
      option.optionText.trim() || Boolean(option.optionImageUrl?.trim()),
  );
  const acceptedAnswers = values.acceptedAnswers.filter((answer) =>
    answer.answerText.trim(),
  );

  if (questionType === "Single Choice") {
    if (options.length < 2) {
      return "Single Choice needs at least two options.";
    }
    if (options.filter((option) => option.isCorrect).length !== 1) {
      return "Mark exactly one option as correct.";
    }
  }

  if (questionType === "Media") {
    if (options.length < 2) {
      return "Media needs at least two options.";
    }
    if (options.some((option) => !option.optionImageUrl?.trim())) {
      return "Each Media option needs an image URL.";
    }
    if (options.filter((option) => option.isCorrect).length !== 1) {
      return "Mark exactly one option as correct.";
    }
  }

  if (questionType === "Multiple Choice") {
    if (options.length < 2) {
      return "Multiple Choice needs at least two options.";
    }
    if (!options.some((option) => option.isCorrect)) {
      return "Mark at least one option as correct.";
    }
  }

  if (questionType === "True/False") {
    if (options.length !== 2) {
      return "True/False must have True and False options.";
    }
    if (options.filter((option) => option.isCorrect).length !== 1) {
      return "Mark either True or False as correct.";
    }
  }

  if (questionType === "Fill in the Blanks") {
    if (acceptedAnswers.length < 1) {
      return "Add at least one accepted answer.";
    }
  }

  if (questionType === "Matching") {
    if (options.length < 4 || options.length % 2 !== 0) {
      return "Matching needs an even number of options (left items first, then matching right items).";
    }
  }

  if (questionType === "Ordering") {
    if (options.length < 2) {
      return "Ordering needs at least two items.";
    }
  }

  return null;
}
