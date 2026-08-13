import { useMemo, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { PageHeader } from "@/core/components/PageHeader";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import {
  formatClassSection,
  formatRosterStudent,
  type TeacherGroup,
  type TeacherRosterStudent,
} from "@/features/teacher/domain/teacherTypes";
import {
  useAddTeacherGroupMemberMutation,
  useCreateTeacherGroupMutation,
  useDeleteTeacherGroupMutation,
  useRemoveTeacherGroupMemberMutation,
  useTeacherGroupsQuery,
  useTeacherRosterQuery,
} from "@/features/teacher/presentation/hooks/useTeacherQueries";

export function TeacherRosterPage() {
  const rosterQuery = useTeacherRosterQuery(true);
  const groupsQuery = useTeacherGroupsQuery(true);
  const createGroupMutation = useCreateTeacherGroupMutation();
  const deleteGroupMutation = useDeleteTeacherGroupMutation();
  const addMemberMutation = useAddTeacherGroupMemberMutation();
  const removeMemberMutation = useRemoveTeacherGroupMemberMutation();

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [memberStudentId, setMemberStudentId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const students = rosterQuery.data?.students ?? [];
  const classSections = rosterQuery.data?.classSections ?? [];
  const groups = groupsQuery.data ?? [];

  const selectedGroup = useMemo(
    () => groups.find((group) => group.groupId === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const availableMembers = useMemo(() => {
    if (!selectedGroup) {
      return students;
    }
    const memberIds = new Set(
      selectedGroup.members.map((member) => member.studentId),
    );
    return students.filter((student) => !memberIds.has(student.studentId));
  }, [selectedGroup, students]);

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
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

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!selectedGroupId) {
      setError("Select a group first.");
      return;
    }
    const studentId = Number(memberStudentId);
    if (!studentId) {
      setError("Select a student from your roster.");
      return;
    }

    try {
      await addMemberMutation.mutateAsync({ groupId: selectedGroupId, studentId });
      setMemberStudentId("");
      setMessage("Student added to the group.");
    } catch (err) {
      setError((err as ApiError).message ?? "Unable to add student.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title="My students"
        description="Students from your assigned classes and sections. Create groups such as Math or Weak Students from this roster only."
        action={
          <button
            type="button"
            onClick={() => {
              void rosterQuery.refetch();
              void groupsQuery.refetch();
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Class roster</h2>
          <p className="mt-1 text-sm text-slate-600">
            {classSections.length === 0
              ? "No classes assigned yet. Ask an admin to set your class/section pairs."
              : `Assigned: ${classSections.map(formatClassSection).join(", ")}`}
          </p>
        </div>
        {rosterQuery.isLoading ? (
          <div className="px-5 py-8 text-sm text-slate-600">Loading roster…</div>
        ) : students.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-600">
            No students found for your assigned classes and sections.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {students.map((student) => (
              <li key={student.studentId} className="px-5 py-3">
                <p className="font-medium text-slate-900">
                  {formatRosterStudent(student)}
                </p>
                <p className="text-xs text-slate-500">
                  @{student.username} · Roll {student.rollNumber || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Student groups
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Optional groups for quiz assignment (e.g. Math Group).
            </p>
          </div>

          <form
            className="space-y-3 border-b border-slate-200 px-5 py-4"
            onSubmit={(event) => void handleCreateGroup(event)}
          >
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name"
              className={FORM_FIELD_CLASS}
              disabled={createGroupMutation.isPending}
            />
            <input
              type="text"
              value={groupDescription}
              onChange={(event) => setGroupDescription(event.target.value)}
              placeholder="Description (optional)"
              className={FORM_FIELD_CLASS}
              disabled={createGroupMutation.isPending}
            />
            <button
              type="submit"
              disabled={createGroupMutation.isPending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              {createGroupMutation.isPending ? "Creating…" : "Create group"}
            </button>
          </form>

          {groupsQuery.isLoading ? (
            <div className="px-5 py-6 text-sm text-slate-600">Loading groups…</div>
          ) : groups.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-600">
              No groups yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {groups.map((group) => (
                <GroupListItem
                  key={group.groupId}
                  group={group}
                  selected={selectedGroupId === group.groupId}
                  onSelect={() => setSelectedGroupId(group.groupId)}
                  onDelete={async () => {
                    setError(null);
                    setMessage(null);
                    try {
                      await deleteGroupMutation.mutateAsync(group.groupId);
                      if (selectedGroupId === group.groupId) {
                        setSelectedGroupId(null);
                      }
                      setMessage(`Removed “${group.groupName}”.`);
                    } catch (err) {
                      setError(
                        (err as ApiError).message ?? "Unable to remove group.",
                      );
                    }
                  }}
                  deleting={deleteGroupMutation.isPending}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Group members
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {selectedGroup
                ? `Manage members of “${selectedGroup.groupName}”.`
                : "Select a group to add or remove students."}
            </p>
          </div>

          {!selectedGroup ? (
            <div className="px-5 py-8 text-sm text-slate-600">
              Choose a group on the left.
            </div>
          ) : (
            <>
              <form
                className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-4"
                onSubmit={(event) => void handleAddMember(event)}
              >
                <select
                  value={memberStudentId}
                  onChange={(event) => setMemberStudentId(event.target.value)}
                  className={`${FORM_FIELD_CLASS} min-w-[14rem] flex-1`}
                  disabled={addMemberMutation.isPending}
                >
                  <option value="">Select roster student</option>
                  {availableMembers.map((student) => (
                    <option key={student.studentId} value={student.studentId}>
                      {formatRosterStudent(student)}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={
                    addMemberMutation.isPending || availableMembers.length === 0
                  }
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
                >
                  Add
                </button>
              </form>

              {selectedGroup.members.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-600">
                  No members in this group yet.
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {selectedGroup.members.map((member) => (
                    <li
                      key={member.studentId}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {formatRosterStudent(member as TeacherRosterStudent)}
                        </p>
                        <p className="text-xs text-slate-500">
                          @{member.username}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={removeMemberMutation.isPending}
                        onClick={() => {
                          void (async () => {
                            setError(null);
                            setMessage(null);
                            try {
                              await removeMemberMutation.mutateAsync({
                                groupId: selectedGroup.groupId,
                                studentId: member.studentId,
                              });
                              setMessage("Student removed from group.");
                            } catch (err) {
                              setError(
                                (err as ApiError).message ??
                                  "Unable to remove student.",
                              );
                            }
                          })();
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function GroupListItem({
  group,
  selected,
  onSelect,
  onDelete,
  deleting,
}: {
  group: TeacherGroup;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => Promise<void>;
  deleting: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between gap-3 px-5 py-3 ${
        selected ? "bg-brand-50" : ""
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 text-left">
        <p className="font-medium text-slate-900">{group.groupName}</p>
        <p className="text-xs text-slate-500">
          {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
          {group.description ? ` · ${group.description}` : ""}
        </p>
      </button>
      <button
        type="button"
        disabled={deleting}
        onClick={() => void onDelete()}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
      >
        Delete
      </button>
    </li>
  );
}
