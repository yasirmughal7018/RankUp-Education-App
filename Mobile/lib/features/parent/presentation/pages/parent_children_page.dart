import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/parent/presentation/providers/parent_providers.dart';

/// Linked children list for the signed-in Parent.
class ParentChildrenPage extends ConsumerWidget {
  const ParentChildrenPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(linkedStudentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My children'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(linkedStudentsProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: studentsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ListView(
          padding: const EdgeInsets.all(24),
          children: [
            AppEmptyState(
              icon: Icons.error_outline,
              title: 'Unable to load children',
              message: error.toString(),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => ref.invalidate(linkedStudentsProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
        data: (students) {
          if (students.isEmpty) {
            return const Padding(
              padding: EdgeInsets.all(24),
              child: AppEmptyState(
                icon: Icons.family_restroom_outlined,
                title: 'No linked children',
                message:
                    'Ask your school admin to link students to this parent account.',
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(linkedStudentsProvider);
              await ref.read(linkedStudentsProvider.future);
            },
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: students.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final student = students[index];
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      child: Text(
                        student.fullName.isNotEmpty
                            ? student.fullName[0].toUpperCase()
                            : '?',
                      ),
                    ),
                    title: Text(student.label),
                    subtitle: Text(
                      '@${student.username} · Roll ${student.rollNumber.isEmpty ? '—' : student.rollNumber} · ${student.relationship}',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push(
                      '/parent/children/${student.studentId}/history',
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
