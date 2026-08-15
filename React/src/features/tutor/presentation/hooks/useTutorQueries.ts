import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as tutorApi from "@/features/tutor/data/tutorApi";
import type { LinkTutorStudentInput } from "@/features/tutor/domain/tutorTypes";

export function useTutorLinkedStudentsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.tutorLinkedStudents(),
    queryFn: () => tutorApi.listLinkedStudents(),
    enabled,
  });
}

export function useLinkTutorStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LinkTutorStudentInput) => tutorApi.linkStudent(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tutorLinkedStudents(),
      });
    },
  });
}

export function useUnlinkTutorStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: number) => tutorApi.unlinkStudent(studentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tutorLinkedStudents(),
      });
    },
  });
}

export function useTutorStudentHistoryQuery(studentId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.studentQuizHistory(studentId),
    queryFn: () => tutorApi.getStudentQuizHistory(studentId),
    enabled: enabled && studentId > 0,
  });
}
