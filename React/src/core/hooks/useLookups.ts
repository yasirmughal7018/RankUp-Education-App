import { useQuery } from "@tanstack/react-query";
import * as lookupApi from "@/core/lookups/lookupApi";
import { queryKeys } from "@/core/api/queryKeys";

/** Cached lookup list for a type (optionally scoped by parent id). */
export function useLookups(type?: string, parentId?: number | null) {
  return useQuery({
    queryKey: queryKeys.lookups(type, parentId),
    queryFn: () => lookupApi.listLookups(type, parentId),
    enabled: type !== undefined,
  });
}
