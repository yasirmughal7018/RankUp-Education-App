import { apiRequest } from "@/core/api/apiClient";
import type { LookupItem } from "@/core/lookups/lookupTypes";

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

export async function listLookupTypes(): Promise<string[]> {
  const response = await apiRequest<{ types: string[] }>("/lookups/types");
  return response.types;
}
