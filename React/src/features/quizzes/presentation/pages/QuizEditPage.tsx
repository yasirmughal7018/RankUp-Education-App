import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { mapManageQuizToForm } from "@/features/quizzes/domain/quizTypes";
import { QuizForm } from "@/features/quizzes/presentation/components/QuizForm";
import {
  useManageQuizQuery,
  useUpdateQuizMutation,
} from "@/features/quizzes/presentation/hooks/useQuizQueries";

export function QuizEditPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const numericQuizId = Number(quizId);

  const { data: quiz, isLoading, error } = useManageQuizQuery(numericQuizId);
  const updateQuiz = useUpdateQuizMutation(numericQuizId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading quiz...
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Unable to edit quiz"
          description={error?.message ?? "Quiz not found."}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Edit quiz #${quizId}`}
        description="Update quiz settings before publishing or assigning."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <QuizForm
          key={quizId}
          initialValues={mapManageQuizToForm(quiz)}
          submitLabel="Save changes"
          isSubmitting={updateQuiz.isPending}
          onSubmit={async (values) => {
            const updated = await updateQuiz.mutateAsync(values);
            navigate(`/quizzes/${updated.id}`);
          }}
          onCancel={() => navigate(`/quizzes/${quizId}`)}
        />
      </div>
    </div>
  );
}
