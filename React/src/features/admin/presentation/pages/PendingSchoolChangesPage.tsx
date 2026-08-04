import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { getRoleLabel, type UserRole } from "@/core/api/types";
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
import * as schoolChangeApi from "@/features/admin/data/schoolChangeApi";
import type { PendingSchoolChangeItem } from "@/features/admin/data/schoolChangeApi";
import { ApproveSchoolChangeDialog } from "@/features/admin/presentation/components/ApproveSchoolChangeDialog";
import { BulkRejectSchoolChangesDialog } from "@/features/admin/presentation/components/BulkRejectSchoolChangesDialog";
import { RejectSchoolChangeDialog } from "@/features/admin/presentation/components/RejectSchoolChangeDialog";
import { SchoolChangeDetailsDialog } from "@/features/admin/presentation/components/SchoolChangeDetailsDialog";

type SchoolChangeRoleFilter = "" | "Student" | "Teacher" | "CampusAdmin";

type ConfirmIntent = { kind: "bulk-approve"; count: number };

const SCHOOL_CHANGES_QUERY_KEY = ["admin", "school-changes", "pending"] as const;

const ROLE_FILTER_OPTIONS: {
  value: SchoolChangeRoleFilter;
  label: string;
}[] = [
  { value: "", label: "All roles" },
  { value: "Student", label: "Student" },
  { value: "Teacher", label: "Teacher" },
  { value: "CampusAdmin", label: "Campus Admin" },
];

function roleBadgeClass(role: string): string {
  switch (role) {
    case "Student":
      return "border border-primary/25 bg-primary/10 text-primary";
    case "Teacher":
      return "border border-[hsl(var(--ai))]/25 bg-[hsl(var(--ai-light))] text-[hsl(var(--ai))]";
    case "CampusAdmin":
      return "border border-border bg-muted text-foreground";
    default:
      return "border border-border bg-muted text-muted-foreground";
  }
}

function formatRequestedAt(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
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

/** Admin page to approve or reject school/campus change requests (mirrors role requests). */
export function PendingSchoolChangesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: schools = [] } = useDirectorySchoolsQuery();

  const [roleDraft, setRoleDraft] = useState<SchoolChangeRoleFilter>("");
  const [schoolDraft, setSchoolDraft] = useState("");
  const [campusDraft, setCampusDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");

  const [roleFilter, setRoleFilter] = useState<SchoolChangeRoleFilter>("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [campusFilter, setCampusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] =
    useState<PendingSchoolChangeItem | null>(null);
  const [rejectTarget, setRejectTarget] =
    useState<PendingSchoolChangeItem | null>(null);
  const [detailsRequest, setDetailsRequest] =
    useState<PendingSchoolChangeItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent | null>(
    null,
  );
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  const {
    data: requests = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: SCHOOL_CHANGES_QUERY_KEY,
    queryFn: () => schoolChangeApi.listPendingSchoolChanges(100),
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: number) =>
      schoolChangeApi.approveSchoolChange(requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SCHOOL_CHANGES_QUERY_KEY,
      });
      await notificationsApi.markNotificationCategoryRead(
        "SchoolChangeRequest",
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(),
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      requestId,
      leaveWithoutSchool,
    }: {
      requestId: number;
      leaveWithoutSchool: boolean;
    }) => schoolChangeApi.rejectSchoolChange(requestId, leaveWithoutSchool),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SCHOOL_CHANGES_QUERY_KEY,
      });
      await notificationsApi.markNotificationCategoryRead(
        "SchoolChangeRequest",
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(),
      });
    },
  });

  const isSubmitting =
    approveMutation.isPending || rejectMutation.isPending || bulkBusy;

  const isPortalAdmin = user?.role === "PortalAdmin";
  const isSchoolAdmin = user?.role === "SchoolAdmin";
  const roleLabel = isPortalAdmin
    ? "Portal Admin"
    : isSchoolAdmin
      ? "School Admin"
      : "Campus Admin";

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
    for (const request of requests) {
      if (request.fromSchoolId != null) {
        ids.add(request.fromSchoolId);
      }
      if (request.toSchoolId != null) {
        ids.add(request.toSchoolId);
      }
    }
    return [...ids].sort((a, b) => a - b);
  }, [requests]);

  const campusesQuery = useQuery({
    queryKey: [
      "directory",
      "campuses-for-school-changes",
      schoolIdsNeedingCampuses,
    ],
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

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (roleFilter && request.requesterRole !== roleFilter) {
        return false;
      }

      // Destination school / campus filters (where they want to go)
      if (schoolFilter === "__none__") {
        if (request.toSchoolId != null) {
          return false;
        }
      } else if (selectedSchoolId != null) {
        if (request.toSchoolId !== selectedSchoolId) {
          return false;
        }
      }

      if (campusFilter) {
        const campusId = Number(campusFilter);
        if (!Number.isFinite(campusId) || request.toCampusId !== campusId) {
          return false;
        }
      }

      if (dateFilter) {
        const requestedKey = toDateKey(request.requestedAt);
        if (requestedKey !== dateFilter) {
          return false;
        }
      }

      return true;
    });
  }, [
    requests,
    roleFilter,
    schoolFilter,
    selectedSchoolId,
    campusFilter,
    dateFilter,
  ]);

  const selectableIds = useMemo(
    () => filteredRequests.map((request) => request.id),
    [filteredRequests],
  );

  const selectedRequests = useMemo(
    () => filteredRequests.filter((request) => selectedIds.has(request.id)),
    [filteredRequests, selectedIds],
  );

  const selectedStudentCount = useMemo(
    () =>
      selectedRequests.filter((request) => request.requesterRole === "Student")
        .length,
    [selectedRequests],
  );

  const allSelectableSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));

  useEffect(() => {
    const visibleIds = new Set(filteredRequests.map((item) => item.id));
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [filteredRequests]);

  useEffect(() => {
    void notificationsApi
      .markNotificationCategoryRead("SchoolChangeRequest")
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
    setSelectedIds(() => {
      if (allSelectableSelected) {
        return new Set();
      }
      return new Set(selectableIds);
    });
  }

  function requestBulkApprove() {
    if (selectedRequests.length === 0) {
      setActionError("Select at least one school change to approve.");
      return;
    }
    setConfirmIntent({ kind: "bulk-approve", count: selectedRequests.length });
  }

  async function executeBulkApprove() {
    const targets = selectedRequests;
    if (targets.length === 0) {
      setConfirmIntent(null);
      setActionError("Select at least one school change to approve.");
      return;
    }

    setConfirmIntent(null);
    setBulkBusy(true);
    setActionError(null);
    setSuccessMessage(null);

    let approved = 0;
    let applied = 0;
    let failed = 0;

    try {
      for (const request of targets) {
        try {
          const result = await schoolChangeApi.approveSchoolChange(request.id);
          approved += 1;
          if (result.isApplied) {
            applied += 1;
          }
        } catch {
          failed += 1;
        }
      }

      await queryClient.invalidateQueries({
        queryKey: SCHOOL_CHANGES_QUERY_KEY,
      });
      await notificationsApi.markNotificationCategoryRead(
        "SchoolChangeRequest",
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(),
      });
      setSelectedIds(new Set());
      setSuccessMessage(
        `Approve finished: ${approved} approved${applied > 0 ? ` (${applied} applied)` : ""}${failed > 0 ? `, ${failed} failed` : ""}.`,
      );
      if (failed > 0) {
        setActionError(
          `${failed} school change${failed === 1 ? "" : "s"} could not be approved.`,
        );
      }
    } finally {
      setBulkBusy(false);
    }
  }

  function requestBulkReject() {
    if (selectedRequests.length === 0) {
      setActionError("Select at least one school change to reject.");
      return;
    }
    setBulkRejectOpen(true);
  }

  async function executeBulkReject(leaveWithoutSchool: boolean) {
    const targets = selectedRequests;
    if (targets.length === 0) {
      setBulkRejectOpen(false);
      setActionError("Select at least one school change to reject.");
      return;
    }

    setBulkRejectOpen(false);
    setBulkBusy(true);
    setActionError(null);
    setSuccessMessage(null);

    let rejected = 0;
    let failed = 0;

    try {
      for (const request of targets) {
        try {
          const leave =
            leaveWithoutSchool && request.requesterRole === "Student";
          await schoolChangeApi.rejectSchoolChange(request.id, leave);
          rejected += 1;
        } catch {
          failed += 1;
        }
      }

      await queryClient.invalidateQueries({
        queryKey: SCHOOL_CHANGES_QUERY_KEY,
      });
      await notificationsApi.markNotificationCategoryRead(
        "SchoolChangeRequest",
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(),
      });
      setSelectedIds(new Set());
      setSuccessMessage(
        `Reject finished: ${rejected} rejected${failed > 0 ? `, ${failed} failed` : ""}.`,
      );
      if (failed > 0) {
        setActionError(
          `${failed} school change${failed === 1 ? "" : "s"} could not be rejected.`,
        );
      }
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleApprove(request: PendingSchoolChangeItem) {
    setActionError(null);
    setSuccessMessage(null);
    try {
      const result = await approveMutation.mutateAsync(request.id);
      setApproveTarget(null);
      setSuccessMessage(
        result.isApplied
          ? `Applied school/campus change for ${request.fullName}.`
          : result.message ||
              `Approval recorded for ${request.fullName}. Waiting on other approvers.`,
      );
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to approve school change.");
      throw caught;
    }
  }

  function requestReject(request: PendingSchoolChangeItem) {
    setDetailsRequest(null);
    setRejectTarget(request);
  }

  async function executeReject(
    request: PendingSchoolChangeItem,
    leaveWithoutSchool: boolean,
  ) {
    setActionError(null);
    setSuccessMessage(null);
    try {
      await rejectMutation.mutateAsync({
        requestId: request.id,
        leaveWithoutSchool,
      });
      setRejectTarget(null);
      setSuccessMessage(
        leaveWithoutSchool
          ? `Rejected school change for ${request.fullName} and left them without a school.`
          : `Rejected school change for ${request.fullName}.`,
      );
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to reject school change.");
      throw caught;
    }
  }

  function schoolName(id: number | null): string {
    if (id == null) {
      return "No school";
    }
    return schoolNameById.get(id) ?? "Unknown school";
  }

  function campusName(id: number | null): string | null {
    if (id == null) {
      return null;
    }
    return campusNameById.get(id) ?? "Unknown campus";
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
        title="School / campus changes"
        description="Approve or reject requests to move to another school or campus. Approving may apply the move when you are authorized; rejecting unlocks the locked role or account."
        backTo="/admin/directory"
        backAriaLabel="Back to directory"
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
              setRoleDraft(event.target.value as SchoolChangeRoleFilter)
            }
            className={cn(directorySelectClassName, "lg:w-40")}
            aria-label="Filter by requester role"
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
              aria-label="Filter by destination school"
            >
              <option value="">All destination schools</option>
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
              aria-label="Filter by destination campus"
            >
              <option value="">All destination campuses</option>
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
            aria-label="Filter by requested date"
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
            Loading pending school / campus changes...
          </div>
        ) : requests.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No pending school / campus changes right now.
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No school / campus changes match the selected filters.
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
                      aria-label="Select all school changes on this page"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    From → To
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRequests.map((request) => {
                  const fromCampus = campusName(request.fromCampusId);
                  const toCampus = campusName(request.toCampusId);

                  return (
                    <tr key={request.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(request.id)}
                          disabled={isSubmitting}
                          onChange={() => toggleSelect(request.id)}
                          aria-label={`Select ${request.fullName}`}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-40"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <button
                          type="button"
                          onClick={() => setDetailsRequest(request)}
                          className="group text-left"
                        >
                          <div className="transition group-hover:text-brand-700 group-hover:underline">
                            {request.fullName}
                          </div>
                          <div className="text-xs font-normal text-slate-500">
                            {request.username}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            roleBadgeClass(request.requesterRole),
                          )}
                        >
                          {getRoleLabel(request.requesterRole as UserRole)}
                        </span>
                      </td>
                      <td className="max-w-[18rem] px-4 py-3 text-slate-700">
                        <div>
                          {schoolName(request.fromSchoolId)}
                          {fromCampus ? (
                            <span className="text-slate-500">
                              {" "}
                              · {fromCampus}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs font-normal text-slate-500">
                          → {schoolName(request.toSchoolId)}
                          {toCampus ? ` · ${toCampus}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {formatRequestedAt(request.requestedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DirectoryIconAction
                            icon={Eye}
                            label={`View details for ${request.fullName}`}
                            disabled={isSubmitting}
                            onClick={() => setDetailsRequest(request)}
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

      {detailsRequest ? (
        <SchoolChangeDetailsDialog
          request={detailsRequest}
          fromSchoolName={schoolName(detailsRequest.fromSchoolId)}
          fromCampusName={campusName(detailsRequest.fromCampusId)}
          toSchoolName={schoolName(detailsRequest.toSchoolId)}
          toCampusName={campusName(detailsRequest.toCampusId)}
          isSubmitting={isSubmitting}
          onClose={() => setDetailsRequest(null)}
          onApprove={() => {
            const request = detailsRequest;
            setDetailsRequest(null);
            setApproveTarget(request);
          }}
          onReject={() => requestReject(detailsRequest)}
        />
      ) : null}

      {approveTarget ? (
        <ApproveSchoolChangeDialog
          request={approveTarget}
          fromSchoolName={schoolName(approveTarget.fromSchoolId)}
          fromCampusName={campusName(approveTarget.fromCampusId)}
          toSchoolName={schoolName(approveTarget.toSchoolId)}
          toCampusName={campusName(approveTarget.toCampusId)}
          isSubmitting={approveMutation.isPending}
          onClose={() => setApproveTarget(null)}
          onConfirm={handleApprove}
        />
      ) : null}

      {rejectTarget ? (
        <RejectSchoolChangeDialog
          request={rejectTarget}
          fromSchoolName={schoolName(rejectTarget.fromSchoolId)}
          fromCampusName={campusName(rejectTarget.fromCampusId)}
          toSchoolName={schoolName(rejectTarget.toSchoolId)}
          toCampusName={campusName(rejectTarget.toCampusId)}
          isSubmitting={rejectMutation.isPending}
          onClose={() => setRejectTarget(null)}
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
        title="Approve school / campus changes"
        description={
          confirmIntent
            ? `Approve ${confirmIntent.count} school / campus change${confirmIntent.count === 1 ? "" : "s"}? The move applies when you are authorized; otherwise your approval is recorded.`
            : ""
        }
        confirmLabel="Approve"
        loading={isSubmitting}
        onConfirm={() => {
          void executeBulkApprove();
        }}
      />

      <BulkRejectSchoolChangesDialog
        open={bulkRejectOpen}
        count={selectedRequests.length}
        studentCount={selectedStudentCount}
        isSubmitting={isSubmitting}
        onClose={() => setBulkRejectOpen(false)}
        onConfirm={(leaveWithoutSchool) => {
          void executeBulkReject(leaveWithoutSchool);
        }}
      />
    </div>
  );
}
