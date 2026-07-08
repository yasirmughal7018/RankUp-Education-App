import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/product_stubs/data/product_stub_models.dart';
import 'package:rankup_education/features/product_stubs/presentation/providers/product_stub_providers.dart';
import 'package:rankup_education/features/product_stubs/presentation/widgets/async_product_page.dart';

class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    return AsyncProductPage(
      title: 'Notifications',
      asyncValue: async,
      onRefresh: () => ref.invalidate(notificationsProvider),
      icon: Icons.notifications_outlined,
      emptyTitle: 'No notifications',
      emptyMessage:
          'In-app alerts will appear here. Push delivery is registered after login when a device token is available.',
      isEmpty: (data) => (data as List<NotificationItem>).isEmpty,
      builder: (context, data) {
        final items = data as List<NotificationItem>;
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final item = items[index];
            return Card(
              child: ListTile(
                leading: Icon(
                  item.isRead
                      ? Icons.notifications_none
                      : Icons.notifications_active,
                ),
                title: Text(item.title),
                subtitle: Text(item.body),
                trailing: Text(item.category),
              ),
            );
          },
        );
      },
    );
  }
}
