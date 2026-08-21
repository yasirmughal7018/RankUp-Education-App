import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import { QuizAnswerDisplay } from "@/features/quizzes/presentation/components/QuizAnswerDisplay";
import type { QuizAttemptResult } from "@/features/student/domain/studentQuizTypes";
import { resolveQuizResultDisplay } from "@/features/student/domain/quizResultDisplay";

interface QuizAttemptResultBodyProps {
  result: QuizAttemptResult;
  answerLabel?: string;
}

/** Shared student/parent result breakdown (Full after review is published). */
export function QuizAttemptResultBody({
  result,
  answerLabel = "Your answer",
}: QuizAttemptResultBodyProps) {
  const display = resolveQuizResultDisplay(result);

  return (
    <>
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Score</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {display.showScore
              ? `${result.obtainedMarks}/${result.totalMarks}`
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Percentage
          </p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">
            {display.showScore ? `${result.percentage}%` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
          <div className="mt-2">
            <StatusBadge
              label={result.resultStatus}
              tone={getQuestionStatusTone(result.resultStatus, true)}
            />
          </div>
        </div>
      </section>

      {display.modeNote ? (
        <div
          className={[
            "mb-6 rounded-lg px-4 py-3 text-sm",
            display.reviewPending
              ? "border border-amber-200 bg-amber-50 text-amber-800"
              : "border border-slate-200 bg-slate-50 text-slate-600",
          ].join(" ")}
        >
          {display.modeNote}
        </div>
      ) : null}

      <div className="space-y-4">
        {result.questions.map((question, index) => (
          <section
            key={question.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Q{index + 1}. {question.text}
              </h2>
              {display.showScore ? (
                display.showCorrectness ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                      question.isCorrect
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {question.awardedMarks}/{question.marks}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {question.awardedMarks}/{question.marks}
                  </span>
                )
              ) : (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                  Pending
                </span>
              )}
            </div>

            <QuizAnswerDisplay
              question={{
                questionType: question.questionType ?? "Single Choice",
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
              answerLabel={answerLabel}
              showCorrectAnswers={display.showCorrectAnswers}
              selectedMatchLabel="Your match"
              yourOrderLabel={answerLabel}
              className="mt-1"
            />

            {display.showExplanations && question.explanation ? (
              <p className="mt-2 text-sm text-slate-600">{question.explanation}</p>
            ) : null}
          </section>
        ))}
      </div>
    </>
  );
}
