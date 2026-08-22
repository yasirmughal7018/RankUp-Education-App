import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';
import 'package:rankup_education/features/parent/presentation/providers/parent_providers.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_manage_models.dart';
import 'package:rankup_education/features/quizzes/presentation/providers/quiz_providers.dart';

/// Cross-quiz assignment overview (mirrors web `/quizzes/assignments`).
class AssignmentBoardPage extends ConsumerStatefulWidget {
  const AssignmentBoardPage({super.key});

  @override
  ConsumerState<AssignmentBoardPage> createState() =>
      _AssignmentBoardPageState();
}

class _AssignmentBoardPageState extends ConsumerState<AssignmentBoardPage> {
  int? _studentFilter;

  String _formatWindow(DateTime start, DateTime end) {
    final localizations = MaterialLocalizations.of(context);
    final startText = localizations.formatCompactDate(start.toLocal());
    final endText = localizations.formatCompactDate(end.toLocal());
    return '$startText – $endText';
  }

  @override
  Widget build(BuildContext context) {
    final role =
        ref.watch(authControllerProvider).user?.role ?? UserRole.student;
    final isParent = role == UserRole.parent;
    final isLinkedAssigner = isParent;
    final boardAsync = ref.watch(assignmentBoardProvider(_studentFilter));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Assignment board'),
        leading: IconButton(
          tooltip: 'Back',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/quizzes'),
          icon: const Icon(Icons.arrow_back),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () =>
                ref.invalidate(assignmentBoardProvider(_studentFilter)),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(assignmentBoardProvider(_studentFilter));
          await ref.read(assignmentBoardProvider(_studentFilter).future);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            Text(
              'Overview of quiz assignments across your students.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 12),
            if (isLinkedAssigner)
              _LinkedStudentFilter(
                selectedStudentId: _studentFilter,
                onChanged: (value) => setState(() => _studentFilter = value),
              ),
            const SizedBox(height: 12),
            boardAsync.when(
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(),
                ),
              ),
              error: (error, _) => AppEmptyState(
                icon: Icons.error_outline,
                title: 'Could not load assignments',
                message: error.toString(),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const AppEmptyState(
                    icon: Icons.assignment_outlined,
                    title: 'No assignments',
                    message:
                        'Assignments appear here after you assign quizzes.',
                  );
                }
                return Column(
                  children: [
                    for (final item in items) ...[
                      _AssignmentBoardCard(
                        item: item,
                        windowLabel: _formatWindow(item.startAt, item.endAt),
                        onMonitor: () => context.push(
                          '/quizzes/monitoring/${item.quizId}',
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _LinkedStudentFilter extends ConsumerWidget {
  const _LinkedStudentFilter({
    required this.selectedStudentId,
    required this.onChanged,
  });

  final int? selectedStudentId;
  final ValueChanged<int?> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(linkedStudentsProvider);
    return async.when(
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const SizedBox.shrink(),
      data: (students) => _StudentDropdown(
        students: [
          for (final student in students)
            (id: student.studentId, label: student.label),
        ],
        selectedStudentId: selectedStudentId,
        onChanged: onChanged,
      ),
    );
  }
}

class _StudentDropdown extends StatelessWidget {
  const _StudentDropdown({
    required this.students,
    required this.selectedStudentId,
    required this.onChanged,
  });

  final List<({int id, String label})> students;
  final int? selectedStudentId;
  final ValueChanged<int?> onChanged;

  @override
  Widget build(BuildContext context) {
    if (students.isEmpty) {
      return const SizedBox.shrink();
    }

    return DropdownButtonFormField<int?>(
      initialValue: selectedStudentId,
      decoration: const InputDecoration(
        labelText: 'Filter by student',
      ),
      items: [
        const DropdownMenuItem<int?>(
          value: null,
          child: Text('All linked students'),
        ),
        for (final student in students)
          DropdownMenuItem<int?>(
            value: student.id,
            child: Text(student.label),
          ),
      ],
      onChanged: onChanged,
    );
  }
}

class _AssignmentBoardCard extends StatelessWidget {
  const _AssignmentBoardCard({
    required this.item,
    required this.windowLabel,
    required this.onMonitor,
  });

  final AssignmentBoardItem item;
  final String windowLabel;
  final VoidCallback onMonitor;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              item.quizTitle,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              item.studentName.isNotEmpty
                  ? item.studentName
                  : 'Student #${item.studentId}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            Text(
              windowLabel,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 4),
            Text(
              'Attempts ${item.attemptCount}/${item.allowedAttempts}'
              ' · ${item.resultStatus}'
              ' · ${item.monitorStatus}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onMonitor,
                icon: const Icon(Icons.monitor_heart_outlined),
                label: const Text('Monitor'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
