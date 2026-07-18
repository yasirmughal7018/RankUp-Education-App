import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import type {
  DirectoryAccountStatus,
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
import {
  directoryAccountStatusClass,
  directoryAccountStatusLabel,
  normalizeDirectoryAccountStatus,
} from "@/features/directory/presentation/utils/accountStatus";

type DashboardTab = Exclude<DirectorySectionKey, "schoolChanges">;

type SchoolStatusCode = "Active" | "Inactive";
type PreviewStatusCode = DirectoryAccountStatus | SchoolStatusCode;

type PreviewItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  statusCode: PreviewStatusCode;
  statusLabel: string;
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

const SCHOOL_STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "Active", label: "Active" },
  { id: "Inactive", label: "Inactive" },
] as const;

const PEOPLE_STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "Active", label: "Active" },
  { id: "ApprovedInactive", label: "Approved (Inactive)" },
  { id: "PendingApproval", label: "Pending approval" },
  { id: "Locked", label: "Locked" },
  { id: "Deactivated", label: "Deactivated" },
  { id: "Rejected", label: "Rejected" },
] as const;

type StatusFilterId =
  | (typeof SCHOOL_STATUS_FILTERS)[number]["id"]
  | (typeof PEOPLE_STATUS_FILTERS)[number]["id"];

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

function mapSchool(item: DirectorySchool): PreviewItem {
  const statusCode: SchoolStatusCode = item.isActive ? "Active" : "Inactive";
  return {
    id: `school-${item.id}`,
    title: item.name,
    subtitle: item.code,
    meta: "School",
    statusCode,
    statusLabel: statusCode,
    href: "/admin/directory/schools",
  };
}

function mapStudent(item: DirectoryStudent): PreviewItem {
  const statusCode = normalizeDirectoryAccountStatus(
    item.accountStatus,
    item.isActive,
  );
  return {
    id: `student-${item.studentId}`,
    title: item.fullName,
    subtitle: `Roll ${item.rollNumber} · Grade ${item.grade}${item.section}`,
    meta: item.username,
    statusCode,
    statusLabel: directoryAccountStatusLabel(statusCode),
    href: "/admin/directory/students",
  };
}

function mapParent(item: DirectoryParent): PreviewItem {
  const statusCode = normalizeDirectoryAccountStatus(
    item.accountStatus,
    item.isActive,
  );
  return {
    id: `parent-${item.parentId}`,
    title: item.fullName,
    subtitle: `${item.linkedStudentCount} linked child${item.linkedStudentCount === 1 ? "" : "ren"}`,
    meta: item.username,
    statusCode,
    statusLabel: directoryAccountStatusLabel(statusCode),
    href: "/admin/directory/parents",
  };
}

function mapTeacher(item: DirectoryTeacher): PreviewItem {
  const statusCode = normalizeDirectoryAccountStatus(
    item.accountStatus,
    item.isActive,
  );
  return {
    id: `teacher-${item.teacherId}`,
    title: item.fullName,
    subtitle: item.teacherCode,
    meta: item.username,
    statusCode,
    statusLabel: directoryAccountStatusLabel(statusCode),
    href: "/admin/directory/teachers",
  };
}

function mapSchoolAdmin(item: DirectorySchoolAdmin): PreviewItem {
  const statusCode = normalizeDirectoryAccountStatus(
    item.accountStatus,
    item.isActive,
  );
  return {
    id: `school-admin-${item.userId}`,
    title: item.fullName,
    subtitle: item.schoolName,
    meta: item.username,
    statusCode,
    statusLabel: directoryAccountStatusLabel(statusCode),
    href: "/admin/directory/school-admins",
  };
}

function mapCampusAdmin(item: DirectoryCampusAdmin): PreviewItem {
  const statusCode = normalizeDirectoryAccountStatus(
    item.accountStatus,
    item.isActive,
  );
  return {
    id: `campus-admin-${item.userId}`,
    title: item.fullName,
    subtitle: `${item.schoolName} · ${item.campusName}`,
    meta: item.username,
    statusCode,
    statusLabel: directoryAccountStatusLabel(statusCode),
    href: "/admin/directory/campus-admins",
  };
}

export function DirectoryOverviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterId>("all");
  const [selectedItem, setSelectedItem] = useState<PreviewItem | null>(null);
  /** Expanded summary cards show status details; collapsed by default. */
  const [expandedCards, setExpandedCards] = useState<
    Partial<Record<DashboardTab, boolean>>
  >({});

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

    if (statusFilter === "all") {
      return items;
    }
    return items.filter((item) => item.statusCode === statusFilter);
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
    setStatusFilter("all");
    setSearchInput("");
    setSearch("");
    setSelectedItem(null);
  }

  const statusFilters =
    activeTab === "schools" ? SCHOOL_STATUS_FILTERS : PEOPLE_STATUS_FILTERS;

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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        title="School Directory"
        description="A quick overview of schools, people, and admins you can access."
        action={
          showSchoolChanges ? (
            <Link
              to="/admin/directory/school-changes"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4 shrink-0 opacity-90"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M2.75 10a.75.75 0 01.75-.75h10.69l-2.72-2.72a.75.75 0 011.06-1.06l4 4a.75.75 0 010 1.06l-4 4a.75.75 0 11-1.06-1.06l2.72-2.72H3.5A.75.75 0 012.75 10z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="whitespace-nowrap">
                School / campus changes
              </span>
            </Link>
          ) : undefined
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
          <section className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6">
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
              const isExpanded = expandedCards[card.key] === true;

              function toggleExpanded() {
                setExpandedCards((prev) => ({
                  ...prev,
                  [card.key]: !prev[card.key],
                }));
              }

              return (
                <div
                  key={card.key}
                  className="flex h-full min-h-0 w-full flex-col justify-start self-stretch rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md sm:p-3.5"
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab(card.key)}
                    className="w-full rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,3fr)] items-start gap-1.5 sm:gap-2">
                      <div className="min-w-0 pr-0.5 text-left">
                        <p
                          className="text-sm font-semibold leading-snug tracking-tight text-slate-900 sm:text-[0.95rem]"
                          title={card.label}
                        >
                          {card.label}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                          {totalCount}{" "}
                          <span className="font-medium text-slate-400">
                            total
                          </span>
                        </p>
                      </div>
                      <div className="min-w-0 text-right">
                        <p className="text-xl font-semibold tracking-tight text-emerald-700 sm:text-2xl">
                          {activeCount}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                          Active
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={toggleExpanded}
                    aria-expanded={isExpanded}
                    aria-label={
                      isExpanded
                        ? `Hide ${card.label} status details`
                        : `Show ${card.label} status details`
                    }
                    className="mt-3 flex w-full items-center gap-2 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span className="h-px flex-1 bg-slate-200" />
                    <span
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    >
                      <svg
                        viewBox="0 0 20 20"
                        className="h-3.5 w-3.5"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </button>

                  {isExpanded ? (
                    card.kind === "schools" ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
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
                      <ul className="mt-3 space-y-1.5">
                        <StatusRow
                          label="Pending approval"
                          count={people?.pendingApproval ?? 0}
                          tone="warn"
                        />
                        <StatusRow
                          label="Approved (Inactive)"
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
                    )
                  ) : null}
                </div>
              );
            })}
          </section>

          <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    Directory list
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Browse people and schools with the same statuses as above.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openFullList()}
                  className="self-start rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
                >
                  Open full {TAB_META[activeTab].label.toLowerCase()} list
                </button>
              </div>

              <div
                className="mt-5 flex gap-1 overflow-x-auto pb-1"
                role="tablist"
                aria-label="Directory sections"
              >
                {visibleTabs.map((tab) => {
                  const selected = tab === activeTab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveTab(tab)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        selected
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {TAB_META[tab].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 px-4 py-5 sm:px-6">
              <form
                onSubmit={runSearch}
                className="flex flex-col gap-3 sm:flex-row"
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

              <div className="flex flex-wrap items-center gap-2">
                {statusFilters.map((filter) => {
                  const selected = statusFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
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
                  <span className="text-xs text-slate-400">Updating…</span>
                ) : null}
                {!listLoading && !listError ? (
                  <span className="ml-auto text-xs text-slate-400">
                    {previewItems.length} shown
                  </span>
                ) : null}
              </div>

              <div>
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
                      search || statusFilter !== "all"
                        ? "Try a different search or status filter."
                        : "Nothing is available for your role in this section yet."
                    }
                  />
                ) : null}

                {!listLoading && !listError && previewItems.length > 0 ? (
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                    {previewItems.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-900">
                              {item.title}
                            </p>
                            <p className="mt-0.5 truncate text-sm text-slate-500">
                              {item.subtitle}
                              {item.meta ? (
                                <span className="text-slate-400">
                                  {" "}
                                  · {item.meta}
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${directoryAccountStatusClass(
                              item.statusCode,
                            )}`}
                          >
                            {item.statusLabel}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
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
    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white sm:h-28"
        />
      ))}
    </div>
  );
}

function DirectoryListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 last:border-b-0"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-2/5 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-md bg-slate-100" />
        </div>
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
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">Status</dt>
            <dd>
              <span
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${directoryAccountStatusClass(
                  item.statusCode,
                )}`}
              >
                {item.statusLabel}
              </span>
            </dd>
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
