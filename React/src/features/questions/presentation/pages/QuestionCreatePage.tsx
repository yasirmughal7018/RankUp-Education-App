import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import * as questionApi from "@/features/questions/data/questionApi";
import { createEmptyQuestionForm } from "@/features/questions/domain/questionTypes";
import { QuestionForm } from "@/features/questions/presentation/components/QuestionForm";

export function QuestionCreatePage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Create question"
        description="New questions are submitted for approval unless you are an administrator."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <QuestionForm
          initialValues={createEmptyQuestionForm()}
          submitLabel="Create question"
          isSubmitting={isSubmitting}
          onSubmit={async (values) => {
            setIsSubmitting(true);
            try {
              const created = await questionApi.createQuestion(values);
              navigate(`/questions/${created.questionId}`);
            } finally {
              setIsSubmitting(false);
            }
          }}
          onCancel={() => navigate("/questions")}
        />
      </div>
    </div>
  );
}
