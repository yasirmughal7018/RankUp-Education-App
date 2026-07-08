import type { UserRole } from "@/core/api/types";

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

export function canManageQuizzes(role: UserRole): boolean {
  return QUIZ_MANAGER_ROLES.includes(role);
}

export function isDraftQuiz(status: string): boolean {
  return status.toLowerCase() === "draft";
}

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

export function createEmptyQuizQuestionInput(): AddQuizQuestionInput {
  return {
    questionText: "",
    questionType: "MCQ",
    marks: 1,
    estimatedTimeSeconds: 60,
    hint: "",
    explanation: "",
    options: [
      { optionText: "", isCorrect: true },
      { optionText: "", isCorrect: false },
    ],
  };
}

export function mapQuizQuestionToInput(
  question: QuizQuestionItem,
): AddQuizQuestionInput {
  const isMcq = question.questionType.toLowerCase().includes("mcq");

  return {
    questionText: question.questionText,
    questionType: question.questionType,
    marks: question.marks,
    estimatedTimeSeconds: 60,
    hint: question.hint ?? "",
    explanation: "",
    options: isMcq
      ? question.options.map((option) => ({
          optionText: option.optionText,
          isCorrect: option.isCorrect,
        }))
      : [
          { optionText: "", isCorrect: true },
          { optionText: "", isCorrect: false },
        ],
  };
}

export function buildQuizQuestionPayload(input: AddQuizQuestionInput) {
  const isMcq = input.questionType.toLowerCase().includes("mcq");

  return {
    questionText: input.questionText.trim(),
    questionType: input.questionType,
    marks: input.marks,
    estimatedTimeSeconds: input.estimatedTimeSeconds,
    hint: input.hint.trim() || null,
    explanation: input.explanation.trim() || null,
    options: isMcq
      ? input.options
          .filter((option) => option.optionText.trim())
          .map((option) => ({
            optionText: option.optionText.trim(),
            isCorrect: option.isCorrect,
          }))
      : [],
  };
}
