/** In-app notifications HTTP client. */
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

/** Recent notifications for the current user. */
export async function listNotifications(
  take = 20,
): Promise<NotificationListResponse> {
  return apiRequest<NotificationListResponse>(
    `/notifications?take=${take}`,
  );
}

/** Mark one notification as read. */
export async function markNotificationRead(notificationId: number): Promise<void> {
  await apiRequestVoid(`/notifications/${notificationId}/read`, {
    method: "POST",
  });
}

/** Mark all notifications in a category read. */
export async function markNotificationCategoryRead(
  category: string,
): Promise<void> {
  await apiRequestVoid(
    `/notifications/read-category?category=${encodeURIComponent(category)}`,
    { method: "POST" },
  );
}
