import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import * as quizApi from "@/features/quizzes/data/quizApi";
import { createEmptyQuizForm } from "@/features/quizzes/domain/quizTypes";
import { QuizForm } from "@/features/quizzes/presentation/components/QuizForm";

export function QuizCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Create quiz"
        description="Start with quiz details. You can add questions after the quiz is created."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <QuizForm
          initialValues={createEmptyQuizForm()}
          submitLabel="Create quiz"
          isSubmitting={isSubmitting}
          showContextStudentId={user?.role === "Parent"}
          onSubmit={async (values) => {
            setIsSubmitting(true);
            try {
              const created = await quizApi.createQuiz(values);
              navigate(`/quizzes/${created.id}`);
            } finally {
              setIsSubmitting(false);
            }
          }}
          onCancel={() => navigate("/quizzes")}
        />
      </div>
    </div>
  );
}
