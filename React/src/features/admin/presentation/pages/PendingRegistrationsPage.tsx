import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import type { UserRole } from "@/core/api/types";
import type { PendingRegistration } from "@/features/admin/domain/registrationTypes";
import { isRegistrationActionRole } from "@/features/admin/domain/registrationTypes";
import { ApproveRegistrationDialog } from "@/features/admin/presentation/components/ApproveRegistrationDialog";
import { BulkRejectRegistrationsDialog } from "@/features/admin/presentation/components/BulkRejectRegistrationsDialog";
import { RejectRegistrationDialog } from "@/features/admin/presentation/components/RejectRegistrationDialog";
import { RegistrationDetailsDialog } from "@/features/admin/presentation/components/RegistrationDetailsDialog";
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
import {
  useDirectoryCampusesQuery,
  useDirectorySchoolsQuery,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
import {
  DirectoryBulkBar,
  DirectoryFilterPanel,
  DirectoryIconAction,
  directorySelectClassName,
} from "@/features/directory/presentation/components/DirectoryListChrome";
import { Button } from "@/components/ui/button";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { cn } from "@/lib/utils";
import * as registrationApi from "@/features/admin/data/registrationApi";

type RegistrationRoleFilter = "" | "Student" | "Parent" | "Teacher";

type ConfirmIntent = { kind: "bulk-approve"; count: number };

const ROLE_FILTER_OPTIONS: { value: RegistrationRoleFilter; label: string }[] = [
  { value: "", label: "All roles" },
  { value: "Student", label: "Student" },
  { value: "Parent", label: "Parent" },
  { value: "Teacher", label: "Teacher" },
];

/** Theme-aligned role chips (Student / Parent / Teacher). */
function registrationRoleBadgeClass(role: UserRole | string): string {
  switch (role) {
    case "Student":
      return "border border-primary/25 bg-primary/10 text-primary";
    case "Parent":
      return "border border-[hsl(var(--achievement))]/25 bg-[hsl(var(--achievement-light))] text-[hsl(var(--achievement))]";
    case "Teacher":
      return "border border-[hsl(var(--ai))]/25 bg-[hsl(var(--ai-light))] text-[hsl(var(--ai))]";
    default:
      return "border border-border bg-muted text-muted-foreground";
  }
}

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

function toDateKey(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (value.length >= 10) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function contactEmail(registration: PendingRegistration): string {
  return registration.emailAddress?.trim() || registration.username || "—";
}

function contactMobile(registration: PendingRegistration): string {
  return registration.mobileNumber?.trim() || "—";
}

/** Admin page to approve or reject pending account registration requests. */
export function PendingRegistrationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: registrations = [], isLoading, error, refetch, isFetching } =
    usePendingRegistrationsQuery();
  const { data: schools = [] } = useDirectorySchoolsQuery();
  const approveRegistration = useApproveRegistrationMutation();
  const rejectRegistration = useRejectRegistrationMutation();

  const [roleDraft, setRoleDraft] = useState<RegistrationRoleFilter>("");
  const [schoolDraft, setSchoolDraft] = useState("");
  const [campusDraft, setCampusDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");

  const [roleFilter, setRoleFilter] = useState<RegistrationRoleFilter>("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [campusFilter, setCampusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedRegistration, setSelectedRegistration] =
    useState<PendingRegistration | null>(null);
  const [rejectRegistrationTarget, setRejectRegistrationTarget] =
    useState<PendingRegistration | null>(null);
  const [detailsRegistration, setDetailsRegistration] =
    useState<PendingRegistration | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent | null>(
    null,
  );
  const [bulkRejectCount, setBulkRejectCount] = useState<number | null>(null);

  const isSubmitting =
    approveRegistration.isPending ||
    rejectRegistration.isPending ||
    bulkBusy;

  const isPortalAdmin = user?.role === "PortalAdmin";
  const isSchoolAdmin = user?.role === "SchoolAdmin";
  const roleLabel = isPortalAdmin
    ? "Portal Admin"
    : isSchoolAdmin
      ? "School Admin"
      : "Campus Admin";

  // SchoolAdmin is scoped to one school; CampusAdmin to one campus — hide those filters.
  const showSchoolFilter = isPortalAdmin;
  const showCampusFilter = isPortalAdmin || isSchoolAdmin;

  const draftSchoolId = showSchoolFilter
    ? schoolDraft && schoolDraft !== "__none__"
      ? Number(schoolDraft) || null
      : null
    : isSchoolAdmin && user?.schoolId != null
      ? user.schoolId
      : null;

  const selectedSchoolId = showSchoolFilter
    ? schoolFilter && schoolFilter !== "__none__"
      ? Number(schoolFilter) || null
      : null
    : null;

  const { data: filterCampuses = [] } = useDirectoryCampusesQuery(
    draftSchoolId ?? 0,
    showCampusFilter && draftSchoolId != null,
  );

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

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((registration) => {
      if (roleFilter && registration.role !== roleFilter) {
        return false;
      }

      if (schoolFilter === "__none__") {
        if (registration.schoolId != null) {
          return false;
        }
      } else if (selectedSchoolId != null) {
        if (registration.schoolId !== selectedSchoolId) {
          return false;
        }
      }

      if (campusFilter) {
        const campusId = Number(campusFilter);
        if (!Number.isFinite(campusId) || registration.campusId !== campusId) {
          return false;
        }
      }

      if (dateFilter) {
        const createdKey = toDateKey(
          registration.createdDate ?? registration.requestedAt,
        );
        if (createdKey !== dateFilter) {
          return false;
        }
      }

      return true;
    });
  }, [
    registrations,
    roleFilter,
    schoolFilter,
    selectedSchoolId,
    campusFilter,
    dateFilter,
  ]);

  const selectableIds = useMemo(
    () => filteredRegistrations.map((registration) => registration.id),
    [filteredRegistrations],
  );

  const selectedRegistrations = useMemo(
    () =>
      filteredRegistrations.filter((registration) =>
        selectedIds.has(registration.id),
      ),
    [filteredRegistrations, selectedIds],
  );

  const allSelectableSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));

  useEffect(() => {
    const visibleIds = new Set(filteredRegistrations.map((item) => item.id));
    setSelectedIds((current) => {
      const next = new Set(
        [...current].filter((id) => visibleIds.has(id)),
      );
      return next.size === current.size ? current : next;
    });
  }, [filteredRegistrations]);

  useEffect(() => {
    void notificationsApi
      .markNotificationCategoryRead("RegistrationRequest")
      .then(() =>
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
      )
      .catch(() => undefined);
  }, [queryClient]);

  function toggleSelect(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((current) => {
      if (allSelectableSelected) {
        return new Set();
      }
      return new Set(selectableIds);
    });
  }

  function requestBulkApprove() {
    const targets = selectedRegistrations.filter(
      (registration) =>
        isRegistrationActionRole(registration.role) &&
        !registration.currentUserHasApproved,
    );
    if (targets.length === 0) {
      setActionError("No selected registrations are available to approve.");
      return;
    }
    setConfirmIntent({ kind: "bulk-approve", count: targets.length });
  }

  async function executeBulkApprove() {
    const targets = selectedRegistrations.filter(
      (registration) =>
        isRegistrationActionRole(registration.role) &&
        !registration.currentUserHasApproved,
    );
    if (targets.length === 0) {
      setConfirmIntent(null);
      setActionError("No selected registrations are available to approve.");
      return;
    }

    setConfirmIntent(null);
    setBulkBusy(true);
    setActionError(null);
    setSuccessMessage(null);

    let activated = 0;
    let recorded = 0;
    let failed = 0;

    try {
      for (const registration of targets) {
        try {
          const result = await registrationApi.approveRegistration(
            registration.id,
          );
          if (result.isActivated) {
            activated += 1;
          } else {
            recorded += 1;
          }
        } catch {
          failed += 1;
        }
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.pendingRegistrations(),
      });
      setSelectedIds(new Set());

      const parts: string[] = [];
      if (activated > 0) {
        parts.push(`${activated} activated`);
      }
      if (recorded > 0) {
        parts.push(`${recorded} approved`);
      }
      if (failed > 0) {
        parts.push(`${failed} failed`);
      }
      setSuccessMessage(
        parts.length > 0
          ? `Approve finished: ${parts.join(", ")}.`
          : "Approve finished.",
      );
      if (failed > 0) {
        setActionError(
          `${failed} registration${failed === 1 ? "" : "s"} could not be approved.`,
        );
      }
    } finally {
      setBulkBusy(false);
    }
  }

  function requestBulkReject() {
    if (selectedRegistrations.length === 0) {
      setActionError("Select at least one registration to reject.");
      return;
    }
    setBulkRejectCount(selectedRegistrations.length);
  }

  async function executeBulkReject(reason: string) {
    const targets = selectedRegistrations;
    if (targets.length === 0) {
      setBulkRejectCount(null);
      setActionError("Select at least one registration to reject.");
      return;
    }

    setBulkRejectCount(null);
    setBulkBusy(true);
    setActionError(null);
    setSuccessMessage(null);

    let rejected = 0;
    let failed = 0;

    try {
      for (const registration of targets) {
        try {
          await registrationApi.rejectRegistration(registration.id, reason);
          rejected += 1;
        } catch {
          failed += 1;
        }
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.pendingRegistrations(),
      });
      setSelectedIds(new Set());
      setSuccessMessage(
        `Reject finished: ${rejected} rejected${failed > 0 ? `, ${failed} failed` : ""}.`,
      );
      if (failed > 0) {
        setActionError(
          `${failed} registration${failed === 1 ? "" : "s"} could not be rejected.`,
        );
      }
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleApprove(registration: PendingRegistration) {
    setActionError(null);
    setSuccessMessage(null);

    try {
      const result = await approveRegistration.mutateAsync(registration.id);
      setSelectedRegistration(null);
      setSuccessMessage(
        result.message ||
          (result.isActivated
            ? `${registration.fullName} was approved. They must set a password on first login.`
            : `${registration.fullName}: approval recorded. Awaiting activation.`),
      );
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to approve registration.");
      throw caught;
    }
  }

  function requestReject(registration: PendingRegistration) {
    setDetailsRegistration(null);
    setRejectRegistrationTarget(registration);
  }

  async function executeReject(
    registration: PendingRegistration,
    reason: string,
  ) {
    setActionError(null);
    setSuccessMessage(null);
    try {
      await rejectRegistration.mutateAsync({
        userId: registration.id,
        reason,
      });
      setRejectRegistrationTarget(null);
      setSuccessMessage(`${registration.fullName} was rejected.`);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to reject registration.");
      throw caught;
    }
  }

  function schoolLabel(registration: PendingRegistration): string {
    if (registration.schoolId == null) {
      return "No school";
    }
    return schoolNameById.get(registration.schoolId) ?? "Unknown school";
  }

  function campusLabel(registration: PendingRegistration): string | null {
    if (registration.campusId == null) {
      return null;
    }
    return campusNameById.get(registration.campusId) ?? "Unknown campus";
  }

  function applyFilters() {
    setRoleFilter(roleDraft);
    setSchoolFilter(showSchoolFilter ? schoolDraft : "");
    setCampusFilter(showCampusFilter ? campusDraft : "");
    setDateFilter(dateDraft);
    setSelectedIds(new Set());
  }

  function clearFilters() {
    setRoleDraft("");
    setSchoolDraft("");
    setCampusDraft("");
    setDateDraft("");
    setRoleFilter("");
    setSchoolFilter("");
    setCampusFilter("");
    setDateFilter("");
    setSelectedIds(new Set());
  }

  const hasActiveFilters =
    roleFilter !== "" ||
    (showSchoolFilter && schoolFilter !== "") ||
    (showCampusFilter && campusFilter !== "") ||
    dateFilter !== "";

  const hasDraftChanges =
    roleDraft !== roleFilter ||
    (showSchoolFilter && schoolDraft !== schoolFilter) ||
    (showCampusFilter && campusDraft !== campusFilter) ||
    dateDraft !== dateFilter;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-10 sm:px-6">
      <PageHeader
        title="Registration approvals"
        description={
          isPortalAdmin
            ? "Portal Admin can approve and activate any request, including students without a school. School/Campus Admin can also activate students in their own school or campus."
            : isSchoolAdmin
              ? "School Admin view: approve to activate students (and teachers) for your school. Students without a school are handled by Portal Admin."
              : "Campus Admin view: approve to activate students (and teachers) for your campus."
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

      <DirectoryFilterPanel>
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <select
            value={roleDraft}
            onChange={(event) =>
              setRoleDraft(event.target.value as RegistrationRoleFilter)
            }
            className={cn(directorySelectClassName, "lg:w-40")}
            aria-label="Filter by role"
          >
            {ROLE_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {showSchoolFilter ? (
            <select
              value={schoolDraft}
              onChange={(event) => {
                setSchoolDraft(event.target.value);
                setCampusDraft("");
              }}
              className={cn(directorySelectClassName, "lg:w-48")}
              aria-label="Filter by school"
            >
              <option value="">All schools</option>
              <option value="__none__">No school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          ) : null}

          {showCampusFilter ? (
            <select
              value={campusDraft}
              onChange={(event) => setCampusDraft(event.target.value)}
              disabled={draftSchoolId == null}
              className={cn(directorySelectClassName, "lg:w-48")}
              aria-label="Filter by campus"
            >
              <option value="">All campuses</option>
              {filterCampuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          ) : null}

          <input
            type="date"
            value={dateDraft}
            onChange={(event) => setDateDraft(event.target.value)}
            className={cn(FORM_FIELD_CLASS, "h-11 lg:w-44")}
            aria-label="Filter by created date"
          />

          <Button
            type="button"
            className="h-11 shrink-0 sm:h-10"
            onClick={applyFilters}
          >
            Search
          </Button>

          {hasActiveFilters || hasDraftChanges ? (
            <button
              type="button"
              onClick={clearFilters}
              className="h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </DirectoryFilterPanel>

      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {error || actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError ?? error?.message}
        </div>
      ) : null}

      <DirectoryBulkBar count={selectedIds.size}>
        <Button
          type="button"
          size="sm"
          disabled={isSubmitting || selectedIds.size === 0}
          onClick={requestBulkApprove}
        >
          Approve
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isSubmitting || selectedIds.size === 0}
          onClick={requestBulkReject}
        >
          Reject
        </Button>
      </DirectoryBulkBar>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading pending registrations...
          </div>
        ) : registrations.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No pending registration requests right now.
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No registrations match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={allSelectableSelected}
                      onChange={toggleSelectAll}
                      disabled={selectableIds.length === 0 || isSubmitting}
                      aria-label="Select all registrations on this page"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Email / Mobile
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
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRegistrations.map((registration) => {
                  const createdDisplay =
                    registration.createdDate ?? registration.requestedAt;
                  const campus = campusLabel(registration);

                  return (
                    <tr key={registration.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(registration.id)}
                          disabled={isSubmitting}
                          onChange={() => toggleSelect(registration.id)}
                          aria-label={`Select ${registration.fullName}`}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-40"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <button
                          type="button"
                          onClick={() => setDetailsRegistration(registration)}
                          className="group text-left"
                        >
                          <div className="transition group-hover:text-brand-700 group-hover:underline">
                            {registration.fullName}
                          </div>
                          <div className="text-xs font-normal text-slate-500">
                            {registration.username}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{contactEmail(registration)}</div>
                        <div className="text-xs font-normal text-slate-500">
                          {contactMobile(registration)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            registrationRoleBadgeClass(registration.role),
                          )}
                        >
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
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {formatRequestedAt(createdDisplay)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DirectoryIconAction
                            icon={Eye}
                            label={`View details for ${registration.fullName}`}
                            disabled={isSubmitting}
                            onClick={() =>
                              setDetailsRegistration(registration)
                            }
                          />
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

      {detailsRegistration ? (
        <RegistrationDetailsDialog
          registration={detailsRegistration}
          schoolName={schoolLabel(detailsRegistration)}
          campusName={campusLabel(detailsRegistration)}
          canApprove={isRegistrationActionRole(detailsRegistration.role)}
          isSubmitting={isSubmitting}
          onClose={() => setDetailsRegistration(null)}
          onApprove={() => {
            const registration = detailsRegistration;
            setDetailsRegistration(null);
            setSelectedRegistration(registration);
          }}
          onReject={() => requestReject(detailsRegistration)}
        />
      ) : null}

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

      {rejectRegistrationTarget ? (
        <RejectRegistrationDialog
          registration={rejectRegistrationTarget}
          schoolName={schoolLabel(rejectRegistrationTarget)}
          campusName={campusLabel(rejectRegistrationTarget)}
          isSubmitting={rejectRegistration.isPending}
          onClose={() => setRejectRegistrationTarget(null)}
          onConfirm={executeReject}
        />
      ) : null}

      <AppConfirmDialog
        open={confirmIntent != null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setConfirmIntent(null);
          }
        }}
        title="Approve registrations"
        description={
          confirmIntent
            ? `Approve ${confirmIntent.count} registration${confirmIntent.count === 1 ? "" : "s"}? Approving does not set a password — users set their own on first login.`
            : ""
        }
        confirmLabel="Approve"
        loading={isSubmitting}
        onConfirm={() => {
          void executeBulkApprove();
        }}
      />

      <BulkRejectRegistrationsDialog
        open={bulkRejectCount != null}
        count={bulkRejectCount ?? 0}
        isSubmitting={isSubmitting}
        onClose={() => setBulkRejectCount(null)}
        onConfirm={(reason) => {
          void executeBulkReject(reason);
        }}
      />
    </div>
  );
}
