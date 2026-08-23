import { StudentGroupsWorkspace } from "@/components/groups/StudentGroupsWorkspace";
import {
  useAddParentGroupMemberMutation,
  useCreateParentGroupMutation,
  useDeleteParentGroupMutation,
  useParentGroupsQuery,
  useRemoveParentGroupMemberMutation,
  useUpdateParentGroupMutation,
} from "@/features/parent/presentation/hooks/useParentQueries";
import type { LinkedStudent } from "@/features/parent/domain/parentTypes";

interface ParentGroupsPanelProps {
  students: LinkedStudent[];
}

export function ParentGroupsPanel({ students }: ParentGroupsPanelProps) {
  const groupsQuery = useParentGroupsQuery(true);
  const createGroupMutation = useCreateParentGroupMutation();
  const updateGroupMutation = useUpdateParentGroupMutation();
  const deleteGroupMutation = useDeleteParentGroupMutation();
  const addMemberMutation = useAddParentGroupMemberMutation();
  const removeMemberMutation = useRemoveParentGroupMemberMutation();

  return (
    <StudentGroupsWorkspace
      peopleNoun="child"
      poolHint="your linked children"
      groups={groupsQuery.data ?? []}
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
  );
}
