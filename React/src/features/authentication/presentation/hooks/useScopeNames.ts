import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as authApi from "@/features/authentication/data/authApi";

const STALE_TIME = 10 * 60 * 1000;

/**
 * Resolves school / campus ids to display names so screens never show raw ids.
 * Falls back to `null` when an id has no match, letting callers render a dash.
 */
export function useScopeNames(
  schoolId?: number | null,
  campusId?: number | null,
) {
  const schoolsQuery = useQuery({
    queryKey: queryKeys.scopeSchools(),
    queryFn: () => authApi.listRegistrationSchools(),
    enabled: schoolId != null,
    staleTime: STALE_TIME,
  });

  const campusesQuery = useQuery({
    queryKey: queryKeys.scopeCampuses(schoolId ?? 0),
    queryFn: () => authApi.listRegistrationCampuses(schoolId as number),
    enabled: schoolId != null && campusId != null,
    staleTime: STALE_TIME,
  });

  const schoolName =
    schoolsQuery.data?.find((school) => school.id === schoolId)?.name ?? null;
  const campusName =
    campusesQuery.data?.find((campus) => campus.id === campusId)?.name ?? null;

  return {
    schoolName,
    campusName,
    isLoading: schoolsQuery.isLoading || campusesQuery.isLoading,
  };
}
