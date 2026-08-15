import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/core/widgets/stat_card.dart';
import 'package:rankup_education/features/tutor/presentation/providers/tutor_providers.dart';

/// Tutor home with linked students and shortcuts.
class TutorDashboardPage extends ConsumerWidget {
  const TutorDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(tutorLinkedStudentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tutor home'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(tutorLinkedStudentsProvider),
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
              title: 'Unable to load students',
              message: error.toString(),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => ref.invalidate(tutorLinkedStudentsProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
        data: (students) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(tutorLinkedStudentsProvider);
              await ref.read(tutorLinkedStudentsProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                StatCard(
                  title: 'Linked students',
                  value: '${students.length}',
                  subtitle: students.isEmpty
                      ? 'Link students by CNIC or username'
                      : 'Progress is only for quizzes you created',
                  icon: Icons.school_outlined,
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => context.go('/tutor/students'),
                  icon: const Icon(Icons.groups_outlined),
                  label: const Text('My students'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => context.go('/quizzes'),
                  icon: const Icon(Icons.assignment_outlined),
                  label: const Text('Quizzes'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => context.go('/reports'),
                  icon: const Icon(Icons.bar_chart_outlined),
                  label: const Text('Reports'),
                ),
                const SizedBox(height: 20),
                Text(
                  'Students',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                if (students.isEmpty)
                  const AppEmptyState(
                    icon: Icons.person_search_outlined,
                    title: 'No students linked',
                    message:
                        'Link an existing student. Their school and class stay unchanged.',
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
                          subtitle: Text(
                            [
                              '@${student.username}',
                              if (student.schoolName != null &&
                                  student.schoolName!.isNotEmpty)
                                student.schoolName!,
                            ].join(' · '),
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.push(
                            '/tutor/students/${student.studentId}/history',
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
