import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/product_stubs/data/product_stub_models.dart';
import 'package:rankup_education/features/product_stubs/presentation/providers/product_stub_providers.dart';
import 'package:rankup_education/features/product_stubs/presentation/widgets/async_product_page.dart';

class MessagesPage extends ConsumerWidget {
  const MessagesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(messageThreadsProvider);
    return AsyncProductPage(
      title: 'Messages',
      asyncValue: async,
      onRefresh: () => ref.invalidate(messageThreadsProvider),
      icon: Icons.chat_bubble_outline,
      emptyTitle: 'No conversations',
      emptyMessage:
          'Message threads from teachers and school staff will appear here.',
      isEmpty: (data) => (data as List<MessageThread>).isEmpty,
      builder: (context, data) {
        final items = data as List<MessageThread>;
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final item = items[index];
            return Card(
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person_outline)),
                title: Text(item.subject),
                subtitle: Text(item.lastPreview),
                trailing: item.unreadCount > 0
                    ? Badge(label: Text('${item.unreadCount}'))
                    : const Icon(Icons.chevron_right),
              ),
            );
          },
        );
      },
    );
  }
}
