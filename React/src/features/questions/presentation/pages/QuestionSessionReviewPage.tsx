import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useLookups } from "@/core/hooks/useLookups";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import {
  normalizeQuestionType,
  type QuestionDetail,
  type QuestionFormValues,
} from "@/features/questions/domain/questionTypes";
import {
  StatusBadge,
  getQuestionStatusTone,
} from "@/features/questions/presentation/components/StatusBadge";

export interface QuestionSessionReviewState {
  questions: QuestionDetail[];
  index: number;
  formValues?: QuestionFormValues;
}

function lookupName(
  items: { id: number; name: string }[] | undefined,
  id: number | null | undefined,
  fallback: string,
): string {
  if (!id || id <= 0) {
    return fallback;
  }
  return items?.find((item) => item.id === id)?.name ?? `${fallback} #${id}`;
}

export function QuestionSessionReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as QuestionSessionReviewState | null;

  const questions = state?.questions ?? [];
  const formValues = state?.formValues;
  const [index, setIndex] = useState(() => {
    const start = state?.index ?? 0;
    if (start < 0) {
      return 0;
    }
    if (start >= questions.length) {
      return Math.max(0, questions.length - 1);
    }
    return start;
  });

  const question = questions[index] ?? null;

  const { data: classes = [] } = useLookups(LOOKUP_TYPES.CLASS);
  const { data: subjects = [] } = useLookups(LOOKUP_TYPES.SUBJECT);
  const { data: topics = [] } = useLookups(
    LOOKUP_TYPES.TOPIC,
    question?.subjectId && question.subjectId > 0 ? question.subjectId : null,
  );

  const scopeSummary = useMemo(() => {
    if (!question) {
      return null;
    }
    return [
      lookupName(classes, question.classId, "Class"),
      lookupName(subjects, question.subjectId, "Subject"),
      question.topicId
        ? lookupName(topics, question.topicId, "Topic")
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [classes, subjects, topics, question]);

  function goBackToCreate() {
    navigate("/questions/new", {
      state: {
        savedQuestions: questions,
        formValues,
        reviewIndex: index,
      } satisfies {
        savedQuestions: QuestionDetail[];
        formValues?: QuestionFormValues;
        reviewIndex: number;
      },
    });
  }

  if (questions.length === 0 || !question) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Session review"
          description="No questions from this create session were found."
        />
        <Link
          to="/questions/new"
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to create
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Session questions"
        description={`Review all questions saved in this create session (${index + 1} of ${questions.length}).`}
        action={
          <button
            type="button"
            onClick={goBackToCreate}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to create
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          Session
        </span>
        <span>
          Question {index + 1} of {questions.length}
        </span>
        {scopeSummary ? (
          <span className="text-slate-500">· {scopeSummary}</span>
        ) : null}
      </div>

      <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={question.status}
            tone={getQuestionStatusTone(question.status, question.isActive)}
          />
          <StatusBadge
            label={question.isActive ? "Active" : "Inactive"}
            tone={question.isActive ? "success" : "default"}
          />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {normalizeQuestionType(question.questionType)}
          </span>
          <span className="text-xs text-slate-500">
            #{question.questionId} · {question.marks} marks
          </span>
        </div>

        <p className="text-base leading-7 text-slate-900">
          {question.questionText}
        </p>

        <div className="grid gap-4 text-sm text-slate-700 md:grid-cols-2">
          <p>Class: {lookupName(classes, question.classId, "Class")}</p>
          <p>Subject: {lookupName(subjects, question.subjectId, "Subject")}</p>
          <p>
            Topic:{" "}
            {question.topicId
              ? lookupName(topics, question.topicId, "Topic")
              : "—"}
          </p>
          <p>Difficulty: {question.difficultyLevel}</p>
          <p>Marks: {question.marks}</p>
          <p>Time: {question.estimatedTimeSeconds}s</p>
        </div>

        {question.hint ? (
          <div>
            <h3 className="text-sm font-medium text-slate-900">Hint</h3>
            <p className="mt-1 text-sm text-slate-600">{question.hint}</p>
          </div>
        ) : null}

        {question.explanation ? (
          <div>
            <h3 className="text-sm font-medium text-slate-900">Explanation</h3>
            <p className="mt-1 text-sm text-slate-600">{question.explanation}</p>
          </div>
        ) : null}

        {question.options.length > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-medium text-slate-900">Options</h3>
            <ul className="space-y-2">
              {question.options.map((option) => (
                <li
                  key={option.optionId}
                  className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700"
                >
                  {option.optionText}
                  {option.isCorrect ? (
                    <span className="ml-2 text-xs font-medium text-emerald-700">
                      Correct
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Descriptive — no options.</p>
        )}
      </section>

      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={index <= 0}
          onClick={() => setIndex((current) => current - 1)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={goBackToCreate}
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          Back to create
        </button>
        <button
          type="button"
          disabled={index >= questions.length - 1}
          onClick={() => setIndex((current) => current + 1)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2">
        {questions.map((item, itemIndex) => (
          <li key={item.questionId}>
            <button
              type="button"
              onClick={() => setIndex(itemIndex)}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                itemIndex === index
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="font-semibold">#{item.questionId}</span>
              <span className="ml-2 line-clamp-1 opacity-90">
                {item.questionText}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
