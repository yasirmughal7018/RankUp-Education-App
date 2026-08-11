import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/parent/presentation/providers/parent_providers.dart';
import 'package:rankup_education/features/quizzes/presentation/providers/quiz_providers.dart';
import 'package:rankup_education/features/reports/data/models/student_quiz_history_models.dart';

/// Quiz history for one linked child.
class ParentChildHistoryPage extends ConsumerWidget {
  const ParentChildHistoryPage({required this.studentId, super.key});

  final int studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(childQuizHistoryProvider(studentId));

    return Scaffold(
      appBar: AppBar(
        title: Text(
          historyAsync.maybeWhen(
            data: (history) => history.studentName.isNotEmpty
                ? '${history.studentName} · history'
                : 'Child quiz history',
            orElse: () => 'Child quiz history',
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () =>
                ref.invalidate(childQuizHistoryProvider(studentId)),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: historyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ListView(
          padding: const EdgeInsets.all(24),
          children: [
            AppEmptyState(
              icon: Icons.error_outline,
              title: 'Quiz history unavailable',
              message: error.toString(),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () =>
                  ref.invalidate(childQuizHistoryProvider(studentId)),
              child: const Text('Retry'),
            ),
          ],
        ),
        data: (history) {
          if (history.items.isEmpty) {
            return const Padding(
              padding: EdgeInsets.all(24),
              child: AppEmptyState(
                icon: Icons.history_outlined,
                title: 'No quiz history yet',
                message: 'Completed attempts for this child will appear here.',
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(childQuizHistoryProvider(studentId));
              await ref.read(childQuizHistoryProvider(studentId).future);
            },
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: history.items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = history.items[index];
                return Card(
                  child: ListTile(
                    title: Text(item.quizTitle),
                    subtitle: Text(
                      [
                        if (item.bestPercentage != null)
                          'Best ${item.bestPercentage}%',
                        item.resultStatus,
                        if (item.attemptCount > 0)
                          '${item.attemptCount} attempt(s)',
                      ].join(' · '),
                    ),
                    trailing: item.attemptId == null
                        ? null
                        : const Icon(Icons.visibility_outlined),
                    onTap: item.attemptId == null
                        ? null
                        : () => _openResult(context, ref, item),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Future<void> _openResult(
    BuildContext context,
    WidgetRef ref,
    StudentQuizHistoryItemModel item,
  ) async {
    final attemptId = item.attemptId;
    if (attemptId == null) {
      return;
    }

    unawaited(
      showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      ),
    );

    final result = await ref
        .read(quizzesControllerProvider.notifier)
        .loadAttemptResult(
          quizId: '${item.quizId}',
          attemptId: '$attemptId',
        );

    if (!context.mounted) {
      return;
    }
    Navigator.of(context, rootNavigator: true).pop();

    if (result == null) {
      final error = ref.read(quizzesControllerProvider).actionError;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error ?? 'Unable to load quiz result.')),
      );
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.quizTitle,
                style: Theme.of(sheetContext).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 12),
              Text(
                'Score: ${result.percentage}% '
                '(${result.obtainedMarks}/${result.totalMarks})',
              ),
              const SizedBox(height: 6),
              Text('Status: ${result.resultStatus}'),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    Navigator.of(sheetContext).pop();
                    context.go('/quizzes');
                  },
                  child: const Text('Open quizzes'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
