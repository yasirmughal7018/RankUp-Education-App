import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/product_stubs/data/product_stub_models.dart';
import 'package:rankup_education/features/product_stubs/presentation/providers/product_stub_providers.dart';
import 'package:rankup_education/features/product_stubs/presentation/widgets/async_product_page.dart';

/// Attendance history for the signed-in student.
class AttendancePage extends ConsumerWidget {
  const AttendancePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(attendanceProvider);
    return AsyncProductPage(
      title: 'Attendance',
      asyncValue: async,
      onRefresh: () => ref.invalidate(attendanceProvider),
      icon: Icons.fact_check_outlined,
      emptyTitle: 'No attendance records',
      emptyMessage:
          'Attendance from the API will show here once teachers start marking.',
      isEmpty: (data) => (data as List<AttendanceRecord>).isEmpty,
      builder: (context, data) {
        final items = data as List<AttendanceRecord>;
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final item = items[index];
            return Card(
              child: ListTile(
                leading: const Icon(Icons.event_available_outlined),
                title: Text(item.studentName),
                subtitle: Text('${item.date} · ${item.status}'),
                trailing: item.notes == null || item.notes!.isEmpty
                    ? null
                    : const Icon(Icons.notes_outlined),
              ),
            );
          },
        );
      },
    );
  }
}
