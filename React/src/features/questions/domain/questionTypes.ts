import type { UserRole } from "@/core/api/types";
import { isAdminRole } from "@/core/api/types";

export interface QuestionOptionInput {
  optionText: string;
  isCorrect: boolean;
}

export interface QuestionOption extends QuestionOptionInput {
  optionId: number;
}

export interface QuestionSummary {
  questionId: number;
  questionText: string;
  questionType: string;
  status: string;
  marks: number;
  isActive: boolean;
  createdBy: string;
  approvedBy: string | null;
  isAiApproved: boolean;
  createdDate: string;
  modifiedDate: string;
}

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
  approvedBy: string | null;
  isAiApproved: boolean;
  createdDate: string;
  modifiedDate: string;
  options: QuestionOption[];
}

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
}

export interface QuestionListFilters {
  isActive?: boolean;
  subjectId?: number;
  classId?: number;
  pendingApprovalOnly?: boolean;
}

export const QUESTION_TYPES = ["MCQ", "Descriptive"] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_MANAGER_ROLES: UserRole[] = [
  "SuperAdmin",
  "SchoolAdmin",
  "Teacher",
  "Parent",
];

export function canManageQuestions(role: UserRole): boolean {
  return QUESTION_MANAGER_ROLES.includes(role);
}

export function canApproveQuestions(role: UserRole): boolean {
  return isAdminRole(role);
}

export function canAiApproveQuestions(role: UserRole): boolean {
  return role === "SuperAdmin";
}

export function isPendingQuestionStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return ["pending", "draft", "under review"].includes(normalized);
}

export function isApprovedQuestionStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return ["approved", "active", "published"].includes(normalized);
}

export function createEmptyQuestionForm(): QuestionFormValues {
  return {
    questionText: "",
    questionType: "MCQ",
    classId: 0,
    subjectId: 0,
    topicId: null,
    difficultyLevel: 0,
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

export function mapDetailToForm(detail: QuestionDetail): QuestionFormValues {
  return {
    questionText: detail.questionText,
    questionType: detail.questionType,
    classId: detail.classId,
    subjectId: detail.subjectId,
    topicId: detail.topicId,
    difficultyLevel: detail.difficultyLevel,
    marks: detail.marks,
    estimatedTimeSeconds: detail.estimatedTimeSeconds,
    hint: detail.hint ?? "",
    explanation: detail.explanation ?? "",
    options:
      detail.options.length > 0
        ? detail.options.map((option) => ({
            optionText: option.optionText,
            isCorrect: option.isCorrect,
          }))
        : createEmptyQuestionForm().options,
  };
}

export function buildQuestionPayload(values: QuestionFormValues) {
  const isMcq = values.questionType.toLowerCase().includes("mcq");

  return {
    questionText: values.questionText.trim(),
    questionType: values.questionType,
    classId: values.classId,
    subjectId: values.subjectId,
    topicId: values.topicId,
    difficultyLevel: values.difficultyLevel,
    marks: values.marks,
    estimatedTimeSeconds: values.estimatedTimeSeconds,
    hint: values.hint.trim() || null,
    explanation: values.explanation.trim() || null,
    options: isMcq
      ? values.options
          .filter((option) => option.optionText.trim())
          .map((option) => ({
            optionText: option.optionText.trim(),
            isCorrect: option.isCorrect,
          }))
      : [],
  };
}

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

  if (values.questionType.toLowerCase().includes("mcq")) {
    const options = values.options.filter((option) => option.optionText.trim());

    if (options.length < 2) {
      return "MCQ questions need at least two options.";
    }

    if (!options.some((option) => option.isCorrect)) {
      return "At least one option must be marked correct.";
    }
  }

  return null;
}
