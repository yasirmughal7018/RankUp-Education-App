export interface LookupItem {
  id: number;
  name: string;
  type: string;
  parentId: number | null;
}

export const LOOKUP_TYPES = {
  CLASS: "Class",
  SUBJECT: "Subject",
  TOPIC: "Topic",
  DIFFICULTY: "DifficultyLevel",
  QUESTION_TYPE: "QuestionType",
} as const;

export type LookupType = (typeof LOOKUP_TYPES)[keyof typeof LOOKUP_TYPES];
