import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/product_stubs/data/product_stub_models.dart';
import 'package:rankup_education/features/product_stubs/presentation/providers/product_stub_providers.dart';
import 'package:rankup_education/features/product_stubs/presentation/widgets/async_product_page.dart';

class WorksheetsPage extends ConsumerWidget {
  const WorksheetsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(worksheetsProvider);
    return AsyncProductPage(
      title: 'Worksheets',
      asyncValue: async,
      onRefresh: () => ref.invalidate(worksheetsProvider),
      icon: Icons.description_outlined,
      emptyTitle: 'No worksheets',
      emptyMessage:
          'Assigned worksheets from teachers will appear here when available.',
      isEmpty: (data) => (data as List<WorksheetItem>).isEmpty,
      builder: (context, data) {
        final items = data as List<WorksheetItem>;
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final item = items[index];
            return Card(
              child: ListTile(
                leading: const Icon(Icons.description_outlined),
                title: Text(item.title),
                subtitle: Text(item.subject),
                trailing: Chip(label: Text(item.status)),
              ),
            );
          },
        );
      },
    );
  }
}
