import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/product_stubs/data/product_stub_models.dart';
import 'package:rankup_education/features/product_stubs/presentation/providers/product_stub_providers.dart';
import 'package:rankup_education/features/product_stubs/presentation/widgets/async_product_page.dart';

/// Points, badges, and earned rewards.
class RewardsPage extends ConsumerWidget {
  const RewardsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(rewardsProvider);
    return AsyncProductPage(
      title: 'Rewards',
      asyncValue: async,
      onRefresh: () => ref.invalidate(rewardsProvider),
      icon: Icons.workspace_premium_outlined,
      emptyTitle: 'No rewards yet',
      emptyMessage:
          'Points, badges, and certificates will show here when earned.',
      isEmpty: (data) {
        final summary = data as RewardSummary;
        return summary.items.isEmpty && summary.totalPoints == 0;
      },
      builder: (context, data) {
        final summary = data as RewardSummary;
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: ListTile(
                leading: const Icon(Icons.stars_outlined),
                title: const Text('Total points'),
                trailing: Text(
                  '${summary.totalPoints}',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ),
            const SizedBox(height: 12),
            ...summary.items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Card(
                  child: ListTile(
                    leading: const Icon(Icons.emoji_events_outlined),
                    title: Text(item.title),
                    subtitle: Text(item.description),
                    trailing: Text('+${item.points}'),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
