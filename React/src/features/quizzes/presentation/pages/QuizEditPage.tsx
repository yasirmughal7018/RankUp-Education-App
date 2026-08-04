import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import {
  canAuthorQuizzes,
  isQuizMetadataEditable,
  mapManageQuizToForm,
} from "@/features/quizzes/domain/quizTypes";
import { QuizForm } from "@/features/quizzes/presentation/components/QuizForm";
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
  const canAuthor = user != null && canAuthorQuizzes(user.role);

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
    canAuthor && isQuizMetadataEditable(quiz.lifecycleStatus, assignments);

  if (!editable) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Quiz is read-only"
          description="Settings can only be changed while the quiz is Draft or Published and no assignment has started."
          backTo={`/quizzes/${quizId}`}
          backAriaLabel="Back to quiz"
        />
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
