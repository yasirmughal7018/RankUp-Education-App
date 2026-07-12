import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PendingRegistration } from "@/features/admin/domain/registrationTypes";
import { isRegistrationActionRole } from "@/features/admin/domain/registrationTypes";
import { ApproveRegistrationDialog } from "@/features/admin/presentation/components/ApproveRegistrationDialog";
import {
  useApproveRegistrationMutation,
  usePendingRegistrationsQuery,
  useRejectRegistrationMutation,
} from "@/features/admin/presentation/hooks/useRegistrationQueries";
import { PageHeader } from "@/core/components/PageHeader";
import { queryKeys } from "@/core/api/queryKeys";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import * as notificationsApi from "@/features/notifications/data/notificationsApi";
import * as directoryApi from "@/features/directory/data/directoryApi";
import { useDirectorySchoolsQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";

const REASON_PREVIEW_LENGTH = 48;

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

function truncateReason(reason: string | null | undefined): {
  preview: string;
  isTruncated: boolean;
} {
  const text = reason?.trim() ?? "";
  if (!text) {
    return { preview: "—", isTruncated: false };
  }

  if (text.length <= REASON_PREVIEW_LENGTH) {
    return { preview: text, isTruncated: false };
  }

  return {
    preview: `${text.slice(0, REASON_PREVIEW_LENGTH).trimEnd()}…`,
    isTruncated: true,
  };
}

function ReasonDialog({
  fullName,
  reason,
  onClose,
}: {
  fullName: string;
  reason: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-dialog-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="reason-dialog-title"
          className="text-lg font-semibold text-slate-900"
        >
          Reason
        </h2>
        <p className="mt-1 text-sm text-slate-500">{fullName}</p>
        <p className="mt-4 whitespace-pre-wrap text-sm text-slate-800">{reason}</p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function PendingRegistrationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: registrations = [], isLoading, error, refetch, isFetching } =
    usePendingRegistrationsQuery();
  const { data: schools = [] } = useDirectorySchoolsQuery();
  const approveRegistration = useApproveRegistrationMutation();
  const rejectRegistration = useRejectRegistrationMutation();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedRegistration, setSelectedRegistration] =
    useState<PendingRegistration | null>(null);
  const [reasonRegistration, setReasonRegistration] =
    useState<PendingRegistration | null>(null);

  const isSubmitting =
    approveRegistration.isPending || rejectRegistration.isPending;

  const isPortalAdmin = user?.role === "PortalAdmin";
  const isSchoolAdmin = user?.role === "SchoolAdmin";
  const roleLabel = isPortalAdmin
    ? "Portal Admin"
    : isSchoolAdmin
      ? "School Admin"
      : "Campus Admin";

  const schoolNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const school of schools) {
      map.set(school.id, school.name);
    }
    return map;
  }, [schools]);

  const schoolIdsNeedingCampuses = useMemo(() => {
    const ids = new Set<number>();
    for (const registration of registrations) {
      if (registration.schoolId != null && registration.campusId != null) {
        ids.add(registration.schoolId);
      }
    }
    return [...ids].sort((a, b) => a - b);
  }, [registrations]);

  const campusesQuery = useQuery({
    queryKey: ["directory", "campuses-for-registrations", schoolIdsNeedingCampuses],
    enabled: schoolIdsNeedingCampuses.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        schoolIdsNeedingCampuses.map(async (schoolId) => {
          const campuses = await directoryApi.listCampuses(schoolId);
          return [schoolId, campuses] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  const campusNameById = useMemo(() => {
    const map = new Map<number, string>();
    const bySchool = campusesQuery.data ?? {};
    for (const campuses of Object.values(bySchool)) {
      for (const campus of campuses) {
        map.set(campus.id, campus.name);
      }
    }
    return map;
  }, [campusesQuery.data]);

  useEffect(() => {
    void notificationsApi
      .markNotificationCategoryRead("RegistrationRequest")
      .then(() =>
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
      )
      .catch(() => undefined);
  }, [queryClient]);

  async function handleApprove(registration: PendingRegistration) {
    setActionError(null);
    setSuccessMessage(null);

    try {
      await approveRegistration.mutateAsync(registration.id);
      setSelectedRegistration(null);
      setSuccessMessage(
        `${registration.fullName} was approved. They must set a password on first login.`,
      );
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

  function schoolLabel(registration: PendingRegistration): string {
    if (registration.schoolId == null) {
      return "No school";
    }
    return (
      schoolNameById.get(registration.schoolId) ??
      `School #${registration.schoolId}`
    );
  }

  function campusLabel(registration: PendingRegistration): string | null {
    if (registration.campusId == null) {
      return null;
    }
    return (
      campusNameById.get(registration.campusId) ??
      `Campus #${registration.campusId}`
    );
  }

  function formatPendingApprovers(registration: PendingRegistration): string {
    const approvers = registration.pendingApprovers ?? [];
    if (approvers.length === 0) {
      return registration.adminTarget
        ? `Awaiting ${registration.adminTarget}`
        : "—";
    }

    return approvers
      .map((approver) => `${approver.fullName} (${formatApproverRole(approver.role)})`)
      .join(", ");
  }

  function formatApproverRole(role: string): string {
    switch (role) {
      case "PortalAdmin":
        return "Portal Admin";
      case "SchoolAdmin":
        return "School Admin";
      case "CampusAdmin":
        return "Campus Admin";
      default:
        return role;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Registration approvals"
        description={
          isPortalAdmin
            ? "Portal Admin view: see who the request is pending with, then approve. Any eligible admin approval activates the account; the user sets their password on first login."
            : isSchoolAdmin
              ? "School Admin view: see who the request is pending with for your school, then approve. Any eligible admin approval activates the account; the user sets their password on first login."
              : "Campus Admin view: see who the request is pending with for your campus, then approve. Any eligible admin approval activates the account; the user sets their password on first login."
        }
        action={
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {roleLabel}
            </span>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching || isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Refresh
            </button>
          </div>
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
                    Pending with
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
                  const campus = campusLabel(registration);
                  const { preview, isTruncated } = truncateReason(
                    registration.reasonMessage,
                  );

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
                      <td className="max-w-[14rem] px-4 py-3 text-slate-700">
                        <div>{schoolLabel(registration)}</div>
                        {campus ? (
                          <div className="text-xs font-normal text-slate-500">
                            {campus}
                          </div>
                        ) : null}
                      </td>
                      <td className="max-w-[18rem] px-4 py-3 text-slate-700">
                        <div className="text-xs leading-5 text-slate-700">
                          {formatPendingApprovers(registration)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {formatRequestedAt(createdDisplay)}
                      </td>
                      <td className="max-w-[16rem] px-4 py-3 text-slate-700">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="break-words">{preview}</span>
                          {isTruncated ? (
                            <button
                              type="button"
                              onClick={() => setReasonRegistration(registration)}
                              className="shrink-0 text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline"
                            >
                              Read more
                            </button>
                          ) : null}
                        </div>
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
          schoolName={schoolLabel(selectedRegistration)}
          campusName={campusLabel(selectedRegistration)}
          isSubmitting={approveRegistration.isPending}
          onClose={() => setSelectedRegistration(null)}
          onConfirm={handleApprove}
        />
      ) : null}

      {reasonRegistration?.reasonMessage ? (
        <ReasonDialog
          fullName={reasonRegistration.fullName}
          reason={reasonRegistration.reasonMessage}
          onClose={() => setReasonRegistration(null)}
        />
      ) : null}
    </div>
  );
}
