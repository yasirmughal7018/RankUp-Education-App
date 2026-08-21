import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/core/widgets/stat_card.dart';
import 'package:rankup_education/features/parent/presentation/providers/parent_providers.dart';

/// Parent home with linked children and shortcuts.
class ParentDashboardPage extends ConsumerWidget {
  const ParentDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(linkedStudentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Parent home'),
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
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(linkedStudentsProvider);
              await ref.read(linkedStudentsProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                StatCard(
                  title: 'Linked children',
                  value: '${students.length}',
                  subtitle: students.isEmpty
                      ? 'Ask an admin to link students to your account'
                      : 'Tap a child for quiz history',
                  icon: Icons.family_restroom_outlined,
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => context.go('/parent/children'),
                  icon: const Icon(Icons.family_restroom_outlined),
                  label: const Text('View all children'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => context.go('/parent/quiz-dashboard'),
                  icon: const Icon(Icons.dashboard_outlined),
                  label: const Text('Quiz dashboard'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => context.go('/quizzes'),
                  icon: const Icon(Icons.assignment_outlined),
                  label: const Text('Manage quizzes'),
                ),
                const SizedBox(height: 20),
                Text(
                  'Children',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                if (students.isEmpty)
                  const AppEmptyState(
                    icon: Icons.child_care_outlined,
                    title: 'No children linked',
                    message:
                        'School admins link students from Directory → Parents.',
                  )
                else
                  ...students.map(
                    (student) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            child: Text(
                              student.fullName.isNotEmpty
                                  ? student.fullName[0].toUpperCase()
                                  : '?',
                            ),
                          ),
                          title: Text(student.label),
                          subtitle: Text(student.relationship),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.push(
                            '/parent/children/${student.studentId}/history',
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
