/**
 * Edit an existing bank question.
 * Content updates do not change status — Rejected stays Rejected until Submit for review.
 */
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import {
  canMutateQuestion,
  mapDetailToForm,
} from "@/features/questions/domain/questionTypes";
import { QuestionForm } from "@/features/questions/presentation/components/QuestionForm";
import {
  useQuestionQuery,
  useUpdateQuestionMutation,
} from "@/features/questions/presentation/hooks/useQuestionQueries";

/** Edit an existing question via the shared question form. */
export function QuestionEditPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const numericQuestionId = Number(questionId);

  const { data: question, isLoading, error } = useQuestionQuery(numericQuestionId);
  const updateQuestion = useUpdateQuestionMutation(numericQuestionId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted-foreground sm:px-6">
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
          backTo="/questions"
          backAriaLabel="Back to question bank"
        />
      </div>
    );
  }

  const canEdit =
    user != null &&
    canMutateQuestion({
      role: user.role,
      userId: user.id,
      createdBy: question.createdBy,
      status: question.status,
    });

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Editing not allowed"
          description="You can only edit your own PendingReview or Rejected questions (PortalAdmin may edit any)."
          backTo={`/questions/${question.questionId}`}
          backAriaLabel="Back to question"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Edit question #${questionId}`}
        description="Saves content only. Rejected questions stay Rejected until you submit for review."
        backTo={`/questions/${questionId}`}
        backAriaLabel="Back to question"
      />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
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
