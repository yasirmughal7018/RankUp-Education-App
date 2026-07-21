/** React Query hooks for pending registration approvals. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as registrationApi from "@/features/admin/data/registrationApi";

/** List accounts awaiting admin approval. */
export function usePendingRegistrationsQuery() {
  return useQuery({
    queryKey: queryKeys.pendingRegistrations(),
    queryFn: () => registrationApi.listPendingRegistrations(),
  });
}

/** Approve a registration request. */
export function useApproveRegistrationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) =>
      registrationApi.approveRegistration(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pendingRegistrations(),
      });
    },
  });
}

/** Reject a registration request. */
export function useRejectRegistrationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => registrationApi.rejectRegistration(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pendingRegistrations(),
      });
    },
  });
}
