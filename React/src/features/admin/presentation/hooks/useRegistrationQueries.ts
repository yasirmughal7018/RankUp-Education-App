import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as registrationApi from "@/features/admin/data/registrationApi";
import type { ApproveRegistrationRequest } from "@/features/admin/domain/registrationTypes";

export function usePendingRegistrationsQuery() {
  return useQuery({
    queryKey: queryKeys.pendingRegistrations(),
    queryFn: () => registrationApi.listPendingRegistrations(),
  });
}

export function useApproveRegistrationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      request,
    }: {
      userId: number;
      request: ApproveRegistrationRequest;
    }) => registrationApi.approveRegistration(userId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pendingRegistrations(),
      });
    },
  });
}

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
