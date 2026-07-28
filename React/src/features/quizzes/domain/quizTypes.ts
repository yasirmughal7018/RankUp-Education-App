import type { UserRole } from "@/core/api/types";
import {
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
}

export interface AddQuizQuestionInput {
  questionText: string;
  questionType: string;
  marks: number;
  estimatedTimeSeconds: number;
  hint: string;
  explanation: string;
  options: Array<{ optionText: string; isCorrect: boolean }>;
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

export const QUIZ_MANAGER_ROLES: UserRole[] = ["Teacher", "Parent"];

/** True for Teacher and Parent roles. */
export function canManageQuizzes(role: UserRole): boolean {
  return QUIZ_MANAGER_ROLES.includes(role);
}

/** Initial editable lifecycle: deployed lookup uses "Not Assigned"; "Draft" is legacy. */
export function isDraftQuiz(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "not assigned" || normalized === "draft";
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

/** Normalize API/form review display mode to a known value. */
export function normalizeQuizReviewDisplayMode(
  value: string | null | undefined,
): QuizReviewDisplayMode {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "full") {
    return "Full";
  }
  if (normalized === "correctanswers" || normalized === "correct") {
    return "CorrectAnswers";
  }
  if (normalized === "withheld" || normalized === "none") {
    return "Withheld";
  }
  return "ScoreOnly";
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
    timeLimitMinutes: 45,
    allowedAttempts: 1,
    shuffleQuestions: false,
    shuffleOptions: true,
    isReviewRequired: true,
    navigationMode: "Free",
    reviewDisplayMode: "ScoreOnly",
    contextStudentId: null,
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
      timeLimitMinutes: 30,
      shuffleQuestions: true,
      shuffleOptions: true,
      isReviewRequired: false,
      navigationMode: "Locked",
      reviewDisplayMode: "Withheld",
    };
  }

  if (name === "surprise") {
    return {
      allowedAttempts: 1,
      timeLimitMinutes: 15,
      shuffleQuestions: true,
      shuffleOptions: true,
      isReviewRequired: false,
      navigationMode: "Sequential",
      reviewDisplayMode: "Withheld",
    };
  }

  if (name === "parentprivate" || name === "private") {
    return {
      allowedAttempts: 2,
      timeLimitMinutes: 30,
      shuffleQuestions: false,
      shuffleOptions: false,
      isReviewRequired: true,
      navigationMode: "Free",
      reviewDisplayMode: "CorrectAnswers",
    };
  }

  // Assessment (default school type)
  return {
    allowedAttempts: 1,
    timeLimitMinutes: 45,
    shuffleQuestions: false,
    shuffleOptions: true,
    isReviewRequired: true,
    navigationMode: "Free",
    reviewDisplayMode: "ScoreOnly",
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
    timeLimitMinutes: values.timeLimitMinutes,
    allowedAttempts: values.allowedAttempts,
    shuffleQuestions: values.shuffleQuestions,
    shuffleOptions: values.shuffleOptions,
    isReviewRequired: values.isReviewRequired,
    navigationMode: normalizeQuizNavigationMode(values.navigationMode),
    reviewDisplayMode: normalizeQuizReviewDisplayMode(values.reviewDisplayMode),
    contextStudentId: values.contextStudentId,
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

  if (values.classId <= 0 || values.subjectId <= 0 || values.topicId <= 0) {
    return "Class, subject, and topic are required.";
  }

  if (values.difficultyLevelId <= 0) {
    return "Difficulty level is required.";
  }

  if (requireQuizType && values.quizTypeId <= 0) {
    return "Quiz type is required.";
  }

  return null;
}

/** Suggested quiz time limit in minutes from question estimated durations. */
export function suggestTimeLimitMinutes(
  questions: Array<{ estimatedTimeSeconds?: number | null }>,
): number | null {
  const totalSeconds = questions.reduce(
    (sum, question) => sum + Math.max(0, question.estimatedTimeSeconds ?? 0),
    0,
  );
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
  };
}

/** Map quiz question to editor input shape. */
export function mapQuizQuestionToInput(
  question: QuizQuestionItem,
): AddQuizQuestionInput {
  const questionType = normalizeQuestionType(question.questionType);
  const canUseOptions =
    usesAnswerOptions(questionType) || isFillBlankType(questionType);

  return {
    questionText: question.questionText,
    questionType,
    marks: question.marks,
    estimatedTimeSeconds: 60,
    hint: question.hint ?? "",
    explanation: "",
    options: canUseOptions
      ? question.options.length > 0
        ? question.options.map((option) => ({
            optionText: option.optionText,
            isCorrect: option.isCorrect || isFillBlankType(questionType),
          }))
        : isFillBlankType(questionType)
          ? [{ optionText: "", isCorrect: true }]
          : defaultOptionsForType(questionType)
      : [],
  };
}

/** Serialize question editor for API. */
export function buildQuizQuestionPayload(input: AddQuizQuestionInput) {
  const questionType = normalizeQuestionType(input.questionType);
  const filledOptions = input.options
    .filter((option) => option.optionText.trim())
    .map((option) => ({
      optionText: option.optionText.trim(),
      isCorrect: isFillBlankType(questionType) ? true : option.isCorrect,
    }));

  return {
    questionText: input.questionText.trim(),
    questionType,
    marks: input.marks,
    estimatedTimeSeconds: input.estimatedTimeSeconds,
    hint: input.hint.trim() || null,
    explanation: input.explanation.trim() || null,
    // Choice types send options; Fill sends accepted answers as options (API converts).
    options:
      usesAnswerOptions(questionType) || isFillBlankType(questionType)
        ? filledOptions
        : [],
  };
}