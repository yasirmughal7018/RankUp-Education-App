import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw, Search, Users } from "lucide-react";
import { StudentGroupsWorkspace } from "@/components/groups/StudentGroupsWorkspace";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildRosterGradeBuckets,
  rosterStudentMatchesQuery,
  type TeacherRosterStudent,
} from "@/features/teacher/domain/teacherTypes";
import {
  useAddMyStudentMutation,
  useAddTeacherGroupMemberMutation,
  useCreateTeacherGroupMutation,
  useDeleteTeacherGroupMutation,
  useRemoveTeacherGroupMemberMutation,
  useTeacherGroupsQuery,
  useTeacherRosterQuery,
  useUpdateTeacherGroupMutation,
} from "@/features/teacher/presentation/hooks/useTeacherQueries";
import { AddStudentDialog } from "@/features/teacher/presentation/components/AddStudentDialog";

type RosterTab = "classes" | "groups";

export function TeacherRosterPage() {
  const rosterQuery = useTeacherRosterQuery(true);
  const groupsQuery = useTeacherGroupsQuery(true);
  const createGroupMutation = useCreateTeacherGroupMutation();
  const updateGroupMutation = useUpdateTeacherGroupMutation();
  const addStudentMutation = useAddMyStudentMutation();
  const deleteGroupMutation = useDeleteTeacherGroupMutation();
  const addMemberMutation = useAddTeacherGroupMemberMutation();
  const removeMemberMutation = useRemoveTeacherGroupMemberMutation();

  const [tab, setTab] = useState<RosterTab>("classes");
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const students = rosterQuery.data?.students ?? [];
  const classSections = rosterQuery.data?.classSections ?? [];
  const groups = groupsQuery.data ?? [];
  const gradeBuckets = useMemo(
    () => buildRosterGradeBuckets(classSections, students),
    [classSections, students],
  );

  useEffect(() => {
    if (gradeBuckets.length === 0) {
      setSelectedGrade(null);
      setSelectedSection(null);
      return;
    }
    const currentGrade =
      gradeBuckets.find((item) => item.grade === selectedGrade) ??
      gradeBuckets[0];
    if (selectedGrade !== currentGrade.grade) {
      setSelectedGrade(currentGrade.grade);
    }
    const sectionStillValid =
      selectedSection != null &&
      currentGrade.sections.some((item) => item.section === selectedSection);
    if (sectionStillValid) {
      return;
    }
    setSelectedSection(
      currentGrade.sections.length === 1
        ? currentGrade.sections[0].section
        : null,
    );
  }, [gradeBuckets, selectedGrade, selectedSection]);

  const selectedGradeBucket = useMemo(
    () => gradeBuckets.find((item) => item.grade === selectedGrade) ?? null,
    [gradeBuckets, selectedGrade],
  );
  const selectedSectionBucket = useMemo(
    () =>
      selectedGradeBucket?.sections.find(
        (item) => item.section === selectedSection,
      ) ?? null,
    [selectedGradeBucket, selectedSection],
  );

  const searchResults = useMemo(() => {
    if (!deferredSearch) {
      return { items: [] as TeacherRosterStudent[], total: 0 };
    }
    const matches = students.filter((student) =>
      rosterStudentMatchesQuery(student, deferredSearch),
    );
    return { items: matches.slice(0, 80), total: matches.length };
  }, [deferredSearch, students]);

  const visibleStudents = selectedSectionBucket?.students ?? [];

  function selectGrade(grade: number) {
    const bucket = gradeBuckets.find((item) => item.grade === grade);
    setSelectedGrade(grade);
    setSelectedSection(
      bucket && bucket.sections.length === 1 ? bucket.sections[0].section : null,
    );
    setSearch("");
  }

  function clearMessages() {
    setError(null);
    setMessage(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <AppPageHeader
        title="My students"
        subtitle="Open a class, then a section. Search finds a student across every class you teach."
        className="mb-4"
        action={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void rosterQuery.refetch();
                void groupsQuery.refetch();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                clearMessages();
                setShowAddStudent(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add student
            </Button>
          </div>
        }
      />

      <div className="mb-6 space-y-3">
        <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1">
          <TabButton
            active={tab === "classes"}
            onClick={() => setTab("classes")}
          >
            Classes
          </TabButton>
          <TabButton
            active={tab === "groups"}
            onClick={() => setTab("groups")}
          >
            Groups
            {groups.length > 0 ? (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {groups.length}
              </span>
            ) : null}
          </TabButton>
        </div>

        {tab === "classes" ? (
          <AppSearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, username, or roll number"
            aria-label="Search students"
          />
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {rosterQuery.isLoading ? (
        <AppLoadingSkeleton variant="cards" count={6} />
      ) : rosterQuery.error ? (
        <AppErrorState
          message={
            rosterQuery.error instanceof Error
              ? rosterQuery.error.message
              : "Could not load your students."
          }
          onRetry={() => void rosterQuery.refetch()}
        />
      ) : tab === "classes" ? (
        gradeBuckets.length === 0 ? (
          <AppEmptyState
            icon={Users}
            title="No classes assigned"
            description="Ask an admin to assign your class and section pairs, then add students here."
            actionLabel="Add student"
            onAction={() => setShowAddStudent(true)}
          />
        ) : deferredSearch ? (
          <SearchResultsList
            query={search.trim()}
            students={searchResults.items}
            totalMatches={searchResults.total}
            onOpenClass={(grade, section) => {
              setSearch("");
              setSelectedGrade(grade);
              setSelectedSection(section);
            }}
          />
        ) : (
          <div className="space-y-5">
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Class
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {gradeBuckets.map((bucket) => {
                  const selected = bucket.grade === selectedGrade;
                  return (
                    <button
                      key={bucket.grade}
                      type="button"
                      onClick={() => selectGrade(bucket.grade)}
                      className={cn(
                        "min-w-[7.5rem] shrink-0 rounded-xl border px-3.5 py-2.5 text-left transition",
                        selected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-card hover:border-primary/30",
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">
                        Grade {bucket.grade}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {bucket.sections.length} section
                        {bucket.sections.length === 1 ? "" : "s"} ·{" "}
                        {bucket.studentCount}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedSectionBucket ? (
              <>
                {selectedGradeBucket &&
                selectedGradeBucket.sections.length > 1 ? (
                  <section>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Section
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedGradeBucket.sections.map((bucket) => {
                        const selected = bucket.section === selectedSection;
                        return (
                          <button
                            key={bucket.section}
                            type="button"
                            onClick={() =>
                              setSelectedSection(
                                selected ? null : bucket.section,
                              )
                            }
                            className={cn(
                              "rounded-xl border px-3 py-2 text-left transition",
                              selected
                                ? "border-primary bg-primary/10"
                                : "border-border bg-card hover:border-primary/30",
                            )}
                          >
                            <span className="text-sm font-semibold text-foreground">
                              {bucket.section}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {bucket.students.length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}
                <StudentListPanel
                  title={`Grade ${selectedSectionBucket.grade}${selectedSectionBucket.section}`}
                  count={visibleStudents.length}
                  students={visibleStudents}
                  emptyTitle="No students in this section yet"
                  emptyDescription="Add a student with their CNIC or username into this class."
                  onAddStudent={() => setShowAddStudent(true)}
                />
              </>
            ) : selectedGradeBucket ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {selectedGradeBucket.sections.map((bucket) => (
                  <button
                    key={bucket.section}
                    type="button"
                    onClick={() => setSelectedSection(bucket.section)}
                    className="rounded-2xl border border-border bg-card px-4 py-5 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Grade {bucket.grade}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                      {bucket.section}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {bucket.students.length} student
                      {bucket.students.length === 1 ? "" : "s"}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )
      ) : (
        <StudentGroupsWorkspace
          peopleNoun="student"
          poolHint="your classes"
          groups={groups}
          people={students}
          loading={groupsQuery.isLoading}
          creating={createGroupMutation.isPending}
          updating={updateGroupMutation.isPending}
          deleting={deleteGroupMutation.isPending}
          adding={addMemberMutation.isPending}
          removing={removeMemberMutation.isPending}
          onCreate={(input) => createGroupMutation.mutateAsync(input)}
          onUpdate={async (groupId, input) => {
            await updateGroupMutation.mutateAsync({ groupId, ...input });
          }}
          onDelete={(group) => deleteGroupMutation.mutateAsync(group.groupId)}
          onAddMembers={async (groupId, studentIds) => {
            for (const studentId of studentIds) {
              await addMemberMutation.mutateAsync({ groupId, studentId });
            }
          }}
          onRemoveMember={(groupId, studentId) =>
            removeMemberMutation.mutateAsync({ groupId, studentId })
          }
        />
      )}

      {showAddStudent ? (
        <AddStudentDialog
          classSections={classSections}
          isSubmitting={addStudentMutation.isPending}
          onClose={() => {
            if (!addStudentMutation.isPending) {
              setShowAddStudent(false);
            }
          }}
          onSubmit={async (identifier, grade, section) => {
            const result = await addStudentMutation.mutateAsync({
              identifier,
              grade,
              section,
            });
            setShowAddStudent(false);
            setTab("classes");
            setSelectedGrade(result.grade);
            setSelectedSection(result.section);
            setSearch("");
            setMessage(
              result.alreadyOnRoster
                ? `${result.fullName} was already in that class.`
                : `${result.fullName} was added to Grade ${result.grade}${result.section}.`,
            );
          }}
        />
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SearchResultsList({
  query,
  students,
  totalMatches,
  onOpenClass,
}: {
  query: string;
  students: TeacherRosterStudent[];
  totalMatches: number;
  onOpenClass: (grade: number, section: string) => void;
}) {
  if (students.length === 0) {
    return (
      <AppEmptyState
        icon={Search}
        title={`No students match “${query}”`}
        description="Try a different name, username, or roll number."
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="border-b border-border/70 px-5 py-3">
        <p className="text-sm font-semibold text-foreground">
          {totalMatches} match{totalMatches === 1 ? "" : "es"}
        </p>
        {totalMatches > students.length ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Showing the first {students.length}. Narrow by name or open a class.
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Across your assigned classes
          </p>
        )}
      </div>
      <ul className="divide-y divide-border/70">
        {students.map((student) => (
          <li key={student.studentId}>
            <button
              type="button"
              onClick={() => onOpenClass(student.grade, student.section)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-muted/50"
            >
              <StudentAvatar name={student.fullName} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {student.fullName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Grade {student.grade}
                  {student.section} · {student.username} · Roll{" "}
                  {student.rollNumber || "—"}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StudentListPanel({
  title,
  count,
  students,
  emptyTitle,
  emptyDescription,
  onAddStudent,
}: {
  title: string;
  count: number;
  students: TeacherRosterStudent[];
  emptyTitle: string;
  emptyDescription: string;
  onAddStudent: () => void;
}) {
  if (students.length === 0) {
    return (
      <AppEmptyState
        icon={Users}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Add student"
        onAction={onAddStudent}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">
            {count} student{count === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-border/70">
        {students.map((student) => (
          <li key={student.studentId} className="flex items-center gap-3 px-5 py-3">
            <StudentAvatar name={student.fullName} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {student.fullName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {student.username} · Roll {student.rollNumber || "—"}
              </p>
            </div>
            <Link
              to={`/quizzes/assignments?studentId=${student.studentId}`}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/60"
            >
              View assignments
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StudentAvatar({ name }: { name: string }) {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/25 text-xs font-bold tracking-wide text-primary">
      {initialsFromName(name)}
    </span>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "??";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
