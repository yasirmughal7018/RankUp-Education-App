import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/product_stubs/data/product_stub_models.dart';
import 'package:rankup_education/features/product_stubs/presentation/providers/product_stub_providers.dart';
import 'package:rankup_education/features/product_stubs/presentation/widgets/async_product_page.dart';

/// School and platform competitions list.
class CompetitionsPage extends ConsumerWidget {
  const CompetitionsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(competitionsProvider);
    return AsyncProductPage(
      title: 'Competitions',
      asyncValue: async,
      onRefresh: () => ref.invalidate(competitionsProvider),
      icon: Icons.emoji_events_outlined,
      emptyTitle: 'No competitions',
      emptyMessage:
          'Live contests and school competitions will be listed here.',
      isEmpty: (data) => (data as List<CompetitionItem>).isEmpty,
      builder: (context, data) {
        final items = data as List<CompetitionItem>;
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final item = items[index];
            return Card(
              child: ListTile(
                leading: const Icon(Icons.emoji_events_outlined),
                title: Text(item.title),
                subtitle: Text(item.status),
              ),
            );
          },
        );
      },
    );
  }
}
