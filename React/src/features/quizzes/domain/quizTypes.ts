import type { UserRole } from "@/core/api/types";
import {
  defaultOptionsForType,
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
  options: QuizQuestionOption[];
}

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
  instructions: string;
  timeLimitMinutes: number | null;
  allowedAttempts: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  isReviewRequired: boolean;
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

/** Lifecycle status is draft (editable). */
export function isDraftQuiz(status: string): boolean {
  return status.toLowerCase() === "draft";
}

/** Default values for the create-quiz form. */
export function createEmptyQuizForm(): QuizFormValues {
  return {
    title: "",
    description: "",
    classId: 0,
    subjectId: 0,
    topicId: 0,
    difficultyLevelId: 0,
    instructions: "Read all questions carefully before answering.",
    timeLimitMinutes: 30,
    allowedAttempts: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
    isReviewRequired: false,
    contextStudentId: null,
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
    instructions: quiz.instructions.join("\n"),
    timeLimitMinutes: quiz.timeLimitMinutes,
    allowedAttempts: quiz.allowedAttempts,
    shuffleQuestions: quiz.shuffleQuestions,
    shuffleOptions: quiz.shuffleOptions,
    isReviewRequired: quiz.isReviewRequired,
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
    instructions: values.instructions.trim(),
    timeLimitMinutes: values.timeLimitMinutes,
    allowedAttempts: values.allowedAttempts,
    shuffleQuestions: values.shuffleQuestions,
    shuffleOptions: values.shuffleOptions,
    isReviewRequired: values.isReviewRequired,
    contextStudentId: values.contextStudentId,
  };
}

/** Client-side validation; returns error message or null. */
export function validateQuizForm(values: QuizFormValues): string | null {
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

  return null;
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

  return {
    questionText: question.questionText,
    questionType,
    marks: question.marks,
    estimatedTimeSeconds: 60,
    hint: question.hint ?? "",
    explanation: "",
    options: usesAnswerOptions(questionType)
      ? question.options.length > 0
        ? question.options.map((option) => ({
            optionText: option.optionText,
            isCorrect: option.isCorrect,
          }))
        : defaultOptionsForType(questionType)
      : [],
  };
}

/** Serialize question editor for API. */
export function buildQuizQuestionPayload(input: AddQuizQuestionInput) {
  const questionType = normalizeQuestionType(input.questionType);

  return {
    questionText: input.questionText.trim(),
    questionType,
    marks: input.marks,
    estimatedTimeSeconds: input.estimatedTimeSeconds,
    hint: input.hint.trim() || null,
    explanation: input.explanation.trim() || null,
    options: usesAnswerOptions(questionType)
      ? input.options
          .filter((option) => option.optionText.trim())
          .map((option) => ({
            optionText: option.optionText.trim(),
            isCorrect: option.isCorrect,
          }))
      : [],
  };
}