export interface QuizDetail {
  id: number;
  title: string;
  description: string;
  subject: string;
  grade: string;
  topic: string;
  quizType: string;
  difficulty: string;
  questionCount: number;
  totalMarks: number;
  timeLimitMinutes: number | null;
  attemptLimit: number;
  attemptsUsed: number;
  startAt: string | null;
  dueAt: string | null;
  status: string;
  instructions: string[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  hintsAllowed: boolean;
  reviewAvailable: boolean;
  createdBy: string;
  schoolName: string;
  resultStatus: string;
  resultPercent: number | null;
}

export interface QuizAttemptOption {
  id: number;
  text: string;
  imageUrl: string | null;
}

export interface QuizAttemptQuestion {
  id: number;
  text: string;
  questionType: string;
  marks: number;
  displayOrder: number;
  hint: string | null;
  options: QuizAttemptOption[];
}

export interface SavedQuizAnswer {
  questionId: number;
  selectedOptionId: number | null;
  submittedText: string | null;
}

export interface StartQuizAttempt {
  attemptId: number;
  quizId: number;
  attemptNumber: number;
  timeLimitMinutes: number | null;
  startedAt: string;
  resumed: boolean;
  questions: QuizAttemptQuestion[];
  savedAnswers: SavedQuizAnswer[];
}

export interface SubmitQuizAnswer {
  questionId: number;
  selectedOptionId: number | null;
  submittedText: string | null;
}

export interface SaveQuizDraftInput {
  answers: SubmitQuizAnswer[];
  timeSpentSeconds?: number | null;
}

export interface SaveQuizDraftResult {
  attemptId: number;
  savedCount: number;
}

export interface QuizResultQuestion {
  id: number;
  text: string;
  marks: number;
  awardedMarks: number;
  isCorrect: boolean;
  explanation: string | null;
  selectedOptionId: number | null;
  correctOptionId: number | null;
  submittedText: string | null;
}

export interface QuizAttemptResult {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  attemptNumber: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  timeSpentSeconds: number;
  resultStatus: string;
  reviewAvailable: boolean;
  questions: QuizResultQuestion[];
}

export const STUDENT_DEVICE_ID = "rankup-web";

export function canTakeStudentQuizzes(role: string): boolean {
  return role === "Student";
}

export function isTextQuestionType(questionType: string): boolean {
  const normalized = questionType.toLowerCase();
  return (
    normalized.includes("text") ||
    normalized.includes("short") ||
    normalized.includes("long") ||
    normalized.includes("essay") ||
    normalized.includes("descriptive")
  );
}

export function hasInProgressAttempt(quiz: QuizDetail): boolean {
  const result = quiz.resultStatus.toLowerCase();
  return result.includes("in progress") || result.includes("inprogress");
}
