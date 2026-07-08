import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { mapDetailToForm } from "@/features/questions/domain/questionTypes";
import { QuestionForm } from "@/features/questions/presentation/components/QuestionForm";
import {
  useQuestionQuery,
  useUpdateQuestionMutation,
} from "@/features/questions/presentation/hooks/useQuestionQueries";

export function QuestionEditPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const numericQuestionId = Number(questionId);

  const { data: question, isLoading, error } = useQuestionQuery(numericQuestionId);
  const updateQuestion = useUpdateQuestionMutation(numericQuestionId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading question...
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Unable to edit question"
          description={error?.message ?? "Question not found."}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Edit question #${questionId}`}
        description="Updates may send the question back for approval."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <QuestionForm
          key={questionId}
          initialValues={mapDetailToForm(question)}
          submitLabel="Save changes"
          isSubmitting={updateQuestion.isPending}
          onSubmit={async (values) => {
            const updated = await updateQuestion.mutateAsync(values);
            navigate(`/questions/${updated.questionId}`);
          }}
          onCancel={() => navigate(`/questions/${questionId}`)}
        />
      </div>
    </div>
  );
}
