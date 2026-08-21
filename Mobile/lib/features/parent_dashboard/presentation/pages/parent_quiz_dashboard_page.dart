import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/core/widgets/stat_card.dart';
import 'package:rankup_education/features/parent/presentation/providers/parent_providers.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/presentation/providers/quiz_providers.dart';

/// Parent quiz overview with stats and shortcuts (mirrors web `/parent/quiz-dashboard`).
class ParentQuizDashboardPage extends ConsumerStatefulWidget {
  const ParentQuizDashboardPage({super.key});

  @override
  ConsumerState<ParentQuizDashboardPage> createState() =>
      _ParentQuizDashboardPageState();
}

class _ParentQuizDashboardPageState extends ConsumerState<ParentQuizDashboardPage> {
  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      await ref.read(quizzesControllerProvider.notifier).load();
    });
  }

  int _countPublished(List<QuizSummary> quizzes) {
    return quizzes.where((quiz) {
      final status = _lifecycleLabel(quiz).toLowerCase();
      return status.contains('publish') || status.contains('assign');
    }).length;
  }

  int _countNotAssigned(List<QuizSummary> quizzes) {
    return quizzes.where((quiz) {
      final status = _lifecycleLabel(quiz).toLowerCase();
      return status.contains('draft') || status.contains('pending');
    }).length;
  }

  int _countPendingReviews(List<QuizSummary> quizzes) {
    return quizzes.where((quiz) {
      final status = _lifecycleLabel(quiz).toLowerCase();
      return status.contains('review') || status.contains('pending');
    }).length;
  }

  String _lifecycleLabel(QuizSummary quiz) {
    if (quiz.resultStatus.trim().isNotEmpty &&
        quiz.resultStatus.toLowerCase() != 'not started') {
      return quiz.resultStatus;
    }
    return quiz.status.label;
  }

  @override
  Widget build(BuildContext context) {
    final quizState = ref.watch(quizzesControllerProvider);
    final childrenAsync = ref.watch(linkedStudentsProvider);
    final quizzes = quizState.quizzes;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quiz dashboard'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () async {
              ref.invalidate(linkedStudentsProvider);
              await ref.read(quizzesControllerProvider.notifier).load();
            },
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(linkedStudentsProvider);
          await ref.read(quizzesControllerProvider.notifier).load();
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            Text(
              'Track quizzes and reviews for your children.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton(
                  onPressed: () => context.go('/parent/children'),
                  child: const Text('Children'),
                ),
                FilledButton(
                  onPressed: () => context.push('/quizzes/assignments'),
                  child: const Text('Assignments'),
                ),
                OutlinedButton(
                  onPressed: () => context.go('/quizzes'),
                  child: const Text('Manage quizzes'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (quizState.isLoading)
              const Center(child: CircularProgressIndicator())
            else if (quizState.errorMessage != null)
              AppEmptyState(
                icon: Icons.error_outline,
                title: 'Could not load quizzes',
                message: quizState.errorMessage!,
              )
            else ...[
              StatCard(
                title: 'Total quizzes',
                value: '${quizzes.length}',
                subtitle: 'In your manage scope',
                icon: Icons.assignment_outlined,
              ),
              const SizedBox(height: 12),
              StatCard(
                title: 'Not assigned',
                value: '${_countNotAssigned(quizzes)}',
                subtitle: 'Draft / pending',
                icon: Icons.edit_note_outlined,
              ),
              const SizedBox(height: 12),
              StatCard(
                title: 'Published',
                value: '${_countPublished(quizzes)}',
                subtitle: 'Ready or assigned',
                icon: Icons.publish_outlined,
              ),
              const SizedBox(height: 12),
              StatCard(
                title: 'Pending reviews',
                value: '${_countPendingReviews(quizzes)}',
                subtitle: 'Open manage quizzes for reviews',
                icon: Icons.rate_review_outlined,
              ),
            ],
            const SizedBox(height: 20),
            Text(
              'Recent quizzes',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            if (!quizState.isLoading && quizzes.isEmpty)
              const AppEmptyState(
                icon: Icons.assignment_outlined,
                title: 'No quizzes yet',
                message: 'Create a quiz to get started.',
              )
            else
              for (final quiz in quizzes.take(8)) ...[
                Card(
                  child: ListTile(
                    title: Text(quiz.title),
                    subtitle: Text(
                      '${quiz.subject} · ${quiz.grade} · ${_lifecycleLabel(quiz)}',
                    ),
                    trailing: Chip(
                      label: Text(_lifecycleLabel(quiz)),
                      visualDensity: VisualDensity.compact,
                    ),
                    onTap: () => context.go('/quizzes'),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            const SizedBox(height: 12),
            Text(
              'Linked children',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            childrenAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => Text(error.toString()),
              data: (children) {
                if (children.isEmpty) {
                  return const Text('No linked children on this account.');
                }
                return Column(
                  children: [
                    for (final child in children)
                      Card(
                        child: ListTile(
                          title: Text(child.fullName),
                          subtitle: Text(child.label),
                          trailing: TextButton(
                            onPressed: () => context.push(
                              '/parent/children/${child.studentId}/history',
                            ),
                            child: const Text('History'),
                          ),
                        ),
                      ),
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
