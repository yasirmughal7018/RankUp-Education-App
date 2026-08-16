import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as studentMeApi from "@/features/student/data/studentMeApi";

export function useStudentMeOverviewQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.studentMeOverview(),
    queryFn: () => studentMeApi.getStudentMeOverview(),
    enabled,
  });
}
