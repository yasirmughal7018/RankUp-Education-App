import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Check,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface GroupWorkspacePerson {
  studentId: number;
  fullName: string;
  username: string;
  rollNumber: string;
  grade: number;
  section: string;
}

export interface GroupWorkspaceGroup {
  groupId: number;
  groupName: string;
  description: string;
  memberCount: number;
  members: GroupWorkspacePerson[];
}

export interface StudentGroupsWorkspaceProps {
  peopleNoun: "student" | "child";
  poolHint: string;
  groups: GroupWorkspaceGroup[];
  people: GroupWorkspacePerson[];
  loading?: boolean;
  creating?: boolean;
  updating?: boolean;
  deleting?: boolean;
  adding?: boolean;
  removing?: boolean;
  onCreate: (input: {
    groupName: string;
    description: string;
  }) => Promise<GroupWorkspaceGroup>;
  onUpdate: (
    groupId: number,
    input: { groupName: string; description: string },
  ) => Promise<void>;
  onDelete: (group: GroupWorkspaceGroup) => Promise<void>;
  onAddMembers: (groupId: number, studentIds: number[]) => Promise<void>;
  onRemoveMember: (groupId: number, studentId: number) => Promise<void>;
}

type DetailTab = "members" | "add";

function personLabel(person: GroupWorkspacePerson): string {
  const section = person.section?.trim();
  return section
    ? `${person.fullName} (Grade ${person.grade} · ${section})`
    : `${person.fullName} (Grade ${person.grade})`;
}

function personMatches(person: GroupWorkspacePerson, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return `${person.fullName} ${person.username} ${person.rollNumber} grade ${person.grade}${person.section}`
    .toLowerCase()
    .includes(needle);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "??";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function PersonAvatar({ name }: { name: string }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/25 text-[11px] font-bold tracking-wide text-primary">
      {initialsFromName(name)}
    </span>
  );
}

/** Shared teacher/parent group manager: search, create, rename, delete, and bulk add. */
export function StudentGroupsWorkspace({
  peopleNoun,
  poolHint,
  groups,
  people,
  loading = false,
  creating = false,
  updating = false,
  deleting = false,
  adding = false,
  removing = false,
  onCreate,
  onUpdate,
  onDelete,
  onAddMembers,
  onRemoveMember,
}: StudentGroupsWorkspaceProps) {
  const plural = peopleNoun === "child" ? "children" : "students";
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupQuery, setGroupQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [detailTab, setDetailTab] = useState<DetailTab>("members");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<GroupWorkspaceGroup | null>(
    null,
  );
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedGroup =
    groups.find((group) => group.groupId === selectedGroupId) ?? null;

  useEffect(() => {
    if (groups.length === 0) {
      setSelectedGroupId(null);
      return;
    }
    if (
      selectedGroupId == null ||
      !groups.some((group) => group.groupId === selectedGroupId)
    ) {
      setSelectedGroupId(groups[0].groupId);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    setSelectedIds([]);
    setMemberQuery("");
    const group = groups.find((item) => item.groupId === selectedGroupId);
    setDetailTab(
      group && group.members.length === 0 ? "add" : "members",
    );
    // Only reset the detail pane when the selected group changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- groups refresh should not reset the tab
  }, [selectedGroupId]);

  const visibleGroups = useMemo(() => {
    const needle = groupQuery.trim().toLowerCase();
    if (!needle) {
      return groups;
    }
    return groups.filter((group) =>
      `${group.groupName} ${group.description}`
        .toLowerCase()
        .includes(needle),
    );
  }, [groupQuery, groups]);

  const memberIds = useMemo(
    () => new Set((selectedGroup?.members ?? []).map((item) => item.studentId)),
    [selectedGroup],
  );

  const availablePeople = useMemo(
    () =>
      people.filter(
        (person) =>
          !memberIds.has(person.studentId) && personMatches(person, memberQuery),
      ),
    [memberIds, memberQuery, people],
  );

  const visibleMembers = useMemo(
    () =>
      (selectedGroup?.members ?? []).filter((person) =>
        personMatches(person, memberQuery),
      ),
    [memberQuery, selectedGroup],
  );

  function clearMessages() {
    setError(null);
    setMessage(null);
  }

  function openCreate() {
    clearMessages();
    setDraftName("");
    setDraftDescription("");
    setShowCreate(true);
  }

  function openEdit() {
    if (!selectedGroup) {
      return;
    }
    clearMessages();
    setDraftName(selectedGroup.groupName);
    setDraftDescription(selectedGroup.description);
    setShowEdit(true);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) {
      setError("Enter a group name.");
      return;
    }
    try {
      const group = await onCreate({
        groupName: name,
        description: draftDescription.trim(),
      });
      setShowCreate(false);
      setSelectedGroupId(group.groupId);
      setMessage(`Created “${group.groupName}”. Add ${plural} on the right.`);
    } catch (err) {
      setError((err as ApiError).message ?? "Unable to create group.");
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroup) {
      return;
    }
    const name = draftName.trim();
    if (!name) {
      setError("Enter a group name.");
      return;
    }
    try {
      await onUpdate(selectedGroup.groupId, {
        groupName: name,
        description: draftDescription.trim(),
      });
      setShowEdit(false);
      setMessage("Group details saved.");
    } catch (err) {
      setError((err as ApiError).message ?? "Unable to update group.");
    }
  }

  async function handleDelete() {
    if (!groupToDelete) {
      return;
    }
    try {
      await onDelete(groupToDelete);
      setMessage(`Removed “${groupToDelete.groupName}”.`);
      setGroupToDelete(null);
    } catch (err) {
      setError((err as ApiError).message ?? "Unable to remove group.");
    }
  }

  function toggleSelected(studentId: number) {
    setSelectedIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  async function addPeople(studentIds: number[]) {
    if (!selectedGroup || studentIds.length === 0) {
      return;
    }
    clearMessages();
    try {
      await onAddMembers(selectedGroup.groupId, studentIds);
      setSelectedIds([]);
      setMessage(
        studentIds.length === 1
          ? `${peopleNoun === "child" ? "Child" : "Student"} added to the group.`
          : `${studentIds.length} ${plural} added to the group.`,
      );
      setDetailTab("members");
    } catch (err) {
      setError((err as ApiError).message ?? `Unable to add ${plural}.`);
    }
  }

  async function removePerson(studentId: number) {
    if (!selectedGroup) {
      return;
    }
    clearMessages();
    try {
      await onRemoveMember(selectedGroup.groupId, studentId);
      setMessage(
        `${peopleNoun === "child" ? "Child" : "Student"} removed from the group.`,
      );
    } catch (err) {
      setError((err as ApiError).message ?? "Unable to remove member.");
    }
  }

  return (
    <section className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {loading ? (
        <p className="rounded-2xl border border-border/80 bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          Loading groups…
        </p>
      ) : groups.length === 0 ? (
        <AppEmptyState
          icon={Users}
          title="No groups yet"
          description={`Create a group, then add ${plural} from ${poolHint}. Use it later to assign a quiz to everyone in the group.`}
          actionLabel="Create group"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,18.5rem)_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-2xl border border-border/80 bg-card">
            <div className="space-y-3 border-b border-border/70 px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Groups
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {groups.length} group{groups.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Button type="button" size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </div>
              <AppSearchInput
                value={groupQuery}
                onChange={(event) => setGroupQuery(event.target.value)}
                placeholder="Search groups"
                aria-label="Search groups"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto p-3 lg:hidden">
              {visibleGroups.map((group) => {
                const selected = selectedGroup?.groupId === group.groupId;
                return (
                  <button
                    key={group.groupId}
                    type="button"
                    onClick={() => setSelectedGroupId(group.groupId)}
                    className={cn(
                      "shrink-0 rounded-xl border px-3 py-2 text-left",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background",
                    )}
                  >
                    <p className="text-sm font-medium">{group.groupName}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.memberCount}
                    </p>
                  </button>
                );
              })}
            </div>

            {visibleGroups.length === 0 ? (
              <p className="hidden px-4 py-6 text-sm text-muted-foreground lg:block">
                No groups match that search.
              </p>
            ) : (
              <ul className="hidden divide-y divide-border/70 lg:block">
                {visibleGroups.map((group) => {
                  const selected = selectedGroup?.groupId === group.groupId;
                  return (
                    <li key={group.groupId}>
                      <button
                        type="button"
                        onClick={() => setSelectedGroupId(group.groupId)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition",
                          selected
                            ? "bg-primary/5"
                            : "hover:bg-muted/50",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            selected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {group.memberCount}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {group.groupName}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {group.memberCount} member
                            {group.memberCount === 1 ? "" : "s"}
                            {group.description
                              ? ` · ${group.description}`
                              : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
            {!selectedGroup ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                Select a group to manage members.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-foreground">
                      {selectedGroup.groupName}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedGroup.memberCount} member
                      {selectedGroup.memberCount === 1 ? "" : "s"}
                      {selectedGroup.description
                        ? ` · ${selectedGroup.description}`
                        : ` · Add ${plural} from ${poolHint}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={openEdit}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setGroupToDelete(selectedGroup)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 border-b border-border/70 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setDetailTab("members")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium",
                      detailTab === "members"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Members
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {selectedGroup.memberCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab("add")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium",
                      detailTab === "add"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Add {plural}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {people.length - selectedGroup.memberCount}
                    </span>
                  </button>
                </div>

                <div className="border-b border-border/70 px-5 py-3">
                  <AppSearchInput
                    value={memberQuery}
                    onChange={(event) => setMemberQuery(event.target.value)}
                    placeholder={
                      detailTab === "add"
                        ? `Find ${plural} to add`
                        : `Search members`
                    }
                    aria-label={
                      detailTab === "add"
                        ? `Search ${plural} to add`
                        : "Search group members"
                    }
                  />
                </div>

                {detailTab === "members" ? (
                  visibleMembers.length === 0 ? (
                    <div className="px-5 py-8">
                      <p className="text-sm text-muted-foreground">
                        {selectedGroup.members.length === 0
                          ? `No members yet. Open Add ${plural} to build this group.`
                          : "No members match that search."}
                      </p>
                      {selectedGroup.members.length === 0 ? (
                        <Button
                          type="button"
                          size="sm"
                          className="mt-3"
                          onClick={() => setDetailTab("add")}
                        >
                          <UserPlus className="h-4 w-4" />
                          Add {plural}
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/70">
                      {visibleMembers.map((member) => (
                        <li
                          key={member.studentId}
                          className="flex items-center justify-between gap-3 px-5 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <PersonAvatar name={member.fullName} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {personLabel(member)}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {member.username}
                                {member.rollNumber
                                  ? ` · Roll ${member.rollNumber}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={removing}
                            onClick={() => void removePerson(member.studentId)}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )
                ) : people.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-muted-foreground">
                    {peopleNoun === "child"
                      ? "Link a child first, then add them here."
                      : "Add students to your classes first, then add them here."}
                  </p>
                ) : availablePeople.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-muted-foreground">
                    {memberQuery.trim()
                      ? `No matching ${plural} left to add.`
                      : `Every ${peopleNoun} is already in this group.`}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-5 py-3">
                      <Button
                        type="button"
                        size="sm"
                        disabled={adding || selectedIds.length === 0}
                        onClick={() => void addPeople(selectedIds)}
                      >
                        Add selected
                        {selectedIds.length > 0
                          ? ` (${selectedIds.length})`
                          : ""}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={adding}
                        onClick={() =>
                          void addPeople(
                            availablePeople.map((person) => person.studentId),
                          )
                        }
                      >
                        Add all shown ({availablePeople.length})
                      </Button>
                    </div>
                    <ul className="max-h-[28rem] divide-y divide-border/70 overflow-y-auto">
                      {availablePeople.map((person) => {
                        const checked = selectedIds.includes(person.studentId);
                        return (
                          <li
                            key={person.studentId}
                            className="flex items-center justify-between gap-3 px-5 py-3"
                          >
                            <button
                              type="button"
                              onClick={() => toggleSelected(person.studentId)}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                              <span
                                className={cn(
                                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                  checked
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background",
                                )}
                                aria-hidden
                              >
                                {checked ? <Check className="h-3 w-3" /> : null}
                              </span>
                              <PersonAvatar name={person.fullName} />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {personLabel(person)}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {person.username}
                                </span>
                              </span>
                            </button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={adding}
                              onClick={() => void addPeople([person.studentId])}
                            >
                              Add
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <form onSubmit={(event) => void handleCreate(event)}>
            <DialogHeader>
              <DialogTitle>Create group</DialogTitle>
              <DialogDescription>
                Give the group a clear name. You can add {plural} right after.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Group name"
                maxLength={50}
                autoFocus
                disabled={creating}
              />
              <Input
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                placeholder="Description (optional)"
                maxLength={200}
                disabled={creating}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <form onSubmit={(event) => void handleUpdate(event)}>
            <DialogHeader>
              <DialogTitle>Edit group</DialogTitle>
              <DialogDescription>
                Update the name or description. Members stay the same.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Group name"
                maxLength={50}
                autoFocus
                disabled={updating}
              />
              <Input
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                placeholder="Description (optional)"
                maxLength={200}
                disabled={updating}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEdit(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AppConfirmDialog
        open={groupToDelete != null}
        onOpenChange={(open) => {
          if (!open) {
            setGroupToDelete(null);
          }
        }}
        title="Delete this group?"
        description={
          groupToDelete
            ? `“${groupToDelete.groupName}” will be removed. ${peopleNoun === "child" ? "Children" : "Students"} stay on your list — only the group is deleted.`
            : ""
        }
        confirmLabel="Delete group"
        destructive
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
