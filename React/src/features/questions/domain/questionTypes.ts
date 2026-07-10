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
  rejectionReason?: string | null;
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
  eligibleForQuizOnly?: boolean;
}

/** Sticky scope kept while adding multiple questions. */
export interface QuestionScopeValues {
  classId: number;
  subjectId: number;
  topicId: number | null;
  difficultyLevel: number;
}

export const QUESTION_TYPES = [
  "Single Choice",
  "Multiple Choice",
  "True/False",
  "Fill in the Blanks",
  "Descriptive",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

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
};

export const QUESTION_MANAGER_ROLES: UserRole[] = [
  "PortalAdmin",
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
  return role === "PortalAdmin";
}

export function isPendingQuestionStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return ["pending", "draft", "under review"].includes(normalized);
}

export function isApprovedQuestionStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return ["approved", "active", "published"].includes(normalized);
}

/** Eligible for quiz bank attach: human ApprovedBy + AI approved + active. */
export function isEligibleForQuizQuestion(question: {
  isActive: boolean;
  approvedBy: string | null;
  isAiApproved: boolean;
  status: string;
}): boolean {
  return (
    question.isActive &&
    Boolean(question.approvedBy?.trim()) &&
    question.isAiApproved &&
    isApprovedQuestionStatus(question.status)
  );
}

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

  return "Single Choice";
}

export function isSingleChoiceType(type: string): boolean {
  return normalizeQuestionType(type) === "Single Choice";
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

export function usesAnswerOptions(type: string): boolean {
  const normalized = normalizeQuestionType(type);
  return normalized !== "Descriptive";
}

export function defaultOptionsForType(type: string): QuestionOptionInput[] {
  const normalized = normalizeQuestionType(type);

  switch (normalized) {
    case "True/False":
      return [
        { optionText: "True", isCorrect: true },
        { optionText: "False", isCorrect: false },
      ];
    case "Fill in the Blanks":
      return [{ optionText: "", isCorrect: true }];
    case "Descriptive":
      return [];
    case "Multiple Choice":
      return [
        { optionText: "", isCorrect: true },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
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
  };
}

/** Keep Class / Subject / Topic / Difficulty; clear question-specific fields. */
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
  };
}

export function mapDetailToForm(detail: QuestionDetail): QuestionFormValues {
  const questionType = normalizeQuestionType(detail.questionType);

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
    options:
      detail.options.length > 0
        ? detail.options.map((option) => ({
            optionText: option.optionText,
            isCorrect: option.isCorrect,
          }))
        : defaultOptionsForType(questionType),
  };
}

export function buildQuestionPayload(values: QuestionFormValues) {
  const questionType = normalizeQuestionType(values.questionType);
  const withOptions = usesAnswerOptions(questionType);

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

  const questionType = normalizeQuestionType(values.questionType);
  const options = values.options.filter((option) => option.optionText.trim());

  if (questionType === "Single Choice") {
    if (options.length < 2) {
      return "Single Choice needs at least two options.";
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
    if (options.length < 1) {
      return "Add at least one accepted answer.";
    }
    if (!options.every((option) => option.isCorrect)) {
      return "All fill-in answers should be marked as accepted.";
    }
  }

  return null;
}
