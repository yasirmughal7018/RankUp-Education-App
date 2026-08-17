/**
 * Question detail: view content and run workflow actions.
 *
 * CampusAdmin/SchoolAdmin endorse (Inactive + restricted); PortalAdmin publishes (Public + Active).
 * PortalAdmin-only activate / deactivate / archive on Published questions.
 */
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import { useLookups } from "@/core/hooks/useLookups";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { useScopeNames } from "@/features/authentication/presentation/hooks/useScopeNames";
import {
  approvalPublishes,
  approvalVisibilityForRole,
  canActivateQuestion,
  canApproveOrRejectQuestion,
  canArchiveQuestion,
  canDeactivateQuestion,
  canMutateQuestion,
  canUnarchiveQuestion,
  displayQuestionStatusLabel,
  isEligibleForQuizQuestion,
  isEndorsedNotPublishedQuestion,
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
  useUnarchiveQuestionMutation,
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

const HISTORY_ACTION_LABELS: Record<string, string> = {
  Created: "Created",
  SubmittedForReview: "Submitted for review",
  Endorsed: "Endorsed",
  Published: "Published",
  Rejected: "Rejected",
  Activated: "Activated",
  Deactivated: "Deactivated",
  Archived: "Archived",
  Unarchived: "Unarchived",
  Modified: "Modified",
};

function historyDotClass(action: string): string {
  switch (action) {
    case "Published":
    case "Activated":
    case "Unarchived":
      return "border-[var(--status-approved-border)] bg-[var(--status-approved-bg)]";
    case "Endorsed":
    case "SubmittedForReview":
      return "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)]";
    case "Rejected":
      return "border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)]";
    case "Modified":
    case "Created":
      return "border-primary/40 bg-primary/10";
    default:
      return "border-border bg-muted";
  }
}

function historyChipClass(action: string): string {
  switch (action) {
    case "Published":
    case "Activated":
    case "Unarchived":
      return "border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] text-[var(--status-approved-text)]";
    case "Endorsed":
    case "SubmittedForReview":
      return "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]";
    case "Rejected":
      return "border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]";
    case "Modified":
    case "Created":
      return "border-primary/30 bg-primary/5 text-primary";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

/** "CampusAdmin" → "Campus Admin". */
function humanizeRole(role: string): string {
  return role.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatHistoryDate(occurredAt: string): string {
  const date = new Date(occurredAt);
  return Number.isNaN(date.getTime())
    ? occurredAt
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
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
  const unarchiveQuestion = useUnarchiveQuestionMutation(numericQuestionId);
  const deleteQuestion = useDeleteQuestionMutation();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalHistoryExpanded, setApprovalHistoryExpanded] = useState(false);

  const canApprove =
    user != null &&
    question != null &&
    canApproveOrRejectQuestion({
      role: user.role,
      userId: user.id,
      createdBy: question.createdBy,
    });
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
    unarchiveQuestion.isPending ||
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
      visibility: question.visibility,
    });
  const showDeactivate =
    user != null &&
    canDeactivateQuestion({
      role: user.role,
      status: question.status,
      isActive: question.isActive,
      visibility: question.visibility,
    });
  const showArchive =
    user != null &&
    canArchiveQuestion({
      role: user.role,
      status: question.status,
    });
  const showUnarchive =
    user != null &&
    canUnarchiveQuestion({
      role: user.role,
      status: question.status,
    });
  const isQuizReady = isEligibleForQuizQuestion(question);
  const isEndorsed = isEndorsedNotPublishedQuestion(question);
  const showApproveAction =
    canApprove &&
    (isPending || (user?.role === "PortalAdmin" && isEndorsed));
  const approveActionLabel =
    user && approvalPublishes(user.role) ? "Publish · Public" : user
      ? `Endorse · ${approvalVisibilityForRole(user.role)}`
      : "Approve";
  const approveSuccessMessage =
    user && approvalPublishes(user.role)
      ? "Question published (Public + Active)."
      : user
        ? `Question endorsed (${approvalVisibilityForRole(user.role)} visibility, still inactive until PortalAdmin publishes).`
        : "Question approved.";

  const className = lookupName(classes, question.classId, "Class");
  const subjectName = lookupName(subjects, question.subjectId, "Subject");
  const topicName = question.topicId
    ? lookupName(topics, question.topicId, "Topic")
    : null;
  const difficultyName = lookupName(
    difficulties,
    question.difficultyLevel,
    "Difficulty",
  );

  const headingParts = [className, subjectName];
  if (topicName && topicName !== "—") {
    headingParts.push(topicName);
  }
  const pageTitle = headingParts.join(" - ");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title={pageTitle}
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
          {isEndorsed ? (
            <StatusBadge label="Endorsed" status="pending" />
          ) : null}
        </div>

        <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
          <p>
            <span className="text-foreground">Class:</span> {className}
          </p>
          <p>
            <span className="text-foreground">Subject:</span> {subjectName}
          </p>
          <p>
            <span className="text-foreground">Topic:</span> {topicName ?? "—"}
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
            {question.createdByName?.trim() || question.createdBy}
          </p>
          <p>
            <span className="text-foreground">Approved by:</span>{" "}
            {question.approvedByName?.trim() ||
              question.approvedBy ||
              "—"}
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

        {question.rejectionReason ? (
          <div className="rounded-lg border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] px-4 py-3 text-sm text-[var(--status-pending-text)]">
            <strong>Rejection reason:</strong> {question.rejectionReason}
          </div>
        ) : null}

        <p className="text-base leading-7 text-foreground">{question.questionText}</p>

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
          <ul className="space-y-2">
            {question.options.map((option) => (
              <li
                key={option.optionId}
                className={
                  option.isCorrect
                    ? "flex items-center justify-between gap-3 rounded-lg border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] px-4 py-3 text-sm text-[var(--status-approved-text)]"
                    : "flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground"
                }
              >
                <span className="min-w-0 flex-1">
                  <span className="block">{option.optionText || "Image option"}</span>
                  {option.optionImageUrl ? (
                    <img
                      src={option.optionImageUrl}
                      alt=""
                      className="mt-2 max-h-32 rounded-lg border border-border object-contain"
                    />
                  ) : null}
                </span>
                {option.isCorrect ? (
                  <StatusBadge label="Correct" status="approved" />
                ) : null}
              </li>
            ))}
          </ul>
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
        {showApproveAction ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                void runAction(
                  () => approveQuestion.mutateAsync(),
                  approveSuccessMessage,
                )
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
            >
              {approveActionLabel}
            </button>
            {isPending ? (
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
            ) : null}
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

        {showUnarchive ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              void runAction(
                () => unarchiveQuestion.mutateAsync(),
                question.visibility?.toLowerCase() === "public"
                  ? "Question unarchived and activated (Public)."
                  : "Question unarchived.",
              )
            }
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
          >
            Unarchive
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

      <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <button
          type="button"
          aria-expanded={approvalHistoryExpanded}
          onClick={() => setApprovalHistoryExpanded((open) => !open)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              Approval history
              {(question.approvalHistory?.length ?? 0) > 0 ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  ({question.approvalHistory!.length})
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Full trail for every role — create, endorse/publish, modify, activate,
              deactivate, archive, and unarchive.
            </p>
          </div>
          <ChevronDown
            aria-hidden
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
              approvalHistoryExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {approvalHistoryExpanded ? (
          <div className="mt-4">
            {(question.approvalHistory?.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-muted/40 px-3.5 py-3 text-sm text-muted-foreground">
                No history recorded yet. New actions will appear here for Teacher,
                Campus Admin, School Admin, and Portal Admin.
              </p>
            ) : (
              <ol className="relative space-y-3 border-l border-border pl-5">
                {question.approvalHistory!.map((entry) => (
                  <li key={entry.approvalId} className="relative">
                    <span
                      aria-hidden
                      className={`absolute -left-[1.6rem] top-3 h-3 w-3 rounded-full border-2 ${historyDotClass(entry.action)}`}
                    />
                    <div className="rounded-xl border border-border bg-background px-3.5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {entry.actorName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {humanizeRole(entry.actorRole)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatHistoryDate(entry.occurredAt)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold ${historyChipClass(entry.action)}`}
                        >
                          {HISTORY_ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                      </div>
                      {entry.reason ? (
                        <p className="mt-2 rounded-lg border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)]/60 px-3 py-2 text-xs text-[var(--status-rejected-text)]">
                          {entry.reason}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
