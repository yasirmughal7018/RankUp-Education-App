import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookOpenCheck,
  ClipboardList,
  Eye,
  Monitor,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { Button } from "@/components/ui/button";
import { isAdminRole } from "@/core/api/types";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { useDirectoryStudentsQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";
import { formatStudentLabel } from "@/features/parent/domain/parentTypes";
import { useLinkedStudentsQuery } from "@/features/parent/presentation/hooks/useParentQueries";
import {
  displayStudentName,
  formatMonitorStatus,
  studentAttemptCheckPath,
  attemptReviewActionLabel,
  hasAttemptScoreAccess,
} from "@/features/quizzes/domain/quizMonitorTypes";
import { useAssignmentBoardQuery } from "@/features/quizzes/presentation/hooks/useQuizQueries";
import { formatRosterStudent } from "@/features/teacher/domain/teacherTypes";
import { useTeacherRosterQuery } from "@/features/teacher/presentation/hooks/useTeacherQueries";
import { cn } from "@/lib/utils";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeStatusKey(value: string): string {
  return value.toLowerCase().replace(/[_\s-]/g, "");
}

const summaryRows: Array<{
  key: "total" | "completed" | "inProgress" | "needsReview";
  label: string;
  icon: ComponentType<{ className?: string }>;
  iconClass: string;
  valueClass: string;
}> = [
  {
    key: "total",
    label: "Assignments",
    icon: ClipboardList,
    iconClass: "bg-[hsl(var(--primary-light))] text-primary",
    valueClass: "text-primary",
  },
  {
    key: "completed",
    label: "Completed",
    icon: BookOpenCheck,
    iconClass: "bg-[hsl(var(--success-light))] text-[hsl(var(--success))]",
    valueClass: "text-[hsl(var(--success))]",
  },
  {
    key: "inProgress",
    label: "In progress",
    icon: Users,
    iconClass: "bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))]",
    valueClass: "text-[hsl(var(--warning))]",
  },
  {
    key: "needsReview",
    label: "Needs review",
    icon: Eye,
    iconClass: "bg-[hsl(var(--ai-light))] text-[hsl(var(--ai))]",
    valueClass: "text-[hsl(var(--ai))]",
  },
];

/** Cross-quiz assignment board filtered by the caller's students or children. */
export function AssignmentBoardPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isParent = user?.role === "Parent";
  const isRosterViewer =
    user?.role === "Teacher" || user?.role === "Coordinator";
  const isAdminViewer = user != null && isAdminRole(user.role);
  const queryStudentId = Number(searchParams.get("studentId"));
  const [studentFilter, setStudentFilter] = useState<number | "">(
    queryStudentId > 0 ? queryStudentId : "",
  );
  const [adminUsernameSearch, setAdminUsernameSearch] = useState("");
  const [debouncedAdminSearch, setDebouncedAdminSearch] = useState("");
  const [adminSelectedLabel, setAdminSelectedLabel] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (queryStudentId > 0) {
      setStudentFilter(queryStudentId);
    }
  }, [queryStudentId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedAdminSearch(adminUsernameSearch.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [adminUsernameSearch]);

  const { data: parentLinkedStudents = [] } = useLinkedStudentsQuery(isParent);
  const { data: roster } = useTeacherRosterQuery(isRosterViewer);
  const rosterStudents = roster?.students ?? [];
  const { data: adminStudentsPage, isFetching: adminStudentsFetching } =
    useDirectoryStudentsQuery(
      {
        search: debouncedAdminSearch || undefined,
        pageNumber: 1,
        pageSize: 30,
      },
      isAdminViewer && debouncedAdminSearch.length > 0,
    );
  const adminStudentMatches = adminStudentsPage?.items ?? [];

  const scopedStudents = isParent
    ? parentLinkedStudents.map((student) => ({
        id: student.studentId,
        label: formatStudentLabel(student),
      }))
    : isRosterViewer
      ? rosterStudents.map((student) => ({
          id: student.studentId,
          label: formatRosterStudent(student),
        }))
      : [];
  const allStudentsLabel = isParent
    ? "All linked students"
    : isRosterViewer
      ? "All roster students"
      : "All students";
  const studentId = studentFilter === "" ? null : studentFilter;
  const selectedStudentLabel =
    studentFilter === ""
      ? null
      : isAdminViewer
        ? (adminSelectedLabel ?? `Student ${studentFilter}`)
        : (scopedStudents.find((student) => student.id === studentFilter)
            ?.label ?? `Student ${studentFilter}`);

  function updateStudentFilter(value: number | "", label?: string | null) {
    setStudentFilter(value);
    if (value === "") {
      setAdminSelectedLabel(null);
      setAdminUsernameSearch("");
      setDebouncedAdminSearch("");
      searchParams.delete("studentId");
    } else {
      if (label != null) {
        setAdminSelectedLabel(label);
      }
      searchParams.set("studentId", String(value));
    }
    setSearchParams(searchParams, { replace: true });
  }

  const { data: items = [], isLoading, error, refetch, isFetching } =
    useAssignmentBoardQuery(studentId);

  useEffect(() => {
    if (!isAdminViewer || studentFilter === "" || adminSelectedLabel) {
      return;
    }
    const fromBoard = items.find((item) => item.studentId === studentFilter);
    if (fromBoard?.studentName) {
      setAdminSelectedLabel(fromBoard.studentName);
    }
  }, [isAdminViewer, studentFilter, adminSelectedLabel, items]);

  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let needsReview = 0;
    for (const item of items) {
      const result = normalizeStatusKey(item.resultStatus);
      const monitor = normalizeStatusKey(item.monitorStatus);
      if (result.includes("complete") || result.includes("reviewed")) {
        completed += 1;
      } else if (
        result.includes("inprogress") ||
        monitor.includes("inprogress")
      ) {
        inProgress += 1;
      }
      if (
        !item.isReviewDone &&
        (result.includes("review") ||
          monitor.includes("review") ||
          hasAttemptScoreAccess(item.canScore))
      ) {
        needsReview += 1;
      }
    }
    return {
      total: items.length,
      completed,
      inProgress,
      needsReview,
    };
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <AppPageHeader
            title="Assignment board"
            eyebrow={selectedStudentLabel ?? undefined}
            subtitle="Quiz assignments for your students or children, according to your role."
            backTo="/quizzes"
            backAriaLabel="Back to quizzes"
            className="mb-4 space-y-0 [&_h1]:text-lg sm:[&_h1]:text-xl"
          />

          <div className="mt-8 max-w-md pl-[2.875rem] sm:mt-10 sm:pl-12">
            <label
              htmlFor="assignment-board-student"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Filter by student
            </label>
            {scopedStudents.length > 0 ? (
              <select
                id="assignment-board-student"
                value={studentFilter === "" ? "" : String(studentFilter)}
                onChange={(event) =>
                  updateStudentFilter(
                    event.target.value ? Number(event.target.value) : "",
                  )
                }
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
              >
                <option value="">{allStudentsLabel}</option>
                {scopedStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.label}
                  </option>
                ))}
              </select>
            ) : isAdminViewer ? (
              <div className="space-y-2">
                {studentFilter !== "" ? (
                  <div className="flex items-center gap-2">
                    <p
                      id="assignment-board-student"
                      className="min-w-0 flex-1 truncate rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
                      title={selectedStudentLabel ?? undefined}
                    >
                      {selectedStudentLabel}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => updateStudentFilter("")}
                      aria-label="Clear student filter"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      id="assignment-board-student"
                      type="search"
                      autoComplete="off"
                      value={adminUsernameSearch}
                      onChange={(event) =>
                        setAdminUsernameSearch(event.target.value)
                      }
                      placeholder="Search by username"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
                    />
                    {debouncedAdminSearch.length > 0 ? (
                      <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-sm">
                        {adminStudentsFetching ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            Searching…
                          </p>
                        ) : adminStudentMatches.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            No students match that username.
                          </p>
                        ) : (
                          <ul className="divide-y divide-border/70 py-1">
                            {adminStudentMatches.map((student) => (
                              <li key={student.studentId}>
                                <button
                                  type="button"
                                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition hover:bg-muted/60"
                                  onClick={() =>
                                    updateStudentFilter(
                                      student.studentId,
                                      student.username,
                                    )
                                  }
                                >
                                  <span className="text-sm font-medium text-foreground">
                                    {student.username}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {student.fullName}
                                    {student.grade
                                      ? ` · Grade ${student.grade}${student.section ?? ""}`
                                      : ""}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                Student filter is available for admins, teachers, and parents.
              </p>
            )}
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col items-stretch gap-3 lg:w-72">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm">
            {isLoading ? (
              <AppLoadingSkeleton count={2} />
            ) : (
              <ul className="space-y-2.5">
                {summaryRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <li
                      key={row.key}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            row.iconClass,
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="truncate text-sm text-foreground">
                          {row.label}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "tabular-nums text-sm font-semibold",
                          row.valueClass,
                        )}
                      >
                        {stats[row.key]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {error ? (
        <AppErrorState
          message={error.message}
          onRetry={() => void refetch()}
        />
      ) : null}

      <section className="-mt-1">
        <AppSectionHeader
          title="Assignments"
          description="Open Check or Monitor for a student when an attempt exists."
          className="mb-2 [&_h2]:text-base"
        />

        {isLoading ? (
          <AppLoadingSkeleton variant="table" count={5} />
        ) : items.length === 0 ? (
          <AppEmptyState
            icon={ClipboardList}
            title="No assignments found"
            description="No quiz assignments match this student filter yet."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Quiz
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Window
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Result
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {items.map((item) => {
                    const canScore =
                      hasAttemptScoreAccess(item.canScore) &&
                      !item.isReviewDone;
                    return (
                      <tr
                        key={item.assignmentId}
                        className="hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/quizzes/${item.quizId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {item.quizTitle}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {displayStudentName(item.studentName, item.studentId)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <p className="text-foreground">
                            {formatDateTime(item.startAt)}
                          </p>
                          <p className="text-xs">
                            to {formatDateTime(item.endAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <AppStatusBadge
                              status={item.resultStatus}
                              label={formatMonitorStatus(item.resultStatus)}
                            />
                            {item.isReviewDone ? (
                              <span className="text-xs text-muted-foreground">
                                – Reviewed
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <AppStatusBadge
                            status={item.monitorStatus}
                            label={formatMonitorStatus(item.monitorStatus)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {item.lastAttemptId ? (
                              <Button
                                size="sm"
                                variant={canScore ? "default" : "outline"}
                                className="h-7 gap-1.5 rounded-full px-2.5 text-[11px] font-semibold leading-none"
                                asChild
                              >
                                <Link
                                  to={studentAttemptCheckPath(
                                    item.quizId,
                                    item.lastAttemptId,
                                    "board",
                                  )}
                                >
                                  <Eye className="!size-3.5" aria-hidden />
                                  {attemptReviewActionLabel(
                                    hasAttemptScoreAccess(item.canScore),
                                    item.isReviewDone,
                                  )}
                                </Link>
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1.5 rounded-full px-2.5 text-[11px] font-semibold leading-none"
                              asChild
                            >
                              <Link to={`/quizzes/${item.quizId}/monitoring`}>
                                <Monitor className="!size-3.5" aria-hidden />
                                Monitor
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
