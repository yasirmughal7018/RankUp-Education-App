import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Plus, RefreshCw, Search, Users } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildRosterGradeBuckets,
  formatRosterStudent,
  rosterStudentMatchesQuery,
  type TeacherGroup,
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
} from "@/features/teacher/presentation/hooks/useTeacherQueries";
import { AddStudentDialog } from "@/features/teacher/presentation/components/AddStudentDialog";

type RosterTab = "classes" | "groups";

export function TeacherRosterPage() {
  const rosterQuery = useTeacherRosterQuery(true);
  const groupsQuery = useTeacherGroupsQuery(true);
  const createGroupMutation = useCreateTeacherGroupMutation();
  const addStudentMutation = useAddMyStudentMutation();
  const deleteGroupMutation = useDeleteTeacherGroupMutation();
  const addMemberMutation = useAddTeacherGroupMemberMutation();
  const removeMemberMutation = useRemoveTeacherGroupMemberMutation();

  const [tab, setTab] = useState<RosterTab>("classes");
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
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
  const selectedGroup = useMemo(
    () => groups.find((group) => group.groupId === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

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

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    const trimmed = groupName.trim();
    if (!trimmed) {
      setError("Enter a group name.");
      return;
    }

    try {
      const group = await createGroupMutation.mutateAsync({
        groupName: trimmed,
        description: groupDescription.trim(),
      });
      setGroupName("");
      setGroupDescription("");
      setSelectedGroupId(group.groupId);
      setMessage(`Created “${group.groupName}”.`);
    } catch (err) {
      setError((err as ApiError).message ?? "Unable to create group.");
    }
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
        <GroupsPanel
          groups={groups}
          students={students}
          selectedGroup={selectedGroup}
          groupName={groupName}
          groupDescription={groupDescription}
          memberQuery={memberQuery}
          creating={createGroupMutation.isPending}
          adding={addMemberMutation.isPending}
          removing={removeMemberMutation.isPending}
          deleting={deleteGroupMutation.isPending}
          loading={groupsQuery.isLoading}
          onGroupNameChange={setGroupName}
          onGroupDescriptionChange={setGroupDescription}
          onMemberQueryChange={setMemberQuery}
          onSelectGroup={setSelectedGroupId}
          onCreateGroup={(event) => void handleCreateGroup(event)}
          onDeleteGroup={async (group) => {
            clearMessages();
            try {
              await deleteGroupMutation.mutateAsync(group.groupId);
              if (selectedGroupId === group.groupId) {
                setSelectedGroupId(null);
              }
              setMessage(`Removed “${group.groupName}”.`);
            } catch (err) {
              setError((err as ApiError).message ?? "Unable to remove group.");
            }
          }}
          onAddMember={async (studentId) => {
            if (!selectedGroupId) {
              return;
            }
            clearMessages();
            try {
              await addMemberMutation.mutateAsync({
                groupId: selectedGroupId,
                studentId,
              });
              setMessage("Student added to the group.");
            } catch (err) {
              setError((err as ApiError).message ?? "Unable to add student.");
            }
          }}
          onRemoveMember={async (studentId) => {
            if (!selectedGroupId) {
              return;
            }
            clearMessages();
            try {
              await removeMemberMutation.mutateAsync({
                groupId: selectedGroupId,
                studentId,
              });
              setMessage("Student removed from group.");
            } catch (err) {
              setError(
                (err as ApiError).message ?? "Unable to remove student.",
              );
            }
          }}
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
                  {student.section} · @{student.username} · Roll{" "}
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
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {student.fullName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{student.username} · Roll {student.rollNumber || "—"}
              </p>
            </div>
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

function GroupsPanel({
  groups,
  students,
  selectedGroup,
  groupName,
  groupDescription,
  memberQuery,
  creating,
  adding,
  removing,
  deleting,
  loading,
  onGroupNameChange,
  onGroupDescriptionChange,
  onMemberQueryChange,
  onSelectGroup,
  onCreateGroup,
  onDeleteGroup,
  onAddMember,
  onRemoveMember,
}: {
  groups: TeacherGroup[];
  students: TeacherRosterStudent[];
  selectedGroup: TeacherGroup | null;
  groupName: string;
  groupDescription: string;
  memberQuery: string;
  creating: boolean;
  adding: boolean;
  removing: boolean;
  deleting: boolean;
  loading: boolean;
  onGroupNameChange: (value: string) => void;
  onGroupDescriptionChange: (value: string) => void;
  onMemberQueryChange: (value: string) => void;
  onSelectGroup: (groupId: number) => void;
  onCreateGroup: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteGroup: (group: TeacherGroup) => Promise<void>;
  onAddMember: (studentId: number) => Promise<void>;
  onRemoveMember: (studentId: number) => Promise<void>;
}) {
  const memberIds = new Set(
    (selectedGroup?.members ?? []).map((member) => member.studentId),
  );
  const availableMembers = students.filter((student) => {
    if (memberIds.has(student.studentId)) {
      return false;
    }
    return rosterStudentMatchesQuery(student, memberQuery);
  });

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Student groups
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mix students from any of your classes — for example a Math set or extra support.
          </p>
        </div>

        <form
          className="space-y-3 border-b border-border/70 px-5 py-4"
          onSubmit={onCreateGroup}
        >
          <input
            type="text"
            value={groupName}
            onChange={(event) => onGroupNameChange(event.target.value)}
            placeholder="Group name"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            disabled={creating}
          />
          <input
            type="text"
            value={groupDescription}
            onChange={(event) => onGroupDescriptionChange(event.target.value)}
            placeholder="Description (optional)"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            disabled={creating}
          />
          <Button type="submit" size="sm" disabled={creating}>
            {creating ? "Creating…" : "Create group"}
          </Button>
        </form>

        {loading ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Loading groups…
          </p>
        ) : groups.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            No groups yet.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {groups.map((group) => {
              const selected = selectedGroup?.groupId === group.groupId;
              return (
                <li
                  key={group.groupId}
                  className={cn(
                    "flex items-center justify-between gap-3 px-5 py-3",
                    selected && "bg-primary/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectGroup(group.groupId)}
                    className="min-w-0 text-left"
                  >
                    <p className="font-medium text-foreground">
                      {group.groupName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {group.memberCount} member
                      {group.memberCount === 1 ? "" : "s"}
                      {group.description ? ` · ${group.description}` : ""}
                    </p>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={deleting}
                    onClick={() => void onDeleteGroup(group)}
                  >
                    Delete
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Group members
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedGroup
              ? `Search your roster and add students to “${selectedGroup.groupName}”.`
              : "Select a group to add or remove students."}
          </p>
        </div>

        {!selectedGroup ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            Choose a group on the left.
          </p>
        ) : (
          <>
            <div className="border-b border-border/70 px-5 py-4">
              <AppSearchInput
                value={memberQuery}
                onChange={(event) => onMemberQueryChange(event.target.value)}
                placeholder="Find a roster student to add"
                aria-label="Search roster to add to group"
              />
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                {availableMembers.length === 0 ? (
                  <li className="px-1 py-2 text-sm text-muted-foreground">
                    {memberQuery.trim()
                      ? "No matching students left to add."
                      : "Every matching student is already in this group."}
                  </li>
                ) : (
                  availableMembers.slice(0, 20).map((student) => (
                    <li
                      key={student.studentId}
                      className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/60"
                    >
                      <p className="min-w-0 truncate text-sm text-foreground">
                        {formatRosterStudent(student)}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={adding}
                        onClick={() => void onAddMember(student.studentId)}
                      >
                        Add
                      </Button>
                    </li>
                  ))
                )}
              </ul>
              {availableMembers.length > 20 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing 20 of {availableMembers.length}. Type more of the name
                  to narrow the list.
                </p>
              ) : null}
            </div>

            {selectedGroup.members.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No members in this group yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {selectedGroup.members.map((member) => (
                  <li
                    key={member.studentId}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {formatRosterStudent(member as TeacherRosterStudent)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{member.username}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={removing}
                      onClick={() => void onRemoveMember(member.studentId)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
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
