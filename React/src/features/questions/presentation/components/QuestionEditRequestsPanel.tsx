/**
 * PortalAdmin queue: pending requests to edit Active questions.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { getRoleLabel, type UserRole } from "@/core/api/types";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { Button } from "@/components/ui/button";
import type { QuestionEditRequestListItem } from "@/features/questions/domain/questionTypes";
import {
  useApproveQuestionEditRequestMutation,
  useRejectQuestionEditRequestMutation,
} from "@/features/questions/presentation/hooks/useQuestionQueries";

function formatRequestedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

interface QuestionEditRequestsPanelProps {
  items: QuestionEditRequestListItem[];
  isLoading?: boolean;
  error?: Error | null;
}

export function QuestionEditRequestsPanel({
  items,
  isLoading = false,
  error = null,
}: QuestionEditRequestsPanelProps) {
  const approveRequest = useApproveQuestionEditRequestMutation();
  const rejectRequest = useRejectQuestionEditRequestMutation();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">
        Loading edit requests…
      </p>
    );
  }

  if (error) {
    return (
      <p className="px-4 py-6 text-sm text-[var(--status-rejected-text)] sm:px-5">
        {error.message || "Unable to load edit requests."}
      </p>
    );
  }

  return (
    <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
      {successMessage ? (
        <div className="rounded-lg border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] px-4 py-3 text-sm text-[var(--status-approved-text)]">
          {successMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-lg border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] px-4 py-3 text-sm text-[var(--status-rejected-text)]">
          {actionError}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
          No pending edit requests.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.requestId}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/questions/${item.questionId}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    #{item.questionId} · {item.questionText}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.requesterName} (
                    {getRoleLabel(item.requesterRole as UserRole)}) ·{" "}
                    {formatRequestedAt(item.requestedAt)}
                  </p>
                  <p className="mt-2 text-sm text-foreground">{item.reason}</p>
                </div>
              </div>

              {rejectingId === item.requestId ? (
                <div className="mt-4 space-y-2">
                  <label
                    htmlFor={`queue-reject-${item.requestId}`}
                    className="text-xs font-medium text-foreground"
                  >
                    Rejection reason (min 10 characters)
                  </label>
                  <textarea
                    id={`queue-reject-${item.requestId}`}
                    className={FORM_FIELD_CLASS}
                    rows={3}
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={
                        rejectRequest.isPending ||
                        rejectReason.trim().length < 10
                      }
                      onClick={() =>
                        void runAction(async () => {
                          await rejectRequest.mutateAsync({
                            requestId: item.requestId,
                            reason: rejectReason.trim(),
                          });
                          setRejectingId(null);
                          setRejectReason("");
                        }, "Edit request rejected.")
                      }
                    >
                      Confirm reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={approveRequest.isPending || rejectRequest.isPending}
                    onClick={() =>
                      void runAction(
                        () => approveRequest.mutateAsync(item.requestId),
                        "Edit request approved.",
                      )
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={approveRequest.isPending || rejectRequest.isPending}
                    onClick={() => {
                      setRejectingId(item.requestId);
                      setRejectReason("");
                    }}
                  >
                    Reject
                  </Button>
                  <Button type="button" size="sm" variant="ghost" asChild>
                    <Link to={`/questions/${item.questionId}`}>View question</Link>
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
