import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import type {
  DirectoryCampusAdmin,
  DirectoryParent,
  DirectorySchool,
  DirectorySchoolAdmin,
  DirectorySchoolStatusCounts,
  DirectorySectionKey,
  DirectoryStatusCounts,
  DirectoryStudent,
  DirectoryTeacher,
} from "@/features/directory/domain/directoryTypes";
import {
  useDirectoryCampusAdminsQuery,
  useDirectoryParentsQuery,
  useDirectorySchoolAdminsQuery,
  useDirectorySchoolsQuery,
  useDirectoryStudentsQuery,
  useDirectorySummaryQuery,
  useDirectoryTeachersQuery,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";

type DashboardTab = Exclude<DirectorySectionKey, "schoolChanges">;

type PreviewItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  status: "Active" | "Inactive";
  href: string;
};

const TAB_META: Record<
  DashboardTab,
  { label: string; href: string; searchPlaceholder: string }
> = {
  schools: {
    label: "Schools",
    href: "/admin/directory/schools",
    searchPlaceholder: "Search schools by name or code…",
  },
  schoolAdmins: {
    label: "School Admins",
    href: "/admin/directory/school-admins",
    searchPlaceholder: "Search school admins…",
  },
  campusAdmins: {
    label: "Campus Admins",
    href: "/admin/directory/campus-admins",
    searchPlaceholder: "Search campus admins…",
  },
  parents: {
    label: "Parents",
    href: "/admin/directory/parents",
    searchPlaceholder: "Search parents by name or username…",
  },
  teachers: {
    label: "Teachers",
    href: "/admin/directory/teachers",
    searchPlaceholder: "Search teachers by name, code, or username…",
  },
  students: {
    label: "Students",
    href: "/admin/directory/students",
    searchPlaceholder: "Search students by name, roll number, or username…",
  },
};

/** Display order for summary cards and tabs. */
const DASHBOARD_TAB_ORDER: DashboardTab[] = [
  "schools",
  "schoolAdmins",
  "campusAdmins",
  "parents",
  "teachers",
  "students",
];

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
] as const;

function isDashboardTab(value: string | null): value is DashboardTab {
  return (
    value === "schools" ||
    value === "students" ||
    value === "parents" ||
    value === "teachers" ||
    value === "schoolAdmins" ||
    value === "campusAdmins"
  );
}

function statusLabel(isActive: boolean): "Active" | "Inactive" {
  return isActive ? "Active" : "Inactive";
}

function mapSchool(item: DirectorySchool): PreviewItem {
  return {
    id: `school-${item.id}`,
    title: item.name,
    subtitle: item.code,
    meta: "School",
    status: statusLabel(item.isActive),
    href: "/admin/directory/schools",
  };
}

function mapStudent(item: DirectoryStudent): PreviewItem {
  return {
    id: `student-${item.studentId}`,
    title: item.fullName,
    subtitle: `Roll ${item.rollNumber} · Grade ${item.grade}${item.section}`,
    meta: `Campus #${item.campusId}`,
    status: statusLabel(item.isActive),
    href: "/admin/directory/students",
  };
}

function mapParent(item: DirectoryParent): PreviewItem {
  return {
    id: `parent-${item.parentId}`,
    title: item.fullName,
    subtitle: `${item.linkedStudentCount} linked child${item.linkedStudentCount === 1 ? "" : "ren"}`,
    meta: item.username,
    status: statusLabel(item.isActive),
    href: "/admin/directory/parents",
  };
}

function mapTeacher(item: DirectoryTeacher): PreviewItem {
  return {
    id: `teacher-${item.teacherId}`,
    title: item.fullName,
    subtitle: item.teacherCode,
    meta: `Campus #${item.campusId}`,
    status: statusLabel(item.isActive),
    href: "/admin/directory/teachers",
  };
}

function mapSchoolAdmin(item: DirectorySchoolAdmin): PreviewItem {
  return {
    id: `school-admin-${item.userId}`,
    title: item.fullName,
    subtitle: item.schoolName,
    meta: "School Admin",
    status: statusLabel(item.isActive),
    href: "/admin/directory/school-admins",
  };
}

function mapCampusAdmin(item: DirectoryCampusAdmin): PreviewItem {
  return {
    id: `campus-admin-${item.userId}`,
    title: item.fullName,
    subtitle: `${item.schoolName} · ${item.campusName}`,
    meta: "Campus Admin",
    status: statusLabel(item.isActive),
    href: "/admin/directory/campus-admins",
  };
}

export function DirectoryOverviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [selectedItem, setSelectedItem] = useState<PreviewItem | null>(null);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useDirectorySummaryQuery();

  const visibleTabs = useMemo(() => {
    const sections = summary?.visibleSections ?? [];
    return DASHBOARD_TAB_ORDER.filter((tab) => sections.includes(tab));
  }, [summary?.visibleSections]);

  const activeTab: DashboardTab = useMemo(() => {
    const fromQuery = searchParams.get("tab");
    if (isDashboardTab(fromQuery) && visibleTabs.includes(fromQuery)) {
      return fromQuery;
    }
    return visibleTabs[0] ?? "schools";
  }, [searchParams, visibleTabs]);

  useEffect(() => {
    if (visibleTabs.length === 0) {
      return;
    }
    if (!visibleTabs.includes(activeTab)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", visibleTabs[0]);
          return next;
        },
        { replace: true },
      );
    }
  }, [activeTab, setSearchParams, visibleTabs]);

  const previewFilters = useMemo(
    () => ({
      search: search || undefined,
      pageNumber: 1,
      pageSize: 8,
    }),
    [search],
  );

  const schoolsQuery = useDirectorySchoolsQuery(activeTab === "schools");
  const studentsQuery = useDirectoryStudentsQuery(
    previewFilters,
    activeTab === "students",
  );
  const parentsQuery = useDirectoryParentsQuery(
    previewFilters,
    activeTab === "parents",
  );
  const teachersQuery = useDirectoryTeachersQuery(
    previewFilters,
    activeTab === "teachers",
  );
  const schoolAdminsQuery = useDirectorySchoolAdminsQuery(
    previewFilters,
    activeTab === "schoolAdmins",
  );
  const campusAdminsQuery = useDirectoryCampusAdminsQuery(
    previewFilters,
    activeTab === "campusAdmins",
  );

  const activeListQuery = (() => {
    switch (activeTab) {
      case "schools":
        return schoolsQuery;
      case "students":
        return studentsQuery;
      case "parents":
        return parentsQuery;
      case "teachers":
        return teachersQuery;
      case "schoolAdmins":
        return schoolAdminsQuery;
      case "campusAdmins":
        return campusAdminsQuery;
    }
  })();

  const previewItems = useMemo(() => {
    let items: PreviewItem[] = [];
    switch (activeTab) {
      case "schools":
        items = (schoolsQuery.data ?? []).map(mapSchool);
        if (search) {
          const q = search.toLowerCase();
          items = items.filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.subtitle.toLowerCase().includes(q),
          );
        }
        break;
      case "students":
        items = (studentsQuery.data?.items ?? []).map(mapStudent);
        break;
      case "parents":
        items = (parentsQuery.data?.items ?? []).map(mapParent);
        break;
      case "teachers":
        items = (teachersQuery.data?.items ?? []).map(mapTeacher);
        break;
      case "schoolAdmins":
        items = (schoolAdminsQuery.data?.items ?? []).map(mapSchoolAdmin);
        break;
      case "campusAdmins":
        items = (campusAdminsQuery.data?.items ?? []).map(mapCampusAdmin);
        break;
    }

    if (statusFilter === "active") {
      return items.filter((item) => item.status === "Active");
    }
    if (statusFilter === "inactive") {
      return items.filter((item) => item.status === "Inactive");
    }
    return items;
  }, [
    activeTab,
    campusAdminsQuery.data?.items,
    parentsQuery.data?.items,
    schoolAdminsQuery.data?.items,
    schoolsQuery.data,
    search,
    statusFilter,
    studentsQuery.data?.items,
    teachersQuery.data?.items,
  ]);

  const summaryCards = useMemo(() => {
    if (!summary) {
      return [];
    }
    const cardByKey: Record<
      DashboardTab,
      {
        key: DashboardTab;
        label: string;
        kind: "schools" | "people";
        schools?: DirectorySchoolStatusCounts;
        people?: DirectoryStatusCounts;
      }
    > = {
      schools: {
        key: "schools",
        label: "Schools",
        kind: "schools",
        schools: summary.schools,
      },
      schoolAdmins: {
        key: "schoolAdmins",
        label: "School Admins",
        kind: "people",
        people: summary.schoolAdmins,
      },
      campusAdmins: {
        key: "campusAdmins",
        label: "Campus Admins",
        kind: "people",
        people: summary.campusAdmins,
      },
      parents: {
        key: "parents",
        label: "Parents",
        kind: "people",
        people: summary.parents,
      },
      teachers: {
        key: "teachers",
        label: "Teachers",
        kind: "people",
        people: summary.teachers,
      },
      students: {
        key: "students",
        label: "Students",
        kind: "people",
        people: summary.students,
      },
    };

    return DASHBOARD_TAB_ORDER.filter((key) =>
      summary.visibleSections.includes(key),
    ).map((key) => cardByKey[key]);
  }, [summary]);

  const showSchoolChanges = summary?.visibleSections.includes("schoolChanges");

  function setActiveTab(tab: DashboardTab) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
    setSelectedItem(null);
  }

  function runSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function openFullList(tab: DashboardTab = activeTab) {
    const href = TAB_META[tab].href;
    const query = searchInput.trim() || search;
    navigate(query ? `${href}?search=${encodeURIComponent(query)}` : href);
  }

  const listLoading =
    activeTab === "schools"
      ? schoolsQuery.isLoading
      : activeListQuery.isLoading;
  const listError =
    activeTab === "schools" ? schoolsQuery.error : activeListQuery.error;
  const listFetching =
    activeTab === "schools"
      ? schoolsQuery.isFetching
      : activeListQuery.isFetching;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="School Directory"
        description="A quick overview of schools, people, and admins you can access."
        action={
          <Link
            to="/admin"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to admin
          </Link>
        }
      />

      {summaryLoading ? <DirectoryLoadingSkeleton /> : null}

      {!summaryLoading && summaryError ? (
        <DirectoryErrorState
          message={
            summaryError instanceof Error
              ? summaryError.message
              : "Could not load directory summary."
          }
          onRetry={() => void refetchSummary()}
        />
      ) : null}

      {!summaryLoading && !summaryError && summary ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => {
              const people = card.people;
              const schools = card.schools;
              const activeCount =
                card.kind === "schools"
                  ? (schools?.active ?? 0)
                  : (people?.active ?? 0);
              const totalCount =
                card.kind === "schools"
                  ? (schools?.total ?? 0)
                  : (people?.total ?? 0);

              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setActiveTab(card.key)}
                  className="flex h-full min-h-0 w-full flex-col justify-start self-stretch rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 sm:min-h-[18rem] sm:p-5"
                >
                  <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,3fr)] items-start gap-2 sm:gap-3">
                    <div className="min-w-0 pr-1 text-left">
                      <p className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl md:text-2xl">
                        {card.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 sm:mt-1.5 sm:text-sm">
                        {totalCount}{" "}
                        <span className="font-medium text-slate-400">total</span>
                      </p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-2xl font-semibold tracking-tight text-emerald-700 sm:text-3xl md:text-4xl">
                        {activeCount}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">
                        Active
                      </p>
                    </div>
                  </div>

                  {card.kind === "schools" ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:gap-3">
                      <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center sm:px-3.5 sm:py-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 sm:text-xs">
                          Active
                        </p>
                        <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-800 sm:text-3xl">
                          {schools?.active ?? 0}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-100 px-3 py-3 text-center sm:px-3.5 sm:py-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:text-xs">
                          Inactive
                        </p>
                        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-700 sm:text-3xl">
                          {schools?.inactive ?? 0}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                      <StatusRow
                        label="Pending registration approval"
                        count={people?.pendingApproval ?? 0}
                        tone="warn"
                      />
                      <StatusRow
                        label="Approved, needs password"
                        count={people?.needsPasswordSetup ?? 0}
                        tone="info"
                      />
                      <StatusRow
                        label="Locked"
                        count={people?.locked ?? 0}
                        tone="locked"
                      />
                      <StatusRow
                        label="Deactivated"
                        count={people?.deactivated ?? 0}
                        tone="muted"
                      />
                      <StatusRow
                        label="Rejected"
                        count={people?.rejected ?? 0}
                        tone="danger"
                      />
                    </ul>
                  )}
                </button>
              );
            })}
          </section>

          {showSchoolChanges ? (
            <div className="mt-4">
              <Link
                to="/admin/directory/school-changes"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
              >
                Review school / campus change requests
              </Link>
            </div>
          ) : null}

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {visibleTabs.map((tab) => {
                  const selected = tab === activeTab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                        selected
                          ? "bg-brand-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {TAB_META[tab].label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => openFullList()}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Open full {TAB_META[activeTab].label.toLowerCase()} list
              </button>
            </div>

            <form
              onSubmit={runSearch}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={TAB_META[activeTab].searchPlaceholder}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
              <button
                type="submit"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Search
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => {
                const selected = statusFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setStatusFilter(filter.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      selected
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
              {listFetching && !listLoading ? (
                <span className="self-center text-xs text-slate-400">
                  Updating…
                </span>
              ) : null}
            </div>

            <div className="mt-5">
              {listLoading ? <DirectoryListSkeleton /> : null}

              {!listLoading && listError ? (
                <DirectoryErrorState
                  message={
                    listError instanceof Error
                      ? listError.message
                      : "Could not load directory records."
                  }
                  onRetry={() => void activeListQuery.refetch()}
                />
              ) : null}

              {!listLoading && !listError && previewItems.length === 0 ? (
                <DirectoryEmptyState
                  title={`No ${TAB_META[activeTab].label.toLowerCase()} found`}
                  description={
                    search
                      ? "Try a different search term, or clear filters."
                      : "Nothing is available for your role in this section yet."
                  }
                />
              ) : null}

              {!listLoading && !listError && previewItems.length > 0 ? (
                <ul className="grid gap-3 md:grid-cols-2">
                  {previewItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-left transition hover:border-brand-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {item.subtitle}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              {item.meta}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.status === "Active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {selectedItem ? (
        <DirectoryDetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onViewFull={() => {
            navigate(selectedItem.href);
            setSelectedItem(null);
          }}
        />
      ) : null}
    </div>
  );
}

function StatusRow({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "active" | "warn" | "info" | "locked" | "muted" | "danger";
}) {
  const toneClass =
    tone === "active"
      ? "bg-emerald-50 text-emerald-800"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900"
        : tone === "info"
          ? "bg-sky-50 text-sky-900"
          : tone === "locked"
            ? "bg-orange-50 text-orange-900"
            : tone === "danger"
              ? "bg-rose-50 text-rose-900"
              : "bg-slate-100 text-slate-700";

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 ${toneClass}`}
    >
      <span className="text-xs font-medium leading-snug">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{count}</span>
    </li>
  );
}

function DirectoryLoadingSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}

function DirectoryListSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
        />
      ))}
    </div>
  );
}

function DirectoryEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function DirectoryErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
      <p className="text-base font-semibold text-rose-800">Something went wrong</p>
      <p className="mt-2 text-sm text-rose-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-800"
      >
        Try again
      </button>
    </div>
  );
}

function DirectoryDetailSheet({
  item,
  onClose,
  onViewFull,
}: {
  item: PreviewItem;
  onClose: () => void;
  onViewFull: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {item.meta}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Details</dt>
            <dd className="text-right font-medium text-slate-800">
              {item.subtitle}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Status</dt>
            <dd className="font-medium text-slate-800">{item.status}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onViewFull}
          className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          View full profile
        </button>
      </div>
    </div>
  );
}
