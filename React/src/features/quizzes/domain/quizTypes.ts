import type { UserRole } from "@/core/api/types";
import {
  createEmptyAcceptedAnswer,
  defaultAcceptedAnswersForType,
  defaultOptionsForType,
  isFillBlankType,
  normalizeQuestionType,
  usesAnswerOptions,
} from "@/features/questions/domain/questionTypes";

export interface QuizSummary {
  id: number;
  title: string;
  subject: string;
  grade: string;
  questionCount: number;
  points: number;
  status: string;
  description: string;
  quizType: string;
  topic: string;
  difficulty: string;
  totalMarks: number;
  timeLimitMinutes: number | null;
  attemptLimit: number;
  startAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  instructions: string[];
  reviewAvailable: boolean;
  resultStatus: string;
  resultPercent: number | null;
  createdBy: string;
  schoolName: string;
}

export interface QuizQuestionOption {
  optionId: number;
  optionText: string;
  isCorrect: boolean;
  optionImageUrl?: string | null;
}

export interface QuizQuestionAcceptedAnswer {
  acceptedAnswerId: number;
  answerText: string;
  isCaseSensitive: boolean;
  allowPartialMatch: boolean;
  minimumLength: number;
  maximumLength: number;
  allowAiReview: boolean;
  allowTeacherReview: boolean;
}

export interface QuizQuestionItem {
  questionId: number;
  questionText: string;
  questionType: string;
  marks: number;
  displayOrder: number;
  hint: string | null;
  estimatedTimeSeconds: number;
  options: QuizQuestionOption[];
  acceptedAnswers?: QuizQuestionAcceptedAnswer[];
}

export type QuizNavigationMode = "Free" | "Sequential" | "Locked";

/** Post-submit review: what students see on the result screen. */
export type QuizReviewDisplayMode =
  | "Full"
  | "CorrectAnswers"
  | "ScoreOnly"
  | "Withheld";

export interface ManageQuiz {
  id: number;
  title: string;
  description: string;
  subject: string;
  grade: string;
  topic: string;
  quizType: string;
  difficulty: string;
  lifecycleStatus: string;
  approvalStatus: string;
  rejectionReason: string | null;
  classId: number;
  subjectId: number;
  topicId: number;
  difficultyLevelId: number;
  questionCount: number;
  totalMarks: number;
  /** When set, each attempt presents this many randomly chosen questions from the pool. */
  randomQuestionCount?: number | null;
  timeLimitMinutes: number | null;
  allowedAttempts: number | null;
  instructions: string[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  isReviewRequired: boolean;
  navigationMode: QuizNavigationMode;
  reviewDisplayMode: QuizReviewDisplayMode;
  createdBy: string;
  createdByDisplayName?: string;
  createdAt?: string;
  createdByRole?: UserRole | string | null;
  schoolName: string;
  schoolId?: number | null;
  campusId?: number | null;
  questions: QuizQuestionItem[];
  /** Workflow trail from app_approval, oldest first. */
  approvalHistory?: QuizApprovalHistoryEntry[];
  myEditRequest?: QuizEditRequestSummary | null;
  hasApprovedEditGrant?: boolean;
  pendingEditRequests?: QuizEditRequestSummary[] | null;
}

export interface QuizEditRequestSummary {
  requestId: number;
  quizId: number;
  requesterName: string;
  requesterRole: string;
  reason: string;
  status: string;
  requestedAt: string;
  resolvedAt?: string | null;
  hasUnusedEditGrant: boolean;
  decisionReason?: string | null;
}

export interface QuizEditRequestListItem {
  requestId: number;
  quizId: number;
  quizTitle: string;
  requesterName: string;
  requesterRole: string;
  reason: string;
  requestedAt: string;
}

/** One entry in a quiz's approval trail. */
export interface QuizApprovalHistoryEntry {
  approvalId: number;
  /** Created | SubmittedForReview | Endorsed | Approved | Rejected | Archived | Unarchived | Modified. */
  action: string;
  actorUserId: number;
  actorName: string;
  actorRole: string;
  reason: string | null;
  occurredAt: string;
}

export interface QuizFormValues {
  title: string;
  description: string;
  classId: number;
  subjectId: number;
  topicId: number;
  difficultyLevelId: number;
  quizTypeId: number;
  instructions: string;
  timeLimitMinutes: number | null;
  allowedAttempts: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  /** Random N-of-M subset per attempt; null = all questions. */
  randomQuestionCount: number | null;
  isReviewRequired: boolean;
  navigationMode: QuizNavigationMode;
  reviewDisplayMode: QuizReviewDisplayMode;
  contextStudentId: number | null;
  /** PortalAdmin create: optional target school (omit / null → 0). SchoolAdmin uses token school. */
  schoolId: number | null;
  /** PortalAdmin / SchoolAdmin create: optional campus (omit / null → 0). */
  campusId: number | null;
}

export interface AddQuizQuestionInput {
  questionText: string;
  questionType: string;
  marks: number;
  estimatedTimeSeconds: number;
  hint: string;
  explanation: string;
  options: Array<{
    optionText: string;
    isCorrect: boolean;
    optionImageUrl?: string | null;
  }>;
  acceptedAnswers: Array<{
    answerText: string;
    isCaseSensitive: boolean;
    allowPartialMatch: boolean;
    minimumLength: number;
    maximumLength: number;
    allowAiReview: boolean;
    allowTeacherReview: boolean;
  }>;
}

export type UpdateQuizQuestionInput = AddQuizQuestionInput;

export interface AttachBankQuestionInput {
  questionId: number;
  marks?: number | null;
}

export interface PendingQuizApproval {
  quizId: number;
  title: string;
  createdBy: string;
  schoolName: string;
  subjectName: string;
  gradeName: string;
  quizTypeName: string;
  approvalStatus: string;
  lifecycleStatus: string;
  totalQuestions: number;
  modifiedDate: string;
  rejectionReason?: string | null;
}

export interface AssignQuizInput {
  mode: string;
  studentIds: number[];
  groupId: number | null;
  startAt: string;
  endAt: string;
  allowedAttempts: number;
  gradeId: number | null;
  section?: string | null;
  schoolIds?: number[] | null;
  campusId?: number | null;
}

export interface QuizAssignment {
  assignmentId: number;
  studentId: number;
  studentName: string;
  groupId: number | null;
  startAt: string;
  endAt: string;
  allowedAttempts: number;
  attemptCount: number;
  isReviewDone: boolean;
  resultStatus: string;
}

export const QUIZ_MANAGER_ROLES: UserRole[] = [
  "Teacher",
  "Parent",
  "Coordinator",
  "CampusAdmin",
  "SchoolAdmin",
  "PortalAdmin",
];

/** Roles that author/create quizzes (Teacher, Parent, Coordinator, CampusAdmin, and school/platform admins). */
export const QUIZ_AUTHOR_ROLES: UserRole[] = [
  "Teacher",
  "Parent",
  "Coordinator",
  "CampusAdmin",
  "SchoolAdmin",
  "PortalAdmin",
];

/** True for Teacher, Parent, Coordinator, SchoolAdmin, and PortalAdmin. */
export function canManageQuizzes(role: UserRole): boolean {
  return QUIZ_MANAGER_ROLES.includes(role);
}

/** True for roles that may create / edit quizzes (includes CampusAdmin). */
export function canAuthorQuizzes(role: UserRole): boolean {
  return QUIZ_AUTHOR_ROLES.includes(role);
}

/** True for SchoolAdmin or PortalAdmin school/platform assign modes. */
export function canAssignAdminAudiences(role: UserRole): boolean {
  return role === "SchoolAdmin" || role === "PortalAdmin";
}

/** School/campus/platform staff see the shared published school-quiz catalog, not only quizzes they created. */
export function canViewOrgQuizCatalog(role: UserRole): boolean {
  return (
    role === "PortalAdmin" ||
    role === "SchoolAdmin" ||
    role === "CampusAdmin" ||
    role === "Teacher" ||
    role === "Coordinator" ||
    role === "Parent"
  );
}

/** Default for the optional "Mine only" list filter — off so the shared published catalog is visible by default (§6a). */
export function defaultQuizListMineOnly(_role: UserRole | undefined): boolean {
  return false;
}

/** True for roles that may approve/reject teacher quizzes. */
export function canApproveQuizzes(role: UserRole): boolean {
  return (
    role === "SchoolAdmin" ||
    role === "CampusAdmin" ||
    role === "PortalAdmin"
  );
}

/** School/campus first-tier approval. */
export function isSchoolApprovedQuizStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, "");
  return normalized === "schoolapproved";
}

/** Portal final approval required before assignment. */
export function isFinalApprovedQuizStatus(status: string): boolean {
  return status.trim().toLowerCase() === "approved";
}

/** School quiz types shown on create (Practice, Assessment, Competition, Surprise). */
function isSchoolQuizTypeName(quizType: string): boolean {
  const normalized = quizType.trim().toLowerCase().replace(/\s+/g, "");
  return (
    normalized === "practice" ||
    normalized === "assessment" ||
    normalized === "competition" ||
    normalized === "surprise"
  );
}

/** SchoolAdmin reviews Teacher/Coordinator/CampusAdmin quizzes; CampusAdmin reviews Teacher/Coordinator only. */
export function canReviewQuizApproval(
  role: UserRole,
  _quizType: string,
  createdByRole?: UserRole | string | null,
): boolean {
  if (!canApproveQuizzes(role)) {
    return false;
  }

  if (createdByRole === "CampusAdmin") {
    return role === "SchoolAdmin" || role === "PortalAdmin";
  }

  if (
    (role === "SchoolAdmin" || role === "CampusAdmin") &&
    isPortalAdminOnlyQuizCreator(createdByRole)
  ) {
    return false;
  }

  return true;
}

/**
 * Approver review mode on /quizzes/:id — show approve/reject only (no edit, assign, publish).
 * SchoolAdmin: Pending Teacher/Coordinator/CampusAdmin quizzes in school, not own quiz.
 * CampusAdmin: Pending Teacher/Coordinator quizzes in campus, not own quiz.
 * Portal: Pending or SchoolApproved (final approve), including SchoolAdmin/Parent-created when Pending.
 */
export function canApproveQuizOnDetailPage(
  role: UserRole,
  userId: number | string,
  createdBy: string,
  quizType: string,
  lifecycleStatus: string,
  approvalStatus: string,
  createdByRole?: UserRole | string | null,
): boolean {
  if (!canReviewQuizApproval(role, quizType, createdByRole)) {
    return false;
  }

  if (!isDraftQuiz(lifecycleStatus) || isRejectedQuizApprovalStatus(approvalStatus)) {
    return false;
  }

  if (role !== "PortalAdmin" && isQuizOwner(userId, createdBy)) {
    return false;
  }

  if (role === "PortalAdmin") {
    return (
      isPendingQuizApprovalStatus(approvalStatus) ||
      isSchoolApprovedQuizStatus(approvalStatus)
    );
  }

  return isPendingQuizApprovalStatus(approvalStatus);
}

/** Primary approve button label on quiz detail review mode. */
export function quizApprovalButtonLabel(role: UserRole): string {
  return role === "PortalAdmin" ? "Approve" : "School approve";
}

/**
 * Delete (draft) or archive (published+): portal admin always;
 * owner when draft; published/assigned → portal admin only.
 */
export function canDeleteOrArchiveQuiz(
  role: UserRole,
  userId: number | string,
  createdBy: string,
  lifecycleStatus: string,
  _approvalStatus: string,
  _quizType: string,
): boolean {
  if (role === "PortalAdmin") {
    return true;
  }

  if (!isQuizOwner(userId, createdBy)) {
    return false;
  }

  // Owners may delete their own Draft. Published / Assigned / Archived → PortalAdmin only.
  return isDraftQuiz(lifecycleStatus);
}

/** True once the owner has submitted the quiz for approval (trail event). */
export function hasQuizSubmittedForReview(
  approvalHistory?: QuizApprovalHistoryEntry[],
): boolean {
  return (
    approvalHistory?.some((entry) => entry.action === "SubmittedForReview") ??
    false
  );
}

/** Draft + Pending + questions + submitted — awaiting approver decision. */
export function isQuizAwaitingApprovalReview(
  lifecycleStatus: string,
  approvalStatus: string,
  questionCount: number,
  approvalHistory?: QuizApprovalHistoryEntry[],
): boolean {
  return (
    isDraftQuiz(lifecycleStatus) &&
    isPendingQuizApprovalStatus(approvalStatus) &&
    questionCount > 0 &&
    hasQuizSubmittedForReview(approvalHistory)
  );
}

/** Creator submits a draft quiz for school/portal review; lifecycle stays Draft. Owner only — PortalAdmin reviews, they do not submit. */
export function canSubmitQuizForReview(
  role: UserRole,
  userId: number | string,
  createdBy: string,
  lifecycleStatus: string,
  approvalStatus: string,
  questionCount: number,
  settingsEditable: boolean,
  approvalHistory?: QuizApprovalHistoryEntry[],
): boolean {
  if (!settingsEditable || !isDraftQuiz(lifecycleStatus) || questionCount <= 0) {
    return false;
  }

  if (
    isQuizAwaitingApprovalReview(
      lifecycleStatus,
      approvalStatus,
      questionCount,
      approvalHistory,
    )
  ) {
    return false;
  }

  if (
    isRejectedQuizApprovalStatus(approvalStatus) ||
    isSchoolApprovedQuizStatus(approvalStatus) ||
    isFinalApprovedQuizStatus(approvalStatus)
  ) {
    return false;
  }

  return isQuizOwnerWhoMaySubmitForReview(role, userId, createdBy);
}

/** Owner resubmits after reject. The rejecting PortalAdmin (or any non-owner) cannot resubmit. */
export function canResubmitQuizForReview(
  role: UserRole,
  userId: number | string,
  createdBy: string,
  lifecycleStatus: string,
  approvalStatus: string,
  questionCount: number,
): boolean {
  if (!isDraftQuiz(lifecycleStatus) || questionCount <= 0) {
    return false;
  }

  if (!isRejectedQuizApprovalStatus(approvalStatus)) {
    return false;
  }

  return isQuizOwnerWhoMaySubmitForReview(role, userId, createdBy);
}

function isQuizOwnerWhoMaySubmitForReview(
  role: UserRole,
  userId: number | string,
  createdBy: string,
): boolean {
  if (role === "PortalAdmin" || !isQuizOwner(userId, createdBy)) {
    return false;
  }

  return (
    role === "Teacher" ||
    role === "Coordinator" ||
    role === "SchoolAdmin" ||
    role === "CampusAdmin" ||
    role === "Parent"
  );
}

/** Whether the caller may assign this quiz (mirrors API RequireAssignableQuizAsync gates). */
export function canAssignQuiz(
  role: UserRole,
  lifecycleStatus: string,
  approvalStatus: string,
  questionCount: number,
  _quizType: string,
): boolean {
  if (!isPublishedQuizLifecycle(lifecycleStatus) || questionCount <= 0) {
    return false;
  }

  if (
    role === "Teacher" ||
    role === "Coordinator" ||
    role === "PortalAdmin" ||
    role === "CampusAdmin" ||
    role === "Parent"
  ) {
    return isFinalApprovedQuizStatus(approvalStatus);
  }

  if (role === "SchoolAdmin") {
    return (
      isFinalApprovedQuizStatus(approvalStatus) ||
      isSchoolApprovedQuizStatus(approvalStatus)
    );
  }

  return false;
}

/**
 * Org-scoped mutations (SchoolAdmin/CampusAdmin assign, campus archive checks).
 * Teacher/Coordinator/Parent may still assign a published school-type quiz
 * from the shared catalog to their own roster/children even when this is false.
 */
export function isQuizInManageOrgScope(
  role: UserRole,
  callerSchoolId: number | null | undefined,
  callerCampusId: number | null | undefined,
  quizSchoolId: number | null | undefined,
  quizCampusId: number | null | undefined,
): boolean {
  if (role === "PortalAdmin") {
    return true;
  }

  if (role === "Parent") {
    return true;
  }

  if (role === "SchoolAdmin") {
    return quizSchoolId != null && quizSchoolId === callerSchoolId;
  }

  if (role === "CampusAdmin" || role === "Teacher" || role === "Coordinator") {
    return (
      quizSchoolId != null &&
      quizSchoolId === callerSchoolId &&
      quizCampusId != null &&
      quizCampusId === callerCampusId
    );
  }

  return false;
}

/** Quiz types shown on create — school types for every authoring role, including Parent. */
export function quizTypesForRole(
  role: UserRole | undefined,
  allTypes: Array<{ id: number; name: string }>,
): Array<{ id: number; name: string }> {
  const schoolTypes = allTypes.filter((type) => isSchoolQuizTypeName(type.name));
  if (!role) {
    return schoolTypes.length > 0 ? schoolTypes : allTypes;
  }

  if (
    role === "Teacher" ||
    role === "Coordinator" ||
    role === "SchoolAdmin" ||
    role === "CampusAdmin" ||
    role === "PortalAdmin" ||
    role === "Parent"
  ) {
    return schoolTypes;
  }

  return schoolTypes.length > 0 ? schoolTypes : allTypes;
}

/** Portal admin publishes an approved draft quiz to the catalog (lifecycle → Published). */
export function canPortalPublishQuiz(
  role: UserRole,
  lifecycleStatus: string,
  approvalStatus: string,
  _quizType: string,
  createdByRole?: UserRole | string | null,
): boolean {
  if (role !== "PortalAdmin" || !isDraftQuiz(lifecycleStatus)) {
    return false;
  }

  if (isPortalAdminOnlyQuizCreator(createdByRole)) {
    return (
      isPendingQuizApprovalStatus(approvalStatus) ||
      isFinalApprovedQuizStatus(approvalStatus)
    );
  }

  return (
    isSchoolApprovedQuizStatus(approvalStatus) ||
    isFinalApprovedQuizStatus(approvalStatus)
  );
}

/** SchoolAdmin / Parent / PortalAdmin creators skip school endorsement. CampusAdmin goes to SchoolAdmin first. */
export function isPortalAdminOnlyQuizCreator(
  role: UserRole | string | null | undefined,
): boolean {
  return (
    role === "SchoolAdmin" ||
    role === "Parent" ||
    role === "PortalAdmin"
  );
}

/** Single rejection status (legacy Cancelled/Declined map here). */
export function isRejectedQuizApprovalStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "rejected" ||
    normalized === "declined" ||
    normalized === "cancelled"
  );
}

/** Assign modes supported by API for the given role (canonical source for Assign dialog). */
export function assignModesForRole(role: UserRole): Array<{
  value: string;
  label: string;
  group: string;
}> {
  const studentModes = [
    { value: "one", label: "One student", group: "Students" },
    { value: "selected", label: "Selected students", group: "Students" },
  ];

  if (role === "Parent") {
    return [
      ...studentModes,
      { value: "group", label: "Group", group: "Groups" },
      {
        value: "alllinked",
        label: "All linked children",
        group: "Parent",
      },
    ];
  }

  if (role === "SchoolAdmin") {
    return [
      ...studentModes,
      {
        value: "allinschool",
        label: "All in school",
        group: "School",
      },
    ];
  }

  if (role === "CampusAdmin") {
    return [
      ...studentModes,
      { value: "allingrade", label: "All in grade", group: "Class" },
      { value: "allinsection", label: "All in section", group: "Class" },
    ];
  }

  if (role === "PortalAdmin") {
    return [
      ...studentModes,
      {
        value: "allinschool",
        label: "All in school",
        group: "School",
      },
      {
        value: "multischool",
        label: "Multiple schools",
        group: "Platform",
      },
      {
        value: "public",
        label: "Public (catalog)",
        group: "Platform",
      },
    ];
  }

  // Teacher (default)
  return [
    ...studentModes,
    { value: "group", label: "Group", group: "Groups" },
    { value: "allingrade", label: "All in grade", group: "Class" },
    { value: "allinsection", label: "All in section", group: "Class" },
  ];
}

/** Instruction lines to show on detail screens — skip the quiz title (already in the page header). */
export function visibleQuizInstructions(
  title: string,
  instructions: string[],
): string[] {
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedTitle) {
    return instructions.filter((line) => line.trim().length > 0);
  }

  return instructions.filter((line) => {
    const normalized = line.trim().toLowerCase();
    return normalized.length > 0 && normalized !== normalizedTitle;
  });
}

/** User-facing status combining lifecycle + approval (staff catalog / manage UI). */
export function resolveQuizDisplayStatus(
  lifecycleStatus: string,
  approvalStatus: string,
  questionCount: number,
  approvalHistory?: QuizApprovalHistoryEntry[],
): string {
  const lifecycle = lifecycleStatus.trim().toLowerCase();
  const approval = approvalStatus.trim().toLowerCase();

  if (!isDraftQuiz(lifecycle)) {
    return lifecycleStatus.trim();
  }

  if (isRejectedQuizApprovalStatus(approval)) {
    return "Rejected";
  }

  if (isSchoolApprovedQuizStatus(approval)) {
    return "School Approved";
  }

  if (isFinalApprovedQuizStatus(approval)) {
    return "Awaiting Publish";
  }

  if (
    isQuizAwaitingApprovalReview(
      lifecycleStatus,
      approvalStatus,
      questionCount,
      approvalHistory,
    )
  ) {
    return "Approval Pending";
  }

  return "Draft";
}

export function isUnpublishedQuizDisplayStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    isDraftQuiz(normalized) ||
    normalized === "approval pending" ||
    normalized === "school approved" ||
    normalized === "awaiting publish" ||
    normalized === "rejected"
  );
}

export function formatQuizDisplayStatusLabel(status: string): string {
  const raw = status.trim();
  if (!raw) {
    return "Unknown";
  }

  const normalized = raw.toLowerCase();
  if (normalized === "approval pending") {
    return "Approval Pending";
  }
  if (normalized === "school approved") {
    return "School Approved";
  }
  if (normalized === "awaiting publish") {
    return "Awaiting Publish";
  }
  if (isDraftQuiz(normalized)) {
    return "Draft";
  }

  return raw
    .split(/[\s_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** Initial editable lifecycle: Draft (legacy "Not Assigned" still accepted). */
export function isDraftQuiz(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "draft" || normalized === "not assigned";
}

/** Published or assigned — required before students can be assigned. */
export function isPublishedQuizLifecycle(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "published" || normalized === "assigned";
}

export function isPendingQuizApprovalStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "pending" ||
    normalized === "under review" ||
    normalized === "approval pending" ||
    normalized === "pending approval"
  );
}

/** True when an assignment window has opened or any attempt exists (mirrors API HasStartedAssignments). */
export function hasQuizAssignmentStarted(
  assignments: Array<{ startAt: string; attemptCount: number }>,
  now: number = Date.now(),
): boolean {
  return assignments.some(
    (assignment) =>
      new Date(assignment.startAt).getTime() <= now ||
      assignment.attemptCount > 0,
  );
}

/**
 * Metadata/questions may change only while Draft or Published,
 * and no assignment has started — matches QuizManageGuard.EnsureEditableLifecycle.
 */
export function isQuizMetadataEditable(
  lifecycleStatus: string,
  assignments: Array<{ startAt: string; attemptCount: number }> = [],
): boolean {
  const normalized = lifecycleStatus.trim().toLowerCase();
  if (isDraftQuiz(normalized)) {
    return true;
  }

  if (normalized === "published") {
    return !hasQuizAssignmentStarted(assignments);
  }

  return false;
}

/** True when the signed-in user created the quiz row. */
export function isQuizOwner(
  userId: number | string,
  createdBy: string,
): boolean {
  return String(userId) === String(createdBy);
}

/** True when the owner must request permission before editing. */
export function isQuizLockedForOwnerEdit(
  lifecycleStatus: string,
  approvalStatus: string,
): boolean {
  if (isPublishedQuizLifecycle(lifecycleStatus)) {
    return true;
  }

  return (
    isDraftQuiz(lifecycleStatus) &&
    (isSchoolApprovedQuizStatus(approvalStatus) ||
      isFinalApprovedQuizStatus(approvalStatus))
  );
}

/** Quiz settings and questions: owner or Portal Admin, while lifecycle allows edits. */
export function canEditQuizSettings(
  role: UserRole,
  userId: number | string,
  createdBy: string,
  lifecycleStatus: string,
  assignments: Array<{ startAt: string; attemptCount: number }> = [],
  approvalStatus: string = "Pending",
  hasApprovedEditGrant: boolean = false,
): boolean {
  if (hasQuizAssignmentStarted(assignments)) {
    return false;
  }

  const lifecycleAllows =
    isDraftQuiz(lifecycleStatus) || isPublishedQuizLifecycle(lifecycleStatus);
  if (!lifecycleAllows) {
    return false;
  }

  if (role === "PortalAdmin") {
    return true;
  }

  if (!isQuizOwner(userId, createdBy)) {
    return false;
  }

  if (hasApprovedEditGrant) {
    return true;
  }

  if (isQuizLockedForOwnerEdit(lifecycleStatus, approvalStatus)) {
    return false;
  }

  return isQuizMetadataEditable(lifecycleStatus, assignments);
}

export function canRequestQuizEdit(args: {
  role: UserRole;
  userId: number | string;
  createdBy: string;
  lifecycleStatus: string;
  approvalStatus: string;
  hasApprovedEditGrant?: boolean;
  myEditRequestStatus?: string | null;
  assignments?: Array<{ startAt: string; attemptCount: number }>;
}): boolean {
  if (args.role === "PortalAdmin" || !isQuizOwner(args.userId, args.createdBy)) {
    return false;
  }

  if (args.hasApprovedEditGrant) {
    return false;
  }

  if (hasQuizAssignmentStarted(args.assignments ?? [])) {
    return false;
  }

  if (!isQuizLockedForOwnerEdit(args.lifecycleStatus, args.approvalStatus)) {
    return false;
  }

  return (args.myEditRequestStatus ?? "").toLowerCase() !== "pending";
}

export function canReviewQuizEditRequests(role: UserRole): boolean {
  return (
    role === "PortalAdmin" ||
    role === "SchoolAdmin" ||
    role === "CampusAdmin"
  );
}

/** Normalize API/form navigation mode to a known value. */
export function normalizeQuizNavigationMode(
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

/** Review display modes are retired — results are always Full once review is not pending. */
export function normalizeQuizReviewDisplayMode(
  _value?: string | null,
): QuizReviewDisplayMode {
  void _value;
  return "Full";
}

/** Default values for the create-quiz form (Assessment-aligned until a type is chosen). */
export function createEmptyQuizForm(): QuizFormValues {
  return {
    title: "",
    description: "",
    classId: 0,
    subjectId: 0,
    topicId: 0,
    difficultyLevelId: 0,
    quizTypeId: 0,
    instructions: "Read all questions carefully before answering.",
    timeLimitMinutes: null,
    allowedAttempts: 1,
    shuffleQuestions: false,
    shuffleOptions: true,
    randomQuestionCount: null,
    isReviewRequired: true,
    navigationMode: "Free",
    reviewDisplayMode: "Full",
    contextStudentId: null,
    schoolId: null,
    campusId: null,
  };
}

/** Type-specific create defaults — mirrors WebApi QuizTypeBehavior.ResolveDefaults. */
export function resolveQuizTypeDefaults(quizTypeName: string): Pick<
  QuizFormValues,
  | "timeLimitMinutes"
  | "allowedAttempts"
  | "shuffleQuestions"
  | "shuffleOptions"
  | "isReviewRequired"
  | "navigationMode"
  | "reviewDisplayMode"
> {
  const name = quizTypeName.trim().toLowerCase().replace(/\s+/g, "");

  if (name === "practice") {
    return {
      allowedAttempts: 3,
      timeLimitMinutes: null,
      shuffleQuestions: false,
      shuffleOptions: false,
      isReviewRequired: false,
      navigationMode: "Free",
      reviewDisplayMode: "Full",
    };
  }

  if (name === "competition") {
    return {
      allowedAttempts: 1,
      timeLimitMinutes: null,
      shuffleQuestions: true,
      shuffleOptions: true,
      isReviewRequired: false,
      navigationMode: "Locked",
      reviewDisplayMode: "Full",
    };
  }

  if (name === "surprise") {
    return {
      allowedAttempts: 1,
      timeLimitMinutes: null,
      shuffleQuestions: true,
      shuffleOptions: true,
      isReviewRequired: false,
      navigationMode: "Sequential",
      reviewDisplayMode: "Full",
    };
  }

  // Assessment (default school type)
  return {
    allowedAttempts: 1,
    timeLimitMinutes: null,
    shuffleQuestions: false,
    shuffleOptions: true,
    isReviewRequired: true,
    navigationMode: "Free",
    reviewDisplayMode: "Full",
  };
}

/** Map API manage model to form state. */
export function mapManageQuizToForm(quiz: ManageQuiz): QuizFormValues {
  return {
    title: quiz.title,
    description: quiz.description,
    classId: quiz.classId,
    subjectId: quiz.subjectId,
    topicId: quiz.topicId,
    difficultyLevelId: quiz.difficultyLevelId,
    quizTypeId: 0,
    instructions: quiz.instructions.join("\n"),
    timeLimitMinutes: quiz.timeLimitMinutes,
    allowedAttempts: quiz.allowedAttempts,
    shuffleQuestions: quiz.shuffleQuestions,
    shuffleOptions: quiz.shuffleOptions,
    randomQuestionCount: quiz.randomQuestionCount ?? null,
    isReviewRequired: quiz.isReviewRequired,
    navigationMode: normalizeQuizNavigationMode(quiz.navigationMode),
    reviewDisplayMode: normalizeQuizReviewDisplayMode(quiz.reviewDisplayMode),
    contextStudentId: null,
    schoolId: null,
    campusId: null,
  };
}

/** Serialize form values for create/update API. */
export function buildQuizPayload(values: QuizFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    classId: values.classId,
    subjectId: values.subjectId,
    topicId: values.topicId,
    difficultyLevelId: values.difficultyLevelId,
    quizTypeId: values.quizTypeId > 0 ? values.quizTypeId : null,
    instructions: values.instructions.trim(),
    timeLimitMinutes: null,
    allowedAttempts: values.allowedAttempts,
    shuffleQuestions: values.shuffleQuestions,
    shuffleOptions: values.shuffleOptions,
    randomQuestionCount: values.randomQuestionCount,
    isReviewRequired: values.isReviewRequired,
    navigationMode: normalizeQuizNavigationMode(values.navigationMode),
    reviewDisplayMode: "Full" as const,
    contextStudentId: values.contextStudentId,
    schoolId: values.schoolId,
    campusId: values.campusId,
  };
}

/** Client-side validation; returns error message or null. */
export function validateQuizForm(values: QuizFormValues, requireQuizType = false): string | null {
  if (!values.title.trim()) {
    return "Title is required.";
  }

  if (!values.instructions.trim()) {
    return "Instructions are required.";
  }

  if (values.classId <= 0 || values.subjectId <= 0) {
    return "Class and subject are required.";
  }

  // Topic and difficulty are optional on create/edit.

  if (requireQuizType && values.quizTypeId <= 0) {
    return "Quiz type is required.";
  }

  if (
    values.randomQuestionCount != null &&
    values.randomQuestionCount > 0 &&
    values.randomQuestionCount > 999
  ) {
    return "Random question count must be 999 or less.";
  }

  return null;
}

/** Format a duration from total seconds, e.g. 70 → "1 min 10 sec". */
export function formatQuizDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds <= 0) {
    return "—";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes <= 0) {
    return `${remainder} sec`;
  }
  if (remainder === 0) {
    return `${minutes} min`;
  }
  return `${minutes} min ${remainder} sec`;
}

/** Sum of question marks on a quiz. */
export function sumQuizMarks(
  questions: Array<{ marks?: number | null }>,
): number {
  return questions.reduce(
    (sum, question) => sum + Math.max(0, question.marks ?? 0),
    0,
  );
}

/** Sum of estimated question durations in seconds. */
export function sumQuizEstimatedSeconds(
  questions: Array<{ estimatedTimeSeconds?: number | null }>,
): number {
  return questions.reduce(
    (sum, question) => sum + Math.max(0, question.estimatedTimeSeconds ?? 0),
    0,
  );
}

/** Suggested quiz time limit in minutes from question estimated durations (ceil). */
export function suggestTimeLimitMinutes(
  questions: Array<{ estimatedTimeSeconds?: number | null }>,
): number | null {
  const totalSeconds = sumQuizEstimatedSeconds(questions);
  if (totalSeconds <= 0) {
    return null;
  }
  return Math.max(1, Math.ceil(totalSeconds / 60));
}

/** Default inline question editor state. */
export function createEmptyQuizQuestionInput(): AddQuizQuestionInput {
  return {
    questionText: "",
    questionType: "Single Choice",
    marks: 1,
    estimatedTimeSeconds: 60,
    hint: "",
    explanation: "",
    options: [
      { optionText: "", isCorrect: true },
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false },
    ],
    acceptedAnswers: [],
  };
}

/** Map quiz question to editor input shape. */
export function mapQuizQuestionToInput(
  question: QuizQuestionItem,
): AddQuizQuestionInput {
  const questionType = normalizeQuestionType(question.questionType);
  const acceptedFromApi = question.acceptedAnswers ?? [];

  return {
    questionText: question.questionText,
    questionType,
    marks: question.marks,
    estimatedTimeSeconds: question.estimatedTimeSeconds || 60,
    hint: question.hint ?? "",
    explanation: "",
    options: usesAnswerOptions(questionType)
      ? question.options.length > 0
        ? question.options.map((option) => ({
            optionText: option.optionText,
            isCorrect: option.isCorrect,
            optionImageUrl: option.optionImageUrl ?? "",
          }))
        : defaultOptionsForType(questionType)
      : [],
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
        : question.options.length > 0
          ? question.options.map((option) => ({
              ...createEmptyAcceptedAnswer(),
              answerText: option.optionText,
            }))
          : defaultAcceptedAnswersForType(questionType)
      : [],
  };
}

/** Serialize question editor for API. */
export function buildQuizQuestionPayload(input: AddQuizQuestionInput) {
  const questionType = normalizeQuestionType(input.questionType);
  const filledOptions = input.options
    .filter(
      (option) =>
        option.optionText.trim() || Boolean(option.optionImageUrl?.trim()),
    )
    .map((option) => ({
      optionText: option.optionText.trim(),
      isCorrect: option.isCorrect,
      optionImageUrl: option.optionImageUrl?.trim() || null,
    }));

  const filledAccepted = input.acceptedAnswers
    .filter((answer) => answer.answerText.trim())
    .map((answer) => ({
      answerText: answer.answerText.trim(),
      isCaseSensitive: answer.isCaseSensitive,
      allowPartialMatch: answer.allowPartialMatch,
      minimumLength: answer.minimumLength,
      maximumLength: answer.maximumLength,
      allowAiReview: answer.allowAiReview,
      allowTeacherReview: answer.allowTeacherReview,
    }));

  return {
    questionText: input.questionText.trim(),
    questionType,
    marks: input.marks,
    estimatedTimeSeconds: input.estimatedTimeSeconds,
    hint: input.hint.trim() || null,
    explanation: input.explanation.trim() || null,
    options: usesAnswerOptions(questionType) ? filledOptions : [],
    acceptedAnswers: isFillBlankType(questionType) ? filledAccepted : [],
  };
}