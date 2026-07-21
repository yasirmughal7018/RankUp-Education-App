import { apiRequest } from "@/core/api/apiClient";
import type { LookupItem } from "@/core/lookups/lookupTypes";

/** List lookup items, optionally filtered by type and parent. */
export async function listLookups(
  type?: string,
  parentId?: number | null,
): Promise<LookupItem[]> {
  const params = new URLSearchParams();

  if (type) {
    params.set("type", type);
  }

  if (parentId !== undefined && parentId !== null) {
    params.set("parentId", String(parentId));
  }

  const query = params.toString();
  const response = await apiRequest<{ items: LookupItem[] }>(
    `/lookups${query ? `?${query}` : ""}`,
  );

  return response.items;
}

/** Distinct lookup type names available from the API. */
export async function listLookupTypes(): Promise<string[]> {
  const response = await apiRequest<{ types: string[] }>("/lookups/types");
  return response.types;
}
