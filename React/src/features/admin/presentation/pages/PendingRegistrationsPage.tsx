import { useState } from "react";
import type { ApproveRegistrationRequest, PendingRegistration } from "@/features/admin/domain/registrationTypes";
import { isRegistrationActionRole } from "@/features/admin/domain/registrationTypes";
import { ApproveRegistrationDialog } from "@/features/admin/presentation/components/ApproveRegistrationDialog";
import {
  useApproveRegistrationMutation,
  usePendingRegistrationsQuery,
  useRejectRegistrationMutation,
} from "@/features/admin/presentation/hooks/useRegistrationQueries";
import { PageHeader } from "@/core/components/PageHeader";

function formatRequestedAt(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  // DateOnly comes as "YYYY-MM-DD"; DateTimeOffset as ISO string.
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: value.length === 10 ? undefined : "short",
  }).format(date);
}

function formatSchoolCampus(registration: PendingRegistration): string {
  const parts: string[] = [];

  if (registration.schoolCampusName) {
    parts.push(registration.schoolCampusName);
  }

  if (registration.schoolId != null || registration.campusId != null) {
    const ids = [
      registration.schoolId != null ? `School ${registration.schoolId}` : null,
      registration.campusId != null ? `Campus ${registration.campusId}` : null,
    ]
      .filter(Boolean)
      .join(" / ");
    if (ids) {
      parts.push(ids);
    }
  }

  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function PendingRegistrationsPage() {
  const { data: registrations = [], isLoading, error, refetch, isFetching } =
    usePendingRegistrationsQuery();
  const approveRegistration = useApproveRegistrationMutation();
  const rejectRegistration = useRejectRegistrationMutation();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedRegistration, setSelectedRegistration] =
    useState<PendingRegistration | null>(null);

  const isSubmitting =
    approveRegistration.isPending || rejectRegistration.isPending;

  async function handleApprove(
    registration: PendingRegistration,
    request: ApproveRegistrationRequest,
  ) {
    setActionError(null);
    setSuccessMessage(null);

    try {
      await approveRegistration.mutateAsync({
        userId: registration.id,
        request,
      });
      setSelectedRegistration(null);
      setSuccessMessage(`${registration.fullName} was approved successfully.`);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to approve registration.");
      throw caught;
    }
  }

  async function handleReject(registration: PendingRegistration) {
    const confirmed = window.confirm(
      `Reject registration request for ${registration.fullName}?`,
    );

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);

    try {
      await rejectRegistration.mutateAsync(registration.id);
      setSuccessMessage(`${registration.fullName} was rejected.`);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to reject registration.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Pending registrations"
        description="Review account access requests and approve or reject new Student, Parent, and Teacher accounts."
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching || isSubmitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            Refresh
          </button>
        }
      />

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {error || actionError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError ?? error?.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading pending registrations...
          </div>
        ) : registrations.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No pending registration requests right now.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Mobile
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    School / campus
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {registrations.map((registration) => {
                  const canApprove = isRegistrationActionRole(registration.role);
                  const createdDisplay =
                    registration.createdDate ?? registration.requestedAt;

                  return (
                    <tr key={registration.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div>{registration.fullName}</div>
                        <div className="text-xs font-normal text-slate-500">
                          {registration.username}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {registration.mobileNumber ?? registration.username}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                          {registration.role}
                        </span>
                      </td>
                      <td className="max-w-[12rem] px-4 py-3 text-slate-700">
                        {formatSchoolCampus(registration)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {formatRequestedAt(createdDisplay)}
                      </td>
                      <td className="max-w-[14rem] truncate px-4 py-3 text-slate-700">
                        {registration.reasonMessage || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canApprove ? (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => setSelectedRegistration(registration)}
                              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
                            >
                              Approve
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => void handleReject(registration)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
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
        )}
      </div>

      {selectedRegistration ? (
        <ApproveRegistrationDialog
          registration={selectedRegistration}
          isSubmitting={approveRegistration.isPending}
          onClose={() => setSelectedRegistration(null)}
          onSubmit={handleApprove}
        />
      ) : null}
    </div>
  );
}
