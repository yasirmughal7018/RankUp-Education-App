import { useMemo, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import {
  childMatchesQuery,
  formatStudentLabel,
  type LinkedStudent,
  type ParentGroup,
} from "@/features/parent/domain/parentTypes";
import {
  useAddParentGroupMemberMutation,
  useCreateParentGroupMutation,
  useDeleteParentGroupMutation,
  useParentGroupsQuery,
  useRemoveParentGroupMemberMutation,
} from "@/features/parent/presentation/hooks/useParentQueries";

interface ParentGroupsPanelProps {
  students: LinkedStudent[];
}

export function ParentGroupsPanel({ students }: ParentGroupsPanelProps) {
  const groupsQuery = useParentGroupsQuery(true);
  const createGroupMutation = useCreateParentGroupMutation();
  const deleteGroupMutation = useDeleteParentGroupMutation();
  const addMemberMutation = useAddParentGroupMemberMutation();
  const removeMemberMutation = useRemoveParentGroupMemberMutation();

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const groups = groupsQuery.data ?? [];
  const selectedGroup =
    groups.find((group) => group.groupId === selectedGroupId) ?? null;
  const memberIds = new Set(
    (selectedGroup?.members ?? []).map((member) => member.studentId),
  );
  const availableMembers = useMemo(
    () =>
      students.filter((student) => {
        if (memberIds.has(student.studentId)) {
          return false;
        }
        return childMatchesQuery(student, memberQuery);
      }),
    [memberIds, memberQuery, students],
  );

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

  async function handleDeleteGroup(group: ParentGroup) {
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
  }

  async function handleAddMember(studentId: number) {
    if (!selectedGroupId) {
      return;
    }
    clearMessages();
    try {
      await addMemberMutation.mutateAsync({
        groupId: selectedGroupId,
        studentId,
      });
    } catch (err) {
      setError((err as ApiError).message ?? "Unable to add child to group.");
    }
  }

  async function handleRemoveMember(studentId: number) {
    if (!selectedGroupId) {
      return;
    }
    clearMessages();
    try {
      await removeMemberMutation.mutateAsync({
        groupId: selectedGroupId,
        studentId,
      });
    } catch (err) {
      setError((err as ApiError).message ?? "Unable to remove child from group.");
    }
  }

  return (
    <section className="mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Child groups</h2>
        <p className="mt-1 text-sm text-slate-600">
          Group linked children so you can assign a quiz to several of them at once.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <form
            className="space-y-3 border-b border-slate-200 px-5 py-4"
            onSubmit={(event) => void handleCreateGroup(event)}
          >
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name"
              maxLength={50}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              disabled={createGroupMutation.isPending}
            />
            <input
              type="text"
              value={groupDescription}
              onChange={(event) => setGroupDescription(event.target.value)}
              placeholder="Description (optional)"
              maxLength={200}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
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
            <p className="px-5 py-6 text-sm text-slate-600">Loading groups…</p>
          ) : groups.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-600">
              No groups yet. Create one, then add linked children.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {groups.map((group) => {
                const selected = selectedGroup?.groupId === group.groupId;
                return (
                  <li
                    key={group.groupId}
                    className={`flex items-center justify-between gap-3 px-5 py-3 ${
                      selected ? "bg-brand-50" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedGroupId(group.groupId)}
                      className="min-w-0 text-left"
                    >
                      <p className="font-medium text-slate-900">
                        {group.groupName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {group.memberCount} member
                        {group.memberCount === 1 ? "" : "s"}
                        {group.description ? ` · ${group.description}` : ""}
                      </p>
                    </button>
                    <button
                      type="button"
                      disabled={deleteGroupMutation.isPending}
                      onClick={() => void handleDeleteGroup(group)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-900">
              Group members
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {selectedGroup
                ? `Add linked children to “${selectedGroup.groupName}”.`
                : "Select a group to add or remove children."}
            </p>
          </div>

          {!selectedGroup ? (
            <p className="px-5 py-8 text-sm text-slate-600">
              Choose a group on the left.
            </p>
          ) : (
            <>
              <div className="border-b border-slate-200 px-5 py-4">
                <input
                  type="search"
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Find a linked child to add"
                  aria-label="Search children to add to group"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
                <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                  {students.length === 0 ? (
                    <li className="px-1 py-2 text-sm text-slate-600">
                      Link a child first, then add them to this group.
                    </li>
                  ) : availableMembers.length === 0 ? (
                    <li className="px-1 py-2 text-sm text-slate-600">
                      {memberQuery.trim()
                        ? "No matching children left to add."
                        : "Every linked child is already in this group."}
                    </li>
                  ) : (
                    availableMembers.slice(0, 20).map((student) => (
                      <li
                        key={student.studentId}
                        className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50"
                      >
                        <p className="min-w-0 truncate text-sm text-slate-900">
                          {formatStudentLabel(student)}
                        </p>
                        <button
                          type="button"
                          disabled={addMemberMutation.isPending}
                          onClick={() => void handleAddMember(student.studentId)}
                          className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                        >
                          Add
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                {availableMembers.length > 20 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Showing 20 of {availableMembers.length}. Type more of the
                    name to narrow the list.
                  </p>
                ) : null}
              </div>

              {selectedGroup.members.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-600">
                  No members in this group yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {selectedGroup.members.map((member) => (
                    <li
                      key={member.studentId}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {formatStudentLabel(member)}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {member.username}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={removeMemberMutation.isPending}
                        onClick={() => void handleRemoveMember(member.studentId)}
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
      </div>
    </section>
  );
}
