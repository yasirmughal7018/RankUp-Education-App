import { useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { AttachBankQuestionsDialog } from "@/features/quizzes/presentation/components/AttachBankQuestionsDialog";
import { AssignQuizDialog } from "@/features/quizzes/presentation/components/AssignQuizDialog";
import {
  answersFromQuizQuestion,
  QuizQuestionAnswerAside,
} from "@/features/quizzes/presentation/components/QuizQuestionAnswerAside";
import {
  canAuthorQuizzes,
  canApproveQuizOnDetailPage,
  canDeleteOrArchiveQuiz,
  canEditQuizSettings,
  canPortalPublishQuiz,
  canAssignQuiz,
  canRequestQuizEdit,
  canSubmitQuizForReview,
  formatQuizDisplayStatusLabel,
  formatQuizDuration,
  isDraftQuiz,
  isPublishedQuizLifecycle,
  isRejectedQuizApprovalStatus,
  isSchoolApprovedQuizStatus,
  quizApprovalButtonLabel,
  resolveQuizDisplayStatus,
  sumQuizEstimatedSeconds,
  sumQuizMarks,
  visibleQuizInstructions,
  type ManageQuiz,
} from "@/features/quizzes/domain/quizTypes";
import { useDirectoryCampusesQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import {
  useAllowRetryMutation,
  useApproveQuizMutation,
  useArchiveQuizMutation,
  useUnarchiveQuizMutation,
  useAssignQuizMutation,
  useAttachBankQuestionMutation,
  useCancelQuizAssignmentsMutation,
  useDeleteQuizMutation,
  useDuplicateQuizMutation,
  useManageQuizQuery,
  usePublishQuizMutation,
  useQuizAssignmentsQuery,
  useRejectQuizMutation,
  useRemoveQuizQuestionMutation,
  useRequestQuizEditMutation,
  useApproveQuizEditRequestMutation,
  useRejectQuizEditRequestMutation,
} from "@/features/quizzes/presentation/hooks/useQuizQueries";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const HISTORY_ACTION_LABELS: Record<string, string> = {
  Created: "Created",
  SubmittedForReview: "Submitted for review",
  Endorsed: "Endorsed",
  Approved: "Approved",
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
    case "Approved":
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
    case "Approved":
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

function resolveQuizCreatorLabel(quiz: {
  createdBy: string;
  createdByDisplayName?: string;
  approvalHistory?: Array<{ action: string; actorName: string }>;
}): string {
  if (quiz.createdByDisplayName?.trim()) {
    return quiz.createdByDisplayName.trim();
  }

  const createdEvent = quiz.approvalHistory?.find(
    (entry) => entry.action === "Created",
  );
  if (createdEvent?.actorName?.trim()) {
    return createdEvent.actorName.trim();
  }

  return quiz.createdBy?.trim() || "Unknown";
}

function resolveQuizCreatedLabel(quiz: {
  createdAt?: string;
  approvalHistory?: Array<{ action: string; occurredAt: string }>;
}): string {
  if (quiz.createdAt) {
    return formatDateTime(quiz.createdAt);
  }

  const createdEvent = quiz.approvalHistory?.find(
    (entry) => entry.action === "Created",
  );
  if (createdEvent?.occurredAt) {
    return formatHistoryDate(createdEvent.occurredAt);
  }

  return "—";
}

function MetaInlineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-end gap-x-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function resolveQuizCreatorRole(
  quiz: Pick<ManageQuiz, "approvalHistory">,
): string {
  return (
    quiz.approvalHistory?.find((entry) => entry.action === "Created")?.actorRole ??
    ""
  );
}

function resolveQuizScopeRows(
  quiz: ManageQuiz,
  campusName?: string | null,
): Array<{ label: string; value: string }> {
  const creatorRole = resolveQuizCreatorRole(quiz);
  const schoolName = quiz.schoolName?.trim() ?? "";
  const campus = campusName?.trim() ?? "";

  switch (creatorRole) {
    case "PortalAdmin":
      return [{ label: "Created as", value: "Portal Admin" }];
    case "SchoolAdmin":
      return schoolName ? [{ label: "School", value: schoolName }] : [];
    case "CampusAdmin": {
      if (schoolName && campus) {
        return [{ label: "School", value: `${schoolName} - ${campus}` }];
      }
      if (schoolName) {
        return [{ label: "School", value: schoolName }];
      }
      if (campus) {
        return [{ label: "Campus", value: campus }];
      }
      return [];
    }
    case "Teacher":
    case "Coordinator":
      return schoolName ? [{ label: "School", value: schoolName }] : [];
    case "Parent":
      return [{ label: "Created as", value: "Parent" }];
    case "Tutor":
      return [{ label: "Created as", value: "Tutor" }];
    default:
      return [];
  }
}

function canAllowRetry(assignment: {
  isReviewDone: boolean;
  attemptCount: number;
  allowedAttempts: number;
}): boolean {
  return (
    assignment.isReviewDone &&
    assignment.attemptCount >= assignment.allowedAttempts
  );
}

/** Quiz manage hub: questions, assignments, publish/archive, and lifecycle actions. */
export function QuizManageDetailPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAuthor = user != null && canAuthorQuizzes(user.role);
  const numericQuizId = Number(quizId);

  // When true, stop manage/assignments queries so hard-delete cannot trigger a
  // second GetManageDetail (RequireOwnedQuizAsync) after the quiz row is gone.
  const [suppressDetailQueries, setSuppressDetailQueries] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [approvalHistoryExpanded, setApprovalHistoryExpanded] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRequestEditForm, setShowRequestEditForm] = useState(false);
  const [requestEditReason, setRequestEditReason] = useState("");
  const [rejectEditRequestId, setRejectEditRequestId] = useState<number | null>(
    null,
  );
  const [rejectEditReason, setRejectEditReason] = useState("");

  const publishQuiz = usePublishQuizMutation(numericQuizId);
  const approveQuiz = useApproveQuizMutation(numericQuizId);
  const rejectQuiz = useRejectQuizMutation(numericQuizId);
  const deleteQuiz = useDeleteQuizMutation(numericQuizId);
  const duplicateQuiz = useDuplicateQuizMutation(numericQuizId);
  const archiveQuiz = useArchiveQuizMutation(numericQuizId);
  const unarchiveQuiz = useUnarchiveQuizMutation(numericQuizId);
  const removeQuestion = useRemoveQuizQuestionMutation(numericQuizId);
  const attachBankQuestion = useAttachBankQuestionMutation(numericQuizId);
  const assignQuiz = useAssignQuizMutation(numericQuizId);
  const cancelAssignments = useCancelQuizAssignmentsMutation(numericQuizId);
  const allowRetry = useAllowRetryMutation(numericQuizId);
  const requestQuizEdit = useRequestQuizEditMutation(numericQuizId);
  const approveEditRequest = useApproveQuizEditRequestMutation(numericQuizId);
  const rejectEditRequest = useRejectQuizEditRequestMutation(numericQuizId);

  const detailQueriesEnabled =
    !suppressDetailQueries && !deleteQuiz.isPending;

  const {
    data: quiz,
    isLoading,
    error,
    isSuccess: quizLoaded,
  } = useManageQuizQuery(numericQuizId, detailQueriesEnabled);

  const { data: assignments = [] } = useQuizAssignmentsQuery(
    numericQuizId,
    detailQueriesEnabled && quizLoaded,
  );

  const scopeSchoolId = quiz?.schoolId ?? 0;
  const scopeCampusId = quiz?.campusId ?? 0;
  const quizCreatorRole = quiz ? resolveQuizCreatorRole(quiz) : "";
  const { data: scopeCampuses = [] } = useDirectoryCampusesQuery(
    scopeSchoolId,
    detailQueriesEnabled &&
      quizCreatorRole === "CampusAdmin" &&
      scopeSchoolId > 0 &&
      scopeCampusId > 0,
  );
  const scopeCampusName =
    scopeCampuses.find((campus) => campus.id === scopeCampusId)?.name ?? null;

  const isSubmitting =
    publishQuiz.isPending ||
    approveQuiz.isPending ||
    rejectQuiz.isPending ||
    deleteQuiz.isPending ||
    duplicateQuiz.isPending ||
    archiveQuiz.isPending ||
    unarchiveQuiz.isPending ||
    removeQuestion.isPending ||
    attachBankQuestion.isPending ||
    assignQuiz.isPending ||
    cancelAssignments.isPending ||
    allowRetry.isPending ||
    requestQuizEdit.isPending ||
    approveEditRequest.isPending ||
    rejectEditRequest.isPending;

  async function runAction(action: () => Promise<unknown>, success: string) {
    setActionError(null);
    setSuccessMessage(null);

    try {
      await action();
      if (success) {
        setSuccessMessage(success);
      }
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Action failed.");
    }
  }

  function openBankDialog() {
    setShowBankDialog(true);
  }

  if (isLoading && !suppressDetailQueries) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading quiz...
      </div>
    );
  }

  if (!quiz) {
    if (suppressDetailQueries) {
      return (
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-600 sm:px-6">
          Closing quiz...
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Quiz not found"
          description={error?.message ?? "Unable to load quiz."}
          backTo="/quizzes"
          backAriaLabel="Back to quizzes"
        />
      </div>
    );
  }

  const draft = isDraftQuiz(quiz.lifecycleStatus);
  const archived = quiz.lifecycleStatus.trim().toLowerCase() === "archived";
  const published = isPublishedQuizLifecycle(quiz.lifecycleStatus);
  const approvalRejected = isRejectedQuizApprovalStatus(quiz.approvalStatus);
  const schoolApproved = isSchoolApprovedQuizStatus(quiz.approvalStatus);
  const settingsEditable =
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
  const canRequestEdit =
    user != null &&
    canRequestQuizEdit({
      role: user.role,
      userId: user.id,
      createdBy: quiz.createdBy,
      lifecycleStatus: quiz.lifecycleStatus,
      approvalStatus: quiz.approvalStatus,
      hasApprovedEditGrant: quiz.hasApprovedEditGrant,
      myEditRequestStatus: quiz.myEditRequest?.status,
      assignments,
    });
  const questionsEditable = settingsEditable;
  const submitForReview =
    user != null &&
    canSubmitQuizForReview(
      user.role,
      user.id,
      quiz.createdBy,
      quiz.lifecycleStatus,
      quiz.approvalStatus,
      quiz.questionCount,
      settingsEditable,
      quiz.approvalHistory,
    );
  const portalCanPublish =
    user != null &&
    canPortalPublishQuiz(
      user.role,
      quiz.lifecycleStatus,
      quiz.approvalStatus,
      quiz.quizType,
    );
  const canRemoveQuiz =
    user != null &&
    canDeleteOrArchiveQuiz(
      user.role,
      user.id,
      quiz.createdBy,
      quiz.lifecycleStatus,
      quiz.approvalStatus,
      quiz.quizType,
    );
  const canAssign =
    user != null &&
    canAssignQuiz(
      user.role,
      quiz.lifecycleStatus,
      quiz.approvalStatus,
      quiz.questionCount,
      quiz.quizType,
    );
  const displayStatus = resolveQuizDisplayStatus(
    quiz.lifecycleStatus,
    quiz.approvalStatus,
    quiz.questionCount,
    quiz.approvalHistory,
  );
  const instructionLines = visibleQuizInstructions(
    quiz.title,
    quiz.instructions,
  );
  const descriptionText = quiz.description.trim();
  const showDescription =
    descriptionText.length > 0 &&
    descriptionText.toLowerCase() !== quiz.title.trim().toLowerCase();
  const approvalReviewMode =
    user != null &&
    canApproveQuizOnDetailPage(
      user.role,
      user.id,
      quiz.createdBy,
      quiz.quizType,
      quiz.lifecycleStatus,
      quiz.approvalStatus,
    );
  const quizScopeRows = resolveQuizScopeRows(quiz, scopeCampusName);

  async function handleApproveQuiz() {
    setActionError(null);
    setSuccessMessage(null);
    try {
      await approveQuiz.mutateAsync(numericQuizId);
      setShowRejectForm(false);
      setRejectReason("");
      setSuccessMessage(
        user?.role === "PortalAdmin"
          ? "Quiz approved."
          : "Quiz school-approved.",
      );
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to approve quiz.");
    }
  }

  async function handleRejectQuiz() {
    const reason = rejectReason.trim();
    if (!reason) {
      setActionError("Rejection reason is required.");
      return;
    }

    setActionError(null);
    setSuccessMessage(null);
    try {
      await rejectQuiz.mutateAsync({ quizId: numericQuizId, reason });
      setShowRejectForm(false);
      setRejectReason("");
      setSuccessMessage("Quiz rejected.");
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to reject quiz.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title={quiz.title}
        description={`${quiz.subject} · ${quiz.grade} · ${displayStatus}`}
        backTo="/quizzes"
        backAriaLabel="Back to quizzes"
        action={
          approvalReviewMode ? null : (
          <div className="flex gap-2">
            {!draft ? (
              <Link
                to={`/quizzes/${numericQuizId}/monitoring`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Monitor
              </Link>
            ) : null}
            {settingsEditable ? (
              <Link
                to={`/quizzes/${numericQuizId}/edit`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Edit settings
              </Link>
            ) : null}
            {canRequestEdit ? (
              <button
                type="button"
                onClick={() => {
                  setShowRequestEditForm(true);
                  setActionError(null);
                }}
                className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
              >
                Request edit
              </button>
            ) : null}
          </div>
          )
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

      {quiz.hasApprovedEditGrant ? (
        <div className="mb-4 rounded-lg border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] px-4 py-3 text-sm text-[var(--status-pending-text)]">
          Your edit request was approved. Saving changes returns this quiz to
          Draft + Pending — resubmit for approval after you edit.
        </div>
      ) : null}

      {quiz.myEditRequest?.status === "Pending" ? (
        <div className="mb-4 rounded-lg border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] px-4 py-3 text-sm text-[var(--status-pending-text)]">
          Your edit request is waiting for review. Reason:{" "}
          {quiz.myEditRequest.reason}
        </div>
      ) : null}

      {quiz.myEditRequest?.status === "Rejected" && !quiz.hasApprovedEditGrant ? (
        <div className="mb-4 rounded-lg border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] px-4 py-3 text-sm text-[var(--status-rejected-text)]">
          Your last edit request was rejected
          {quiz.myEditRequest.decisionReason
            ? `: ${quiz.myEditRequest.decisionReason}`
            : "."}
        </div>
      ) : null}

      {showRequestEditForm ? (
        <section className="mb-4 rounded-2xl border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--status-pending-text)]">
            Request edit
          </h2>
          <p className="mt-2 text-sm text-[var(--status-pending-text)]">
            Explain why this approved or published quiz needs to change (at least
            10 characters). After someone approves, you may edit once, then
            resubmit for approval.
          </p>
          <textarea
            value={requestEditReason}
            onChange={(event) => setRequestEditReason(event.target.value)}
            className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={3}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSubmitting || requestEditReason.trim().length < 10}
              onClick={() =>
                void runAction(async () => {
                  await requestQuizEdit.mutateAsync(requestEditReason.trim());
                  setShowRequestEditForm(false);
                  setRequestEditReason("");
                }, "Edit request sent.")
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-70"
            >
              Send request
            </button>
            <button
              type="button"
              onClick={() => setShowRequestEditForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {(quiz.pendingEditRequests?.length ?? 0) > 0 ? (
        <section className="mb-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">
            Pending edit requests
          </h2>
          <ul className="mt-3 space-y-3">
            {quiz.pendingEditRequests!.map((item) => (
              <li
                key={item.requestId}
                className="rounded-lg border border-border px-4 py-3 text-sm"
              >
                <p className="font-medium text-foreground">
                  {item.requesterName} ({item.requesterRole})
                </p>
                <p className="mt-1 text-muted-foreground">{item.reason}</p>
                {rejectEditRequestId === item.requestId ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={rejectEditReason}
                      onChange={(event) => setRejectEditReason(event.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Rejection reason (at least 10 characters)"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={
                          isSubmitting || rejectEditReason.trim().length < 10
                        }
                        onClick={() =>
                          void runAction(
                            () =>
                              rejectEditRequest.mutateAsync({
                                requestId: item.requestId,
                                reason: rejectEditReason.trim(),
                              }),
                            "Edit request rejected.",
                          )
                        }
                        className="rounded-lg border border-[var(--status-rejected-border)] px-3 py-1.5 text-sm text-[var(--status-rejected-text)]"
                      >
                        Confirm reject
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectEditRequestId(null)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        void runAction(
                          () => approveEditRequest.mutateAsync(item.requestId),
                          "Edit request approved.",
                        )
                      }
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setRejectEditRequestId(item.requestId);
                        setRejectEditReason("");
                      }}
                      className="rounded-lg border border-[var(--status-rejected-border)] px-3 py-1.5 text-sm text-[var(--status-rejected-text)]"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Questions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {quiz.questions.length > 0
              ? quiz.questions.length
              : quiz.questionCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total marks</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {quiz.questions.length > 0
              ? sumQuizMarks(quiz.questions)
              : quiz.totalMarks}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total time</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {quiz.questions.length > 0
              ? formatQuizDuration(sumQuizEstimatedSeconds(quiz.questions))
              : quiz.timeLimitMinutes != null
                ? `${quiz.timeLimitMinutes} min`
                : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Assignments</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {assignments.length}
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {approvalRejected && quiz.rejectionReason ? (
          <div className="mb-3 rounded-lg border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] px-4 py-3 text-sm text-[var(--status-rejected-text)]">
            Rejected: {quiz.rejectionReason}
          </div>
        ) : approvalRejected ? (
          <div className="mb-3 rounded-lg border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] px-4 py-3 text-sm text-[var(--status-rejected-text)]">
            This quiz was rejected and cannot be approved until you resubmit it.
          </div>
        ) : schoolApproved ? (
          <div className="mb-3 rounded-lg border border-[var(--status-active-border)] bg-[var(--status-active-bg)] px-4 py-3 text-sm text-[var(--status-active-text)]">
            School-approved — waiting for portal admin final approval before
            assignment.
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={displayStatus}
                tone={getQuestionStatusTone(displayStatus, true)}
              />
              {!isDraftQuiz(quiz.lifecycleStatus.trim().toLowerCase()) ? (
                <StatusBadge
                  label={quiz.lifecycleStatus}
                  tone={getQuestionStatusTone(quiz.lifecycleStatus, true)}
                />
              ) : null}
              <StatusBadge
                label={formatQuizDisplayStatusLabel(quiz.approvalStatus)}
                tone={getQuestionStatusTone(quiz.approvalStatus, true)}
              />
              <StatusBadge label={quiz.quizType} />
            </div>

            {instructionLines.length > 0 ? (
              <>
                <h3 className="mt-2 text-sm font-medium text-slate-900">
                  Instructions
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {instructionLines.map((instruction) => (
                    <li key={instruction}>{instruction}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {showDescription ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {descriptionText}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-0.5 text-right">
            <MetaInlineRow
              label="Created by"
              value={resolveQuizCreatorLabel(quiz)}
            />
            <MetaInlineRow
              label="Created"
              value={resolveQuizCreatedLabel(quiz)}
            />
            {quizScopeRows.map((row) => (
              <MetaInlineRow
                key={row.label}
                label={row.label}
                value={row.value}
              />
            ))}
          </div>
        </div>
      </section>

      {approvalReviewMode && user ? (
        <section className="mb-6 rounded-2xl border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--status-pending-text)]">
            Approval review
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--status-pending-text)]">
            Review the quiz details and questions below. Approve to endorse this quiz
            {user.role === "PortalAdmin"
              ? schoolApproved
                ? " with final portal approval."
                : " (portal final approval)."
              : " for your school or campus (does not publish)."}{" "}
            Reject requires a reason — the creator must fix and resubmit.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!showRejectForm ? (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleApproveQuiz()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
                >
                  {quizApprovalButtonLabel(user.role)}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowRejectForm(true);
                    setActionError(null);
                  }}
                  className="rounded-lg border border-[var(--status-rejected-border)] px-4 py-2 text-sm font-medium text-[var(--status-rejected-text)] transition hover:bg-[var(--status-rejected-bg)] disabled:opacity-70"
                >
                  Reject
                </button>
              </>
            ) : (
              <div className="w-full max-w-md space-y-3">
                <input
                  type="text"
                  value={rejectReason}
                  disabled={isSubmitting}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Rejection reason (required)"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting || !rejectReason.trim()}
                    onClick={() => void handleRejectQuiz()}
                    className="rounded-lg border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] px-4 py-2 text-sm font-medium text-[var(--status-rejected-text)] transition hover:opacity-90 disabled:opacity-70"
                  >
                    Confirm reject
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason("");
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {!approvalReviewMode ? (
      <section className="mb-6 flex flex-wrap gap-2">
        {questionsEditable ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={openBankDialog}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
            >
              Add from bank
            </button>
            {submitForReview ? (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    void runAction(
                      () => publishQuiz.mutateAsync(),
                      "Submitted for approval. The quiz stays unpublished until a portal admin publishes it.",
                    )
                  }
                  className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5 disabled:opacity-70"
                >
                  Submit for approval
                </button>
                {canRemoveQuiz ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      void (async () => {
                        setActionError(null);
                        setSuccessMessage(null);
                        flushSync(() => setSuppressDetailQueries(true));
                        try {
                          await deleteQuiz.mutateAsync();
                          navigate("/quizzes");
                        } catch (caught) {
                          setSuppressDetailQueries(false);
                          const apiError = caught as { message?: string };
                          setActionError(apiError.message || "Action failed.");
                        }
                      })();
                    }}
                    className="rounded-lg border border-[var(--status-rejected-border)] px-4 py-2 text-sm font-medium text-[var(--status-rejected-text)] transition hover:bg-[var(--status-rejected-bg)] disabled:opacity-70"
                  >
                    Delete
                  </button>
                ) : null}
              </>
            ) : null}
            {portalCanPublish ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  void runAction(
                    () => publishQuiz.mutateAsync(),
                    "Quiz published and available to assign.",
                  )
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
              >
                Publish quiz
              </button>
            ) : null}
            {approvalRejected && canAuthor ? (
              <button
                type="button"
                disabled={isSubmitting || quiz.questionCount === 0}
                onClick={() =>
                  void runAction(
                    () => publishQuiz.mutateAsync(),
                    "Resubmitted for approval.",
                  )
                }
                className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5 disabled:opacity-70"
              >
                Resubmit for approval
              </button>
            ) : null}
          </>
        ) : null}

        {archived && canRemoveQuiz ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              void runAction(() => unarchiveQuiz.mutateAsync(), "Quiz unarchived.")
            }
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
          >
            Unarchive
          </button>
        ) : null}

        {draft && !published ? (
          <p className="w-full basis-full text-sm text-muted-foreground">
            This quiz is not published yet. Only you and portal admins can see it.
            Assign to students after a portal admin publishes it.
          </p>
        ) : null}

        {published && !canAssign ? (
          <p className="w-full basis-full text-sm text-[var(--status-pending-text)]">
            This quiz is published but not yet approved for assignment.
            {schoolApproved
              ? " A portal admin must give final approval before you can assign."
              : " Wait for the required approval before assigning."}
          </p>
        ) : null}

        {published && canAssign ? (
          <>
            <button
              type="button"
              disabled={isSubmitting || quiz.questionCount === 0}
              onClick={() => setShowAssignDialog(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
            >
              Assign
            </button>
            {canAuthor ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  void runAction(async () => {
                    const duplicated = await duplicateQuiz.mutateAsync();
                    if (!duplicated?.id) {
                      throw new Error(
                        "Quiz was duplicated but the new quiz id was missing.",
                      );
                    }
                    navigate(`/quizzes/${duplicated.id}`);
                  }, "Quiz duplicated.")
                }
                className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5 disabled:opacity-70"
              >
                Duplicate
              </button>
            ) : null}
            {canRemoveQuiz ? (
              <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    void (async () => {
                      setActionError(null);
                      setSuccessMessage(null);
                      try {
                        const result = await archiveQuiz.mutateAsync();
                        if (result.permanentlyDeleted) {
                          // Hard-delete only: stop manage refetch, then leave the page.
                          flushSync(() => setSuppressDetailQueries(true));
                          navigate("/quizzes");
                          return;
                        }
                        // Soft archive: mutation already invalidated manage for latest status.
                        setSuccessMessage("Quiz archived.");
                      } catch (caught) {
                        const apiError = caught as { message?: string };
                        setActionError(apiError.message || "Action failed.");
                      }
                    })();
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-70"
                >
                  Archive
                </button>
            ) : null}
            {assignments.length > 0 ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  const confirmed = window.confirm(
                    "Cancel upcoming assignments for this quiz?",
                  );
                  if (!confirmed) {
                    return;
                  }

                  void runAction(
                    () => cancelAssignments.mutateAsync(),
                    "Upcoming assignments cancelled.",
                  );
                }}
                className="rounded-lg border border-[var(--status-pending-border)] px-4 py-2 text-sm font-medium text-[var(--status-pending-text)] transition hover:bg-[var(--status-pending-bg)] disabled:opacity-70"
              >
                Cancel assignments
              </button>
            ) : null}
          </>
        ) : null}
      </section>
      ) : null}

      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-slate-900">
            {quiz.questions.length} question
            {quiz.questions.length === 1 ? "" : "s"}
          </p>
        </div>

        {quiz.questions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-600 sm:px-5">
            No questions added yet.
          </div>
        ) : (
          <div>
            <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:grid sm:grid-cols-7 sm:gap-3 sm:px-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Subject
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Class
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Difficulty
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Type
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Marks
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Time sec
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {approvalReviewMode ? "—" : "Actions"}
              </p>
            </div>

            <ul className="divide-y divide-slate-200">
              {quiz.questions.map((question) => {
                const timeLabel =
                  question.estimatedTimeSeconds > 0
                    ? `${question.estimatedTimeSeconds} sec`
                    : "—";
                const questionLine = `${question.displayOrder}. ${question.questionText}`;
                const answers = answersFromQuizQuestion(question);

                return (
                  <li key={question.questionId} className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-start gap-3">
                      <p
                        className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900"
                        title={questionLine}
                      >
                        {questionLine}
                      </p>
                      <QuizQuestionAnswerAside
                        questionType={question.questionType}
                        answers={answers}
                        options={question.options}
                      />
                    </div>

                    <div className="mt-2 grid grid-cols-2 items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 sm:grid-cols-7">
                      <p className="min-w-0 truncate font-medium text-slate-900">
                        {quiz.subject}
                      </p>
                      <p className="min-w-0 truncate">{quiz.grade}</p>
                      <p className="min-w-0 truncate">{quiz.difficulty}</p>
                      <p className="min-w-0 truncate">{question.questionType}</p>
                      <p className="min-w-0 truncate tabular-nums sm:hidden">
                        {question.marks} / {timeLabel}
                      </p>
                      <p className="hidden min-w-0 truncate tabular-nums sm:block">
                        {question.marks}
                      </p>
                      <p className="hidden min-w-0 truncate tabular-nums sm:block">
                        {timeLabel}
                      </p>
                      <div className="col-span-2 flex min-w-0 flex-wrap gap-2 sm:col-span-1">
                        {questionsEditable && !approvalReviewMode ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() =>
                              void runAction(
                                () =>
                                  removeQuestion.mutateAsync(
                                    question.questionId,
                                  ),
                                "Question removed.",
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="hidden text-xs text-slate-400 sm:inline">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {assignments.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Assignments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Window
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Attempts
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Result
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.assignmentId}>
                    <td className="px-4 py-3 text-slate-700">
                      {assignment.studentName?.trim() || assignment.studentId}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(assignment.startAt)} -{" "}
                      {formatDateTime(assignment.endAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {assignment.attemptCount}/{assignment.allowedAttempts}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {assignment.resultStatus}
                      {assignment.isReviewDone ? (
                        <span className="ml-2 text-xs text-emerald-700">
                          Reviewed
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canAllowRetry(assignment) ? (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() =>
                            void runAction(
                              () =>
                                allowRetry.mutateAsync({
                                  assignmentId: assignment.assignmentId,
                                }),
                              "Extra attempt allowed.",
                            )
                          }
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                        >
                          Allow retry
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

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
              {(quiz.approvalHistory?.length ?? 0) > 0 ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  ({quiz.approvalHistory!.length})
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
            {(quiz.approvalHistory?.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-muted/40 px-3.5 py-3 text-sm text-muted-foreground">
                No history recorded yet. New actions will appear here for Teacher,
                Campus Admin, School Admin, and Portal Admin.
              </p>
            ) : (
              <ol className="relative space-y-3 border-l border-border pl-5">
                {quiz.approvalHistory!.map((entry) => (
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

      {showBankDialog ? (
        <AttachBankQuestionsDialog
          subjectId={quiz.subjectId}
          classId={quiz.classId}
          excludeQuestionIds={quiz.questions.map((item) => item.questionId)}
          isSubmitting={attachBankQuestion.isPending}
          onClose={() => setShowBankDialog(false)}
          onAttach={async (inputs) => {
            setActionError(null);
            try {
              for (const input of inputs) {
                await attachBankQuestion.mutateAsync(input);
              }
              setShowBankDialog(false);
              setSuccessMessage(
                inputs.length === 1
                  ? "Question attached from bank."
                  : `${inputs.length} questions attached from bank.`,
              );
            } catch (caught) {
              const apiError = caught as { message?: string };
              setActionError(
                apiError.message || "Unable to attach bank questions.",
              );
              throw caught;
            }
          }}
        />
      ) : null}

      {showAssignDialog ? (
        <AssignQuizDialog
          isSubmitting={assignQuiz.isPending}
          classId={quiz.classId}
          allowedAttempts={quiz.allowedAttempts}
          schoolId={quiz.schoolId}
          campusId={quiz.campusId}
          quizType={quiz.quizType}
          onClose={() => setShowAssignDialog(false)}
          onSubmit={async (input) => {
            setActionError(null);
            try {
              await assignQuiz.mutateAsync(input);
              setShowAssignDialog(false);
              setSuccessMessage("Quiz assigned successfully.");
            } catch (caught) {
              const apiError = caught as { message?: string };
              setActionError(apiError.message || "Unable to assign quiz.");
              throw caught;
            }
          }}
        />
      ) : null}
    </div>
  );
}
