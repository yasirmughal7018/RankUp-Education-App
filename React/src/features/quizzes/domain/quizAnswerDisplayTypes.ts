/** Shared shape for type-aware quiz answer rendering (review + result). */
export interface QuizAnswerOptionRow {
  id: number;
  text: string;
  imageUrl?: string | null;
  isCorrect?: boolean;
}

export interface QuizAnswerDisplayInput {
  questionType: string;
  selectedOptionId?: number | null;
  selectedOptionIds?: number[] | null;
  submittedText?: string | null;
  options?: QuizAnswerOptionRow[];
}
