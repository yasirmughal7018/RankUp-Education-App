import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import {
  canEditQuizSettings,
  mapManageQuizToForm,
} from "@/features/quizzes/domain/quizTypes";
import { QuizForm } from "@/features/quizzes/presentation/components/QuizForm";
import { QuizSettingsOverview } from "@/features/quizzes/presentation/components/QuizSettingsOverview";
import {
  useManageQuizQuery,
  useQuizAssignmentsQuery,
  useUpdateQuizMutation,
} from "@/features/quizzes/presentation/hooks/useQuizQueries";

/** Edit quiz metadata for an existing draft or published quiz (before assignment starts). */
export function QuizEditPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const numericQuizId = Number(quizId);

  const { data: quiz, isLoading, error } = useManageQuizQuery(numericQuizId);
  const { data: assignments = [], isLoading: assignmentsLoading } =
    useQuizAssignmentsQuery(numericQuizId);
  const updateQuiz = useUpdateQuizMutation(numericQuizId);

  if (isLoading || assignmentsLoading) {
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
          backTo="/quizzes"
          backAriaLabel="Back to quizzes"
        />
      </div>
    );
  }

  const editable =
    user != null &&
    canEditQuizSettings(
      user.role,
      user.id,
      quiz.createdBy,
      quiz.lifecycleStatus,
      assignments,
      quiz.approvalStatus,
      quiz.hasApprovedEditGrant === true,
    );

  if (!editable) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Quiz is read-only"
          description={
            quiz.hasApprovedEditGrant
              ? "Your edit request was approved. Saving sends this quiz back to Draft + Pending — resubmit for approval after you edit."
              : "Settings cannot be changed on this published quiz until an edit request is approved. You can still review every setting below."
          }
          backTo={`/quizzes/${quizId}`}
          backAriaLabel="Back to quiz"
        />
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <QuizSettingsOverview quiz={quiz} />
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Edit quiz #${quizId}`}
        description="Update quiz settings before publishing or assigning."
        backTo={`/quizzes/${quizId}`}
        backAriaLabel="Back to quiz"
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
