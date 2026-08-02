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
  timeLimitMinutes: number | null;
  allowedAttempts: number | null;
  instructions: string[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  isReviewRequired: boolean;
  navigationMode: QuizNavigationMode;
  reviewDisplayMode: QuizReviewDisplayMode;
  createdBy: string;
  schoolName: string;
  questions: QuizQuestionItem[];
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
  "SchoolAdmin",
  "PortalAdmin",
];

/** Roles that author/create quizzes (Teacher, Parent, and school/platform admins). */
export const QUIZ_AUTHOR_ROLES: UserRole[] = [
  "Teacher",
  "Parent",
  "SchoolAdmin",
  "PortalAdmin",
];

/** True for Teacher, Parent, SchoolAdmin, and PortalAdmin. */
export function canManageQuizzes(role: UserRole): boolean {
  return QUIZ_MANAGER_ROLES.includes(role);
}

/** True for roles that may create / edit / publish quizzes. */
export function canAuthorQuizzes(role: UserRole): boolean {
  return QUIZ_AUTHOR_ROLES.includes(role);
}

/** True for SchoolAdmin or PortalAdmin school/platform assign modes. */
export function canAssignAdminAudiences(role: UserRole): boolean {
  return role === "SchoolAdmin" || role === "PortalAdmin";
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

/** Initial editable lifecycle: deployed lookup uses "Not Assigned"; "Draft" is legacy. */
export function isDraftQuiz(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "not assigned" || normalized === "draft";
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
 * Metadata/questions may change only while Not Assigned/Draft or Published,
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

  if (name === "parentprivate" || name === "private") {
    return {
      allowedAttempts: 2,
      timeLimitMinutes: null,
      shuffleQuestions: false,
      shuffleOptions: false,
      isReviewRequired: true,
      navigationMode: "Free",
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