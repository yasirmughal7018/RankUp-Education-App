import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APPROVAL_STATUS_CHIP } from "@/lib/constants/approval-status";
import type {
  DirectoryAccountAuditFields,
  DirectoryAccountStatus,
  DirectoryApprovalHistoryItem,
  DirectoryCampus,
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
  useDirectoryCampusesQuery,
  useDirectoryParentsQuery,
  useDirectorySchoolAdminsQuery,
  useDirectorySchoolsQuery,
  useDirectoryStudentsQuery,
  useDirectorySummaryQuery,
  useDirectoryTeachersQuery,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
import { resolvePublicUrl } from "@/features/authentication/domain/avatarUrl";
import {
  directoryAccountStatusClass,
  directoryAccountStatusLabel,
  directoryReadyStatusClass,
  normalizeDirectoryAccountStatus,
} from "@/features/directory/presentation/utils/accountStatus";

type DashboardTab = Exclude<DirectorySectionKey, "schoolChanges">;

type SchoolStatusCode = "Active" | "Inactive";
type PreviewStatusCode = DirectoryAccountStatus | SchoolStatusCode;

type PreviewStat = {
  label: string;
  value: string | number;
};

type PreviewDetail = {
  label: string;
  value: string;
};

type PreviewItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  /** Present only for school tiles — drives campus inspect flow. */
  schoolId?: number;
  /** Shown for people tiles (not schools). */
  username?: string;
  /** Compact stats row under subtitle (campuses / teachers / students). */
  stats?: PreviewStat[];
  /** Full property list shown in the detail popup body. */
  details: PreviewDetail[];
  approvalHistory?: DirectoryApprovalHistoryItem[];
  /** Shown on the right of active tiles and popup header. */
  lastLoginAt?: string | null;
  avatarUrl?: string | null;
  statusCode: PreviewStatusCode;
  statusLabel: string;
  href: string;
};

type SchoolInspectState = {
  school: DirectorySchool;
  /** Set after auto-pick (1 campus) or user choice (multiple). */
  campusId: number | null;
};

function detailField(
  label: string,
  value: string | number | null | undefined,
): PreviewDetail | null {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  if (!text || text === "—") {
    return null;
  }
  return { label, value: text };
}

/** Always include the row; empty values show as em dash. */
function detailOrDash(
  label: string,
  value: string | number | boolean | null | undefined,
): PreviewDetail {
  if (typeof value === "boolean") {
    return { label, value: value ? "Yes" : "No" };
  }
  if (value == null) {
    return { label, value: "—" };
  }
  const text = String(value).trim();
  return { label, value: text || "—" };
}

function buildDetails(
  fields: Array<PreviewDetail | null | undefined>,
): PreviewDetail[] {
  return fields.filter((field): field is PreviewDetail => field != null);
}

function formatDateTime(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function formatDateOnly(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  // API DateOnly often arrives as YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return formatDateTime(value);
}

function auditDetailFields(item: DirectoryAccountAuditFields): PreviewDetail[] {
  return [
    detailOrDash("Created date", formatDateOnly(item.createdDate)),
    detailOrDash("Requested at", formatDateTime(item.requestedAt)),
    detailOrDash("Rejected at", formatDateTime(item.rejectedAt)),
    detailOrDash("Reason", item.reasonMessage),
  ];
}

function formatLastLoginParts(value?: string | null): {
  date: string;
  time: string | null;
  title: string;
} {
  if (!value) {
    return { date: "—", time: null, title: "—" };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: value, time: null, title: value };
  }
  const date = parsed.toLocaleDateString();
  const time = parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time, title: `${date} ${time}` };
}

function LastLoginAside({ value }: { value?: string | null }) {
  const { date, time, title } = formatLastLoginParts(value);
  return (
    <div className="shrink-0 self-start text-right">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Last login
      </p>
      <div
        className="mt-0.5 max-w-[7.5rem] text-xs font-medium leading-snug text-slate-600"
        title={title}
      >
        <p>{date}</p>
        {time ? <p className="text-slate-500">{time}</p> : null}
      </div>
    </div>
  );
}

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "??";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

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

/** Overview list shows Active/ready records only (not pending/locked/etc.). */
const OVERVIEW_LIST_LIMIT = 8;

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
  const campusCount = item.campusCount ?? 0;
  return {
    id: `school-${item.id}`,
    schoolId: item.id,
    title: item.name,
    subtitle: item.code,
    meta: `${campusCount} campus${campusCount === 1 ? "" : "es"}`,
    stats: [{ label: "Campuses", value: campusCount }],
    details: buildDetails([
      detailField("School code", item.code),
      detailField("Campuses", campusCount),
      detailField("Status", statusCode),
    ]),
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
  const teachers =
    item.teacherNames?.filter((name) => name.trim().length > 0) ?? [];
  const teacherLabel =
    teachers.length === 0 ? "—" : teachers.join(", ");
  return {
    id: `student-${item.studentId}`,
    title: item.fullName,
    subtitle: `${item.schoolName || "—"} | ${item.campusName || "—"}`,
    meta: teacherLabel === "—" ? "No teacher linked" : teacherLabel,
    username: item.username,
    stats: [{ label: "Teacher", value: teacherLabel }],
    details: [
      detailOrDash("Roll number", item.rollNumber),
      detailOrDash("Grade", item.grade),
      detailOrDash("Section", item.section),
      detailOrDash("Mobile", item.mobileNumber),
      detailOrDash("CNIC", item.cnic),
      detailOrDash("Email", item.emailAddress),
      ...auditDetailFields(item),
      detailOrDash("Status", directoryAccountStatusLabel(statusCode)),
    ],
    approvalHistory: item.approvalHistory ?? [],
    lastLoginAt: item.lastLoginAt,
    avatarUrl: item.avatarUrl,
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
  const linkedNames =
    item.linkedStudentNames?.filter((name) => name.trim().length > 0) ?? [];
  return {
    id: `parent-${item.parentId}`,
    title: item.fullName,
    subtitle: `${item.linkedStudentCount} linked child${item.linkedStudentCount === 1 ? "" : "ren"}`,
    meta: item.username,
    username: item.username,
    stats: [{ label: "Children", value: item.linkedStudentCount }],
    details: [
      detailOrDash("Username", item.username ? `@${item.username}` : null),
      detailOrDash("Linked children", item.linkedStudentCount),
      detailOrDash(
        "Linked students",
        linkedNames.length > 0 ? linkedNames.join(", ") : null,
      ),
      detailOrDash("Mobile", item.mobileNumber),
      detailOrDash("CNIC", item.cnic),
      detailOrDash("Email", item.emailAddress),
      ...auditDetailFields(item),
      detailOrDash("Status", directoryAccountStatusLabel(statusCode)),
    ],
    approvalHistory: item.approvalHistory ?? [],
    lastLoginAt: item.lastLoginAt,
    avatarUrl: item.avatarUrl,
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
    subtitle: `${item.schoolName || "—"} | ${item.campusName || "—"}`,
    meta: `${item.studentCount} student${item.studentCount === 1 ? "" : "s"}`,
    username: item.username,
    stats: [{ label: "Students", value: item.studentCount ?? 0 }],
    details: [
      detailOrDash("Teacher code", item.teacherCode),
      detailOrDash("Mobile", item.mobileNumber),
      detailOrDash("CNIC", item.cnic),
      detailOrDash("Email", item.emailAddress),
      ...auditDetailFields(item),
      detailOrDash("Status", directoryAccountStatusLabel(statusCode)),
    ],
    approvalHistory: item.approvalHistory ?? [],
    lastLoginAt: item.lastLoginAt,
    avatarUrl: item.avatarUrl,
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
    username: item.username,
    stats: [
      { label: "Campuses", value: item.activeCampusCount ?? 0 },
      { label: "Teachers", value: item.activeTeacherCount ?? 0 },
      { label: "Students", value: item.activeStudentCount ?? 0 },
    ],
    details: [
      detailOrDash("Mobile", item.mobileNumber),
      detailOrDash("CNIC", item.cnic),
      detailOrDash("Email", item.emailAddress),
      ...auditDetailFields(item),
      detailOrDash("Status", directoryAccountStatusLabel(statusCode)),
    ],
    approvalHistory: item.approvalHistory ?? [],
    lastLoginAt: item.lastLoginAt,
    avatarUrl: item.avatarUrl,
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
    username: item.username,
    stats: [
      { label: "Teachers", value: item.activeTeacherCount ?? 0 },
      { label: "Students", value: item.activeStudentCount ?? 0 },
    ],
    details: [
      detailOrDash("Mobile", item.mobileNumber),
      detailOrDash("CNIC", item.cnic),
      detailOrDash("Email", item.emailAddress),
      ...auditDetailFields(item),
      detailOrDash("Status", directoryAccountStatusLabel(statusCode)),
    ],
    approvalHistory: item.approvalHistory ?? [],
    lastLoginAt: item.lastLoginAt,
    avatarUrl: item.avatarUrl,
    statusCode,
    statusLabel: directoryAccountStatusLabel(statusCode),
    href: "/admin/directory/campus-admins",
  };
}

/** Directory dashboard: summary cards, searchable tabs, and record preview drawer. */
export function DirectoryOverviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<PreviewItem | null>(null);
  /** School-tile flow: load campuses, pick one if multiple, then show details. */
  const [schoolInspect, setSchoolInspect] = useState<SchoolInspectState | null>(
    null,
  );
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
      // Over-fetch so Active-only filter still fills the overview list.
      pageSize: 40,
    }),
    [search],
  );

  const schoolsQuery = useDirectorySchoolsQuery(activeTab === "schools");
  const schoolCampusesQuery = useDirectoryCampusesQuery(
    schoolInspect?.school.id ?? 0,
    schoolInspect != null,
  );
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

    return items
      .filter((item) => item.statusCode === "Active")
      .slice(0, OVERVIEW_LIST_LIMIT);
  }, [
    activeTab,
    campusAdminsQuery.data?.items,
    parentsQuery.data?.items,
    schoolAdminsQuery.data?.items,
    schoolsQuery.data,
    search,
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
    setSearchInput("");
    setSearch("");
    setSelectedItem(null);
    setSchoolInspect(null);
  }

  function openSchoolInspect(school: DirectorySchool) {
    setSelectedItem(null);
    setSchoolInspect({ school, campusId: null });
  }

  function closeSchoolInspect() {
    setSchoolInspect(null);
  }

  // One campus → open school + campus details immediately.
  useEffect(() => {
    if (!schoolInspect || schoolInspect.campusId != null) {
      return;
    }
    if (!schoolCampusesQuery.isSuccess) {
      return;
    }
    const campuses = schoolCampusesQuery.data ?? [];
    if (campuses.length === 1) {
      setSchoolInspect({
        school: schoolInspect.school,
        campusId: campuses[0].id,
      });
    }
  }, [
    schoolCampusesQuery.data,
    schoolCampusesQuery.isSuccess,
    schoolInspect,
  ]);

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
    <div className="space-y-6">
      <AppPageHeader
        title="School Directory"
        subtitle="Browse schools and people in your authorized scope. Counts and lists stay filtered by the API."
        action={
          showSchoolChanges ? (
            <Button asChild className="w-full sm:w-auto">
              <Link to="/admin/directory/school-changes">
                School / campus changes
              </Link>
            </Button>
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
          <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
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
              const isSelected = card.key === activeTab;

              function toggleExpanded() {
                setExpandedCards((prev) => ({
                  ...prev,
                  [card.key]: !prev[card.key],
                }));
              }

              return (
                <article
                  key={card.key}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.04)] transition-all duration-200",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border/80 hover:border-primary/35 hover:shadow-[0_8px_24px_rgba(37,99,235,0.1)]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab(card.key)}
                    aria-pressed={isSelected}
                    className="flex min-h-[7.5rem] flex-1 flex-col items-center justify-start p-4 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <p
                      className={cn(
                        "w-full text-sm font-semibold leading-snug",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                    >
                      {card.label}
                    </p>

                    <div className="mt-4 w-full space-y-2 text-sm">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate whitespace-nowrap text-muted-foreground">
                          Active
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-[hsl(var(--success))]">
                          {activeCount}
                        </span>
                      </div>
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate whitespace-nowrap text-muted-foreground">
                          Total
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-foreground">
                          {totalCount}
                        </span>
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
                    className="flex min-h-10 items-center justify-center gap-1.5 border-t border-border/70 bg-muted/40 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span>{isExpanded ? "Hide details" : "Details"}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-border/70 bg-muted/20 p-3">
                      {card.kind === "schools" ? (
                        <ul className="space-y-1.5">
                          <StatusRow
                            label="Active"
                            count={schools?.active ?? 0}
                            tone="active"
                          />
                          <StatusRow
                            label="Inactive"
                            count={schools?.inactive ?? 0}
                            tone="muted"
                          />
                        </ul>
                      ) : (
                        <ul className="space-y-1.5">
                          <StatusRow
                            label="Pending"
                            count={people?.pendingApproval ?? 0}
                            tone="warn"
                          />
                          <StatusRow
                            label="Approved"
                            count={people?.needsPasswordSetup ?? 0}
                            tone="info"
                          />
                          <StatusRow
                            label="Locked"
                            count={people?.locked ?? 0}
                            tone="locked"
                          />
                          <StatusRow
                            label="Inactive"
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
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="space-y-4 px-4 py-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <form
                  onSubmit={runSearch}
                  className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={TAB_META[activeTab].searchPlaceholder}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Search
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => openFullList()}
                  className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
                >
                  Open full list
                </button>
              </div>

              {listFetching && !listLoading ? (
                <p className="text-xs text-slate-400">Updating…</p>
              ) : null}

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
                    title={`No active ${TAB_META[activeTab].label.toLowerCase()} found`}
                    description={
                      search
                        ? "Try a different search, or open the full list for other statuses."
                        : "No active records for your role in this section yet. Open the full list to manage pending or inactive accounts."
                    }
                  />
                ) : null}

                {!listLoading && !listError && previewItems.length > 0 ? (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {previewItems.map((item) => (
                      <li key={item.id}>
                        <DirectoryPreviewTile
                          item={item}
                          onSelect={() => {
                            if (item.schoolId != null) {
                              const school = (schoolsQuery.data ?? []).find(
                                (row) => row.id === item.schoolId,
                              );
                              if (school) {
                                openSchoolInspect(school);
                                return;
                              }
                            }
                            setSchoolInspect(null);
                            setSelectedItem(item);
                          }}
                        />
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
        />
      ) : null}

      {schoolInspect ? (
        <SchoolInspectSheet
          school={schoolInspect.school}
          campusId={schoolInspect.campusId}
          campuses={schoolCampusesQuery.data ?? []}
          isLoading={schoolCampusesQuery.isLoading}
          error={
            schoolCampusesQuery.error instanceof Error
              ? schoolCampusesQuery.error.message
              : schoolCampusesQuery.error
                ? "Could not load campuses."
                : null
          }
          onClose={closeSchoolInspect}
          onSelectCampus={(campusId) =>
            setSchoolInspect({
              school: schoolInspect.school,
              campusId,
            })
          }
          onChangeCampus={() =>
            setSchoolInspect({
              school: schoolInspect.school,
              campusId: null,
            })
          }
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
  const toneToStatus = {
    active: "active",
    warn: "pending",
    info: "approved",
    locked: "locked",
    muted: "deactivated",
    danger: "rejected",
  } as const;

  return (
    <li
      className={cn(
        "flex min-w-0 items-center justify-between gap-2 rounded-xl border px-2.5 py-2",
        APPROVAL_STATUS_CHIP[toneToStatus[tone]],
      )}
    >
      <span className="min-w-0 truncate whitespace-nowrap text-xs font-medium leading-none">
        {label}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums leading-none">
        {count}
      </span>
    </li>
  );
}

function DirectoryLoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[9.5rem] animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </div>
  );
}

function DirectoryPreviewTile({
  item,
  onSelect,
}: {
  item: PreviewItem;
  onSelect: () => void;
}) {
  const initials = initialsFromName(item.title);
  const imageUrl = resolvePublicUrl(item.avatarUrl);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex h-full w-full items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      <span className="relative inline-flex h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-100 to-brand-200 ring-2 ring-white shadow-sm">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold tracking-wide text-brand-800">
            {initials}
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
          {item.title}
        </p>
        {item.username ? (
          <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
            @{item.username}
          </p>
        ) : null}
        <p className="mt-0.5 truncate text-sm text-slate-500">{item.subtitle}</p>
        {item.stats && item.stats.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {item.stats.map((stat) => (
              <p
                key={stat.label}
                className="text-xs text-slate-500"
                title={`${stat.label}: ${stat.value}`}
              >
                <span className="font-medium text-slate-700">{stat.value}</span>{" "}
                <span className="text-slate-400">{stat.label}</span>
              </p>
            ))}
          </div>
        ) : item.meta ? (
          <p className="mt-1.5 truncate text-xs text-slate-400">{item.meta}</p>
        ) : null}
      </div>

      {item.schoolId == null ? (
        <LastLoginAside value={item.lastLoginAt} />
      ) : null}
    </button>
  );
}

function DirectoryListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-[88px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
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
}: {
  item: PreviewItem;
  onClose: () => void;
}) {
  const initials = initialsFromName(item.title);
  const imageUrl = resolvePublicUrl(item.avatarUrl);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="directory-detail-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-semibold text-slate-900">Details</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {/* Header mirrors the active tile layout */}
          <div className="flex items-center gap-3.5">
            <span className="relative inline-flex h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-100 to-brand-200 ring-2 ring-white shadow-sm">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-bold tracking-wide text-brand-800">
                  {initials}
                </span>
              )}
            </span>

            <div className="min-w-0 flex-1">
              <h2
                id="directory-detail-title"
                className="truncate text-[15px] font-semibold tracking-tight text-slate-900"
              >
                {item.title}
              </h2>
              {item.username ? (
                <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
                  @{item.username}
                </p>
              ) : null}
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {item.subtitle}
              </p>
              {item.stats && item.stats.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {item.stats.map((stat) => (
                    <p
                      key={stat.label}
                      className="text-xs text-slate-500"
                      title={`${stat.label}: ${stat.value}`}
                    >
                      <span className="font-medium text-slate-700">
                        {stat.value}
                      </span>{" "}
                      <span className="text-slate-400">{stat.label}</span>
                    </p>
                  ))}
                </div>
              ) : item.meta ? (
                <p className="mt-1.5 truncate text-xs text-slate-400">
                  {item.meta}
                </p>
              ) : null}
            </div>

            {item.schoolId == null ? (
              <LastLoginAside value={item.lastLoginAt} />
            ) : null}
          </div>

          <div className="mt-5">
            <DetailRows details={item.details} />
          </div>

          {item.schoolId == null ? (
            <ApprovalHistorySection history={item.approvalHistory ?? []} />
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function resolveStatusStyleCode(
  value: string,
): DirectoryAccountStatus | SchoolStatusCode | null {
  if (
    value === "Active" ||
    value === "Inactive" ||
    value === "ApprovedInactive" ||
    value === "PendingApproval" ||
    value === "Locked" ||
    value === "Deactivated" ||
    value === "Rejected"
  ) {
    return value;
  }
  switch (value) {
    case "Approved (Inactive)":
    case "Approved":
      return "ApprovedInactive";
    case "Pending approval":
    case "Pending":
      return "PendingApproval";
    default:
      return null;
  }
}

function DetailRows({ details }: { details: PreviewDetail[] }) {
  return (
    <dl className="space-y-2 text-sm">
      {details.map((detail) => {
        const statusCode = resolveStatusStyleCode(detail.value);
        return (
          <div
            key={detail.label}
            className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 px-3.5 py-3"
          >
            <dt className="shrink-0 text-muted-foreground">{detail.label}</dt>
            <dd className="max-w-[65%] text-right break-words">
              {statusCode ? (
                <span
                  className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold ${directoryAccountStatusClass(
                    statusCode,
                  )}`}
                >
                  {detail.value === "Approved" ||
                  detail.value === "Approved (Inactive)"
                    ? "Approved"
                    : detail.value === "Pending approval"
                      ? "Pending"
                      : detail.value === "Deactivated"
                        ? "Inactive"
                        : detail.value}
                </span>
              ) : (
                <span className="font-medium text-foreground">{detail.value}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function ApprovalHistorySection({
  history,
}: {
  history: DirectoryApprovalHistoryItem[];
}) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Approval history
      </h3>
      {history.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-500">
          No approval history recorded (common for admin-provisioned accounts).
        </p>
      ) : (
        <ul className="space-y-2">
          {history.map((entry, index) => {
            const decisionClass =
              entry.decision === "Approved"
                ? APPROVAL_STATUS_CHIP.approved
                : entry.decision === "Rejected"
                  ? APPROVAL_STATUS_CHIP.rejected
                  : APPROVAL_STATUS_CHIP.pending;
            return (
              <li
                key={`${entry.approverUserId}-${entry.decision}-${entry.decidedAt ?? index}`}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {entry.approverName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {entry.approverRole}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(entry.decidedAt) ?? "Awaiting decision"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold ${decisionClass}`}
                  >
                    {entry.decision}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SchoolInspectSheet({
  school,
  campusId,
  campuses,
  isLoading,
  error,
  onClose,
  onSelectCampus,
  onChangeCampus,
}: {
  school: DirectorySchool;
  campusId: number | null;
  campuses: DirectoryCampus[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onSelectCampus: (campusId: number) => void;
  onChangeCampus: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const selectedCampus =
    campusId != null
      ? (campuses.find((campus) => campus.id === campusId) ?? null)
      : campuses.length === 1
        ? campuses[0]
        : null;
  const needsCampusPick =
    !isLoading && !error && campuses.length > 1 && campusId == null;
  const showDetails = !isLoading && !error && !needsCampusPick;

  const schoolInitials = initialsFromName(school.name);
  const schoolStatus: SchoolStatusCode = school.isActive ? "Active" : "Inactive";
  const schoolDetails = buildDetails([
    detailField("School name", school.name),
    detailField("School code", school.code),
    detailField("School status", schoolStatus),
  ]);
  const campusDetails = selectedCampus
    ? buildDetails([
        detailField("Campus name", selectedCampus.name),
        detailField("Address", selectedCampus.address),
        detailField(
          "Campus status",
          selectedCampus.isActive ? "Active" : "Inactive",
        ),
      ])
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close school details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="school-inspect-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-semibold text-slate-900">
            {needsCampusPick ? "Choose campus" : "School details"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-3.5">
            <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-bold tracking-wide text-brand-800 ring-2 ring-white shadow-sm">
              {schoolInitials}
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="school-inspect-title"
                className="truncate text-[15px] font-semibold tracking-tight text-slate-900"
              >
                {school.name}
              </h2>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {school.code}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {school.campusCount ?? campuses.length}
                  </span>{" "}
                  <span className="text-slate-400">Campuses</span>
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {needsCampusPick ? (
            <div className="mt-5">
              <p className="text-sm text-slate-500">
                This school has multiple campuses. Choose one to view full
                school and campus details.
              </p>
              <ul className="mt-3 space-y-2">
                {campuses.map((campus) => (
                  <li key={campus.id}>
                    <button
                      type="button"
                      onClick={() => onSelectCampus(campus.id)}
                      className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {campus.name}
                        </span>
                        {campus.address ? (
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {campus.address}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`inline-flex shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold ${directoryReadyStatusClass(
                          campus.isActive,
                        )}`}
                      >
                        {campus.isActive ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {showDetails ? (
            <div className="mt-5 space-y-5">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  School
                </h3>
                <DetailRows details={schoolDetails} />
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Campus
                  </h3>
                  {selectedCampus && campuses.length > 1 ? (
                    <button
                      type="button"
                      onClick={onChangeCampus}
                      className="text-xs font-medium text-brand-700 hover:text-brand-800"
                    >
                      Change campus
                    </button>
                  ) : null}
                </div>
                {selectedCampus && campusDetails.length > 0 ? (
                  <DetailRows details={campusDetails} />
                ) : (
                  <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-500">
                    This school has no campuses yet.
                  </p>
                )}
              </section>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
