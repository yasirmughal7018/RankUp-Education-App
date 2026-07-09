import { apiRequest } from "@/core/api/apiClient";

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
}

export async function listNotifications(
  take = 20,
): Promise<NotificationListResponse> {
  return apiRequest<NotificationListResponse>(
    `/notifications?take=${take}`,
  );
}
