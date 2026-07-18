import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { queryKeys } from "@/core/api/queryKeys";
import * as schoolChangeApi from "@/features/admin/data/schoolChangeApi";
import * as notificationsApi from "@/features/notifications/data/notificationsApi";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

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

export function PendingSchoolChangesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canApply =
    user?.role === "PortalAdmin" || user?.role === "SchoolAdmin";

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["admin", "school-changes", "pending"],
    queryFn: () => schoolChangeApi.listPendingSchoolChanges(50),
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: number) =>
      schoolChangeApi.approveSchoolChange(requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "school-changes", "pending"],
      });
      await notificationsApi.markNotificationCategoryRead("SchoolChangeRequest");
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: number) =>
      schoolChangeApi.rejectSchoolChange(requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "school-changes", "pending"],
      });
      await notificationsApi.markNotificationCategoryRead("SchoolChangeRequest");
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="School / campus change requests"
        description="School Admin or Portal Admin can approve and apply Teacher/Student school or campus changes. Portal Admin can see whether School Admin already approved."
        action={
          <Link
            to="/admin/directory"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to directory
          </Link>
        }
      />

      {isLoading ? (
        <p className="text-sm text-slate-600">Loading requests...</p>
      ) : null}
      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as { message?: string })?.message ||
            "Unable to load school change requests."}
        </div>
      ) : null}

      {!isLoading && !isError && data.length === 0 ? (
        <p className="text-sm text-slate-600">No pending school/campus changes.</p>
      ) : null}

      {data.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">From → To</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Approvers</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item) => {
                const approveDisabled =
                  approveMutation.isPending ||
                  rejectMutation.isPending ||
                  (!canApply && item.currentUserHasApproved);

                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.fullName}</p>
                      <p className="text-xs text-slate-500">
                        @{item.username} · {item.requesterRole}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p>
                        School {item.fromSchoolId ?? "—"} →{" "}
                        {item.toSchoolId ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Campus {item.fromCampusId ?? "—"} →{" "}
                        {item.toCampusId ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatRequestedAt(item.requestedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p
                        className={
                          item.schoolAdminHasApproved
                            ? "font-medium text-green-700"
                            : "font-medium text-amber-700"
                        }
                      >
                        {item.schoolAdminHasApproved
                          ? "School Admin approved"
                          : "School Admin not approved yet"}
                      </p>
                      {item.approvers.length > 0 ? (
                        <p className="mt-1">
                          Pending:{" "}
                          {item.approvers
                            .map((a) => `${a.fullName} (${a.role})`)
                            .join(", ")}
                        </p>
                      ) : null}
                      {item.currentUserHasApproved ? (
                        <p className="mt-1 font-medium text-brand-700">
                          {canApply
                            ? "You already approved — approve again to apply"
                            : "You already approved"}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={approveDisabled}
                          onClick={() => approveMutation.mutate(item.id)}
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={
                            approveMutation.isPending || rejectMutation.isPending
                          }
                          onClick={() => rejectMutation.mutate(item.id)}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
