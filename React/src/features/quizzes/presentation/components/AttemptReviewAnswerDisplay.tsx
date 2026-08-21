import type { AttemptReviewQuestion } from "@/features/quizzes/domain/quizMonitorTypes";
import { QuizAnswerDisplay } from "@/features/quizzes/presentation/components/QuizAnswerDisplay";

/** Student answer block for teacher attempt review (type-aware). */
export function AttemptReviewAnswerDisplay({
  question,
}: {
  question: AttemptReviewQuestion;
}) {
  return (
    <QuizAnswerDisplay
      question={{
        questionType: question.questionType,
        selectedOptionId: question.selectedOptionId,
        selectedOptionIds: question.selectedOptionIds,
        submittedText: question.submittedText,
        options: question.options?.map((option) => ({
          id: option.id,
          text: option.text,
          imageUrl: option.imageUrl,
          isCorrect: option.isCorrect,
        })),
      }}
      answerLabel="Student answer"
      showCorrectAnswers
      selectedMatchLabel="Student matched"
      yourOrderLabel="Student order"
      className="mb-3 rounded-lg bg-slate-50 px-4 py-3"
    />
  );
}
