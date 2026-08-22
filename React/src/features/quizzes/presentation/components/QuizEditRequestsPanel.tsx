import { useState } from "react";
import { Link } from "react-router-dom";
import type { QuizEditRequestListItem } from "@/features/quizzes/domain/quizTypes";
import {
  useApproveQuizEditRequestMutation,
  useRejectQuizEditRequestMutation,
} from "@/features/quizzes/presentation/hooks/useQuizQueries";

interface QuizEditRequestsPanelProps {
  items: QuizEditRequestListItem[];
  isLoading?: boolean;
  error?: Error | null;
}

export function QuizEditRequestsPanel({
  items,
  isLoading = false,
  error = null,
}: QuizEditRequestsPanelProps) {
  const approveRequest = useApproveQuizEditRequestMutation();
  const rejectRequest = useRejectQuizEditRequestMutation();
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

  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">
        No pending quiz edit requests.
      </p>
    );
  }

  return (
    <div className="space-y-3 px-4 py-4 sm:px-5">
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
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.requestId} className="py-3">
            <Link
              to={`/quizzes/${item.quizId}`}
              className="font-medium text-foreground hover:underline"
            >
              {item.quizTitle}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.requesterName} · {item.requesterRole} — {item.reason}
            </p>
            {rejectingId === item.requestId ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={rejectReason.trim().length < 10}
                    onClick={() =>
                      void runAction(
                        () =>
                          rejectRequest.mutateAsync({
                            requestId: item.requestId,
                            reason: rejectReason.trim(),
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
                    onClick={() => setRejectingId(null)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void runAction(
                      () => approveRequest.mutateAsync(item.requestId),
                      "Edit request approved.",
                    )
                  }
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(item.requestId);
                    setRejectReason("");
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
    </div>
  );
}
