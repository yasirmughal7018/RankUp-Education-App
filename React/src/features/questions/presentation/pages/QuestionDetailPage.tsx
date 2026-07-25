/**
 * Question detail: view content and run workflow actions.
 *
 * Approve (Campus→Campus / School→School / Portal→Public visibility), reject with reason,
 * resubmit after reject, and PortalAdmin-only activate / deactivate / archive.
 * Status and Activity are shown as separate badges per QA guide §10.
 */
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import { useLookups } from "@/core/hooks/useLookups";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { useScopeNames } from "@/features/authentication/presentation/hooks/useScopeNames";
import {
  approvalVisibilityForRole,
  canActivateQuestion,
  canApproveQuestions,
  canArchiveQuestion,
  canDeactivateQuestion,
  canMutateQuestion,
  displayQuestionStatusLabel,
  isEligibleForQuizQuestion,
  isPendingQuestionStatus,
  isRejectedQuestionStatus,
} from "@/features/questions/domain/questionTypes";
import {
  getQuestionActivityStatusKey,
  getQuestionWorkflowStatusKey,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import {
  useActivateQuestionMutation,
  useApproveQuestionMutation,
  useArchiveQuestionMutation,
  useDeactivateQuestionMutation,
  useDeleteQuestionMutation,
  useQuestionQuery,
  useRejectQuestionMutation,
  useSubmitQuestionMutation,
} from "@/features/questions/presentation/hooks/useQuestionQueries";

function lookupName(
  items: { id: number; name: string }[] | undefined,
  id: number | null | undefined,
  fallback: string,
): string {
  if (!id || id <= 0) {
    return "—";
  }
  return items?.find((item) => item.id === id)?.name ?? `${fallback} #${id}`;
}

export function QuestionDetailPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const numericQuestionId = Number(questionId);

  const { data: question, isLoading, error } = useQuestionQuery(numericQuestionId);
  const { schoolName, campusName } = useScopeNames(
    question?.schoolId,
    question?.campusId,
  );
  const { data: classes = [] } = useLookups(LOOKUP_TYPES.CLASS);
  const { data: subjects = [] } = useLookups(LOOKUP_TYPES.SUBJECT);
  const { data: topics = [] } = useLookups(
    LOOKUP_TYPES.TOPIC,
    question?.subjectId && question.subjectId > 0 ? question.subjectId : null,
  );
  const { data: difficulties = [] } = useLookups(LOOKUP_TYPES.DIFFICULTY);

  const approveQuestion = useApproveQuestionMutation(numericQuestionId);
  const rejectQuestion = useRejectQuestionMutation(numericQuestionId);
  const submitQuestion = useSubmitQuestionMutation(numericQuestionId);
  const activateQuestion = useActivateQuestionMutation(numericQuestionId);
  const deactivateQuestion = useDeactivateQuestionMutation(numericQuestionId);
  const archiveQuestion = useArchiveQuestionMutation(numericQuestionId);
  const deleteQuestion = useDeleteQuestionMutation();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const canApprove = user ? canApproveQuestions(user.role) : false;
  const isOwner =
    user != null &&
    question != null &&
    String(user.id) === String(question.createdBy);

  const isSubmitting =
    approveQuestion.isPending ||
    rejectQuestion.isPending ||
    submitQuestion.isPending ||
    activateQuestion.isPending ||
    deactivateQuestion.isPending ||
    archiveQuestion.isPending ||
    deleteQuestion.isPending;

  async function runAction(action: () => Promise<unknown>, success: string) {
    setActionError(null);
    setSuccessMessage(null);

    try {
      await action();
      setSuccessMessage(success);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Action failed.");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted-foreground sm:px-6">
        Loading question...
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Question not found"
          description={error?.message ?? "Unable to load question."}
          backTo="/questions"
          backAriaLabel="Back to question bank"
        />
      </div>
    );
  }

  const isPending = isPendingQuestionStatus(question.status);
  const isRejected = isRejectedQuestionStatus(question.status);
  const canEdit =
    user != null &&
    canMutateQuestion({
      role: user.role,
      userId: user.id,
      createdBy: question.createdBy,
      status: question.status,
    });
  const canDelete = canEdit;
  // Owner or PortalAdmin may re-queue a Rejected item into PendingReview.
  const canSubmit =
    user != null &&
    (user.role === "PortalAdmin" || isOwner) &&
    isRejected;
  const showActivate =
    user != null &&
    canActivateQuestion({
      role: user.role,
      status: question.status,
      isActive: question.isActive,
    });
  const showDeactivate =
    user != null &&
    canDeactivateQuestion({
      role: user.role,
      status: question.status,
      isActive: question.isActive,
    });
  const showArchive =
    user != null &&
    canArchiveQuestion({
      role: user.role,
      status: question.status,
    });
  const isQuizReady = isEligibleForQuizQuestion(question);

  const className = lookupName(classes, question.classId, "Class");
  const subjectName = lookupName(subjects, question.subjectId, "Subject");
  const topicName = question.topicId
    ? lookupName(topics, question.topicId, "Topic")
    : "—";
  const difficultyName = lookupName(
    difficulties,
    question.difficultyLevel,
    "Difficulty",
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Question #${question.questionId}`}
        description={question.questionType}
        backTo="/questions"
        backAriaLabel="Back to question bank"
        action={
          canEdit ? (
            <Link
              to={`/questions/${question.questionId}/edit`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Edit
            </Link>
          ) : null
        }
      />

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] px-4 py-3 text-sm text-[var(--status-approved-text)]">
          {successMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-4 rounded-lg border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] px-4 py-3 text-sm text-[var(--status-rejected-text)]">
          {actionError}
        </div>
      ) : null}

      <section className="mb-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={displayQuestionStatusLabel(question.status)}
            status={getQuestionWorkflowStatusKey(question.status)}
          />
          <StatusBadge
            label={question.isActive ? "Active" : "Inactive"}
            status={getQuestionActivityStatusKey(question.isActive)}
          />
          {isQuizReady ? (
            <StatusBadge label="Quiz ready" status="approved" />
          ) : null}
        </div>

        <p className="text-base leading-7 text-foreground">{question.questionText}</p>

        {question.rejectionReason ? (
          <div className="rounded-lg border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] px-4 py-3 text-sm text-[var(--status-pending-text)]">
            <strong>Rejection reason:</strong> {question.rejectionReason}
          </div>
        ) : null}

        <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
          <p>
            <span className="text-foreground">Class:</span> {className}
          </p>
          <p>
            <span className="text-foreground">Subject:</span> {subjectName}
          </p>
          <p>
            <span className="text-foreground">Topic:</span> {topicName}
          </p>
          <p>
            <span className="text-foreground">Difficulty:</span> {difficultyName}
          </p>
          <p>
            <span className="text-foreground">Marks:</span> {question.marks}
          </p>
          <p>
            <span className="text-foreground">Time:</span>{" "}
            {question.estimatedTimeSeconds}s
          </p>
          <p>
            <span className="text-foreground">Created by:</span>{" "}
            {question.createdBy}
          </p>
          <p>
            <span className="text-foreground">Approved by:</span>{" "}
            {question.approvedBy ?? "—"}
          </p>
          <p>
            <span className="text-foreground">Visibility:</span>{" "}
            {question.visibility ?? "None"}
          </p>
          <p>
            <span className="text-foreground">School:</span> {schoolName ?? "—"}
          </p>
          <p>
            <span className="text-foreground">Campus:</span> {campusName ?? "—"}
          </p>
        </div>

        {question.hint ? (
          <div>
            <h3 className="text-sm font-medium text-foreground">Hint</h3>
            <p className="mt-1 text-sm text-muted-foreground">{question.hint}</p>
          </div>
        ) : null}

        {question.explanation ? (
          <div>
            <h3 className="text-sm font-medium text-foreground">Explanation</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {question.explanation}
            </p>
          </div>
        ) : null}

        {question.options.length > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">Options</h3>
            <ul className="space-y-2">
              {question.options.map((option) => (
                <li
                  key={option.optionId}
                  className="rounded-lg border border-border px-4 py-3 text-sm text-foreground"
                >
                  {option.optionText}
                  {option.isCorrect ? (
                    <span className="ml-2 text-xs font-medium text-[var(--status-approved-text)]">
                      Correct
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(question.acceptedAnswers?.length ?? 0) > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">
              Accepted answers
            </h3>
            <ul className="space-y-2">
              {question.acceptedAnswers.map((answer) => (
                <li
                  key={answer.acceptedAnswerId}
                  className="rounded-lg border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)]/60 px-4 py-3 text-sm text-foreground"
                >
                  <span className="font-medium">{answer.answerText}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {[
                      answer.isCaseSensitive ? "case-sensitive" : null,
                      answer.allowPartialMatch ? "partial match" : null,
                      answer.allowAiReview ? "AI review" : null,
                      answer.allowTeacherReview ? "teacher review" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "exact match"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-2">
        {canApprove && isPending ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                void runAction(
                  () => approveQuestion.mutateAsync(),
                  user
                    ? `Question approved (${approvalVisibilityForRole(user.role)} visibility).`
                    : "Question approved.",
                )
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
            >
              Approve
              {user ? ` · ${approvalVisibilityForRole(user.role)}` : null}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setShowRejectReason(true);
                setRejectReason("");
                setActionError(null);
                setSuccessMessage(null);
              }}
              className="rounded-lg border border-[var(--status-rejected-border)] px-4 py-2 text-sm font-medium text-[var(--status-rejected-text)] transition hover:bg-[var(--status-rejected-bg)] disabled:opacity-70"
            >
              Reject
            </button>
          </>
        ) : null}

        {canApprove && isPending && showRejectReason ? (
          <div className="w-full rounded-xl border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)]/60 p-4">
            <label
              htmlFor="rejectReason"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Rejection reason{" "}
              <span className="font-bold text-[var(--status-rejected-text)]">
                *
              </span>
            </label>
            <textarea
              id="rejectReason"
              rows={3}
              value={rejectReason}
              disabled={isSubmitting}
              onChange={(event) => setRejectReason(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
              placeholder="Explain why this question is being rejected (min 10 characters)..."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSubmitting || rejectReason.trim().length < 10}
                onClick={() =>
                  void runAction(async () => {
                    await rejectQuestion.mutateAsync(rejectReason.trim());
                    setShowRejectReason(false);
                    setRejectReason("");
                  }, "Question rejected.")
                }
                className="rounded-lg bg-[var(--status-rejected-text)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-70"
              >
                Confirm reject
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setShowRejectReason(false);
                  setRejectReason("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {canSubmit ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              void runAction(
                () => submitQuestion.mutateAsync(),
                "Submitted for review (PendingReview).",
              )
            }
            className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5 disabled:opacity-70"
          >
            Submit for review
          </button>
        ) : null}

        {showActivate ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              void runAction(
                () => activateQuestion.mutateAsync(),
                "Question activated.",
              )
            }
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
          >
            Activate
          </button>
        ) : null}

        {showDeactivate ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              void runAction(
                () => deactivateQuestion.mutateAsync(),
                "Question deactivated.",
              )
            }
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-70"
          >
            Deactivate
          </button>
        ) : null}

        {showArchive ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              void runAction(
                () => archiveQuestion.mutateAsync(),
                "Question archived.",
              )
            }
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-70"
          >
            Archive
          </button>
        ) : null}

        {canDelete ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              const confirmed = window.confirm("Delete this question?");
              if (!confirmed) {
                return;
              }

              void (async () => {
                setActionError(null);
                try {
                  await deleteQuestion.mutateAsync(question.questionId);
                  navigate("/questions");
                } catch (caught) {
                  const apiError = caught as { message?: string };
                  setActionError(apiError.message || "Unable to delete question.");
                }
              })();
            }}
            className="rounded-lg border border-[var(--status-rejected-border)] px-4 py-2 text-sm font-medium text-[var(--status-rejected-text)] transition hover:bg-[var(--status-rejected-bg)] disabled:opacity-70"
          >
            Delete
          </button>
        ) : null}
      </section>
    </div>
  );
}
