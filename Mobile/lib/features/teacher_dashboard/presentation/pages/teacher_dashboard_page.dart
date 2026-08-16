import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/core/widgets/stat_card.dart';
import 'package:rankup_education/features/teacher/data/models/teacher_roster_models.dart';
import 'package:rankup_education/features/teacher/presentation/providers/teacher_providers.dart';

/// Teacher home with real assigned classes/sections from the roster API.
class TeacherDashboardPage extends ConsumerWidget {
  const TeacherDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rosterAsync = ref.watch(teacherRosterProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Teacher Dashboard')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(teacherRosterProvider);
          await ref.read(teacherRosterProvider.future);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            rosterAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => AppEmptyState(
                icon: Icons.error_outline,
                title: 'Unable to load classes',
                message: error.toString(),
              ),
              data: (roster) => _AssignedClassesBlock(roster: roster),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => context.go('/quizzes'),
              icon: const Icon(Icons.assignment_outlined),
              label: const Text('Manage Quizzes'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => context.push('/teacher/students'),
              icon: const Icon(Icons.groups_outlined),
              label: const Text('My students'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => context.push('/questions'),
              icon: const Icon(Icons.quiz_outlined),
              label: const Text('Question Bank'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AssignedClassesBlock extends StatelessWidget {
  const _AssignedClassesBlock({required this.roster});

  final TeacherRoster roster;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final classSections = roster.classSections;
    final studentCount = roster.students.length;

    if (classSections.isEmpty) {
      return AppEmptyState(
        icon: Icons.class_outlined,
        title: 'No classes assigned yet',
        message:
            'Ask a school or campus admin to assign your grade and section pairs.',
      );
    }

    final byGrade = <int, List<TeacherClassSection>>{};
    for (final item in classSections) {
      byGrade.putIfAbsent(item.grade, () => []).add(item);
    }
    final grades = byGrade.keys.toList()..sort();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StatCard(
          title: 'My classes',
          value: '${classSections.length}',
          subtitle:
              '$studentCount student${studentCount == 1 ? '' : 's'} on roster',
          icon: Icons.groups_outlined,
        ),
        const SizedBox(height: 12),
        Text(
          'Assigned classes & sections',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        ...grades.map((grade) {
          final sections = [...byGrade[grade]!]
            ..sort((a, b) => a.section.compareTo(b.section));
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Grade $grade',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: sections.map((section) {
                        final count = roster.students
                            .where(
                              (s) =>
                                  s.grade == section.grade &&
                                  s.section.toLowerCase() ==
                                      section.section.toLowerCase(),
                            )
                            .length;
                        return ActionChip(
                          label: Text(
                            'Section ${section.section} · $count',
                          ),
                          onPressed: () =>
                              context.push('/teacher/students'),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}
