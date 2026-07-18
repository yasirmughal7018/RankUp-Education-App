import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";

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

export async function markNotificationRead(notificationId: number): Promise<void> {
  await apiRequestVoid(`/notifications/${notificationId}/read`, {
    method: "POST",
  });
}

export async function markNotificationCategoryRead(
  category: string,
): Promise<void> {
  await apiRequestVoid(
    `/notifications/read-category?category=${encodeURIComponent(category)}`,
    { method: "POST" },
  );
}
