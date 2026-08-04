import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';
import 'package:rankup_education/features/quizzes/presentation/providers/quiz_providers.dart';
import 'package:rankup_education/features/reports/data/models/student_quiz_history_models.dart';
import 'package:rankup_education/features/reports/presentation/providers/report_providers.dart';

/// Role-aware reports hub.
///
/// Students get History self via `GET /reports/students/{id}/quiz-history`.
/// Other roles keep the placeholder until full analytics ship on mobile.
class ReportsPage extends ConsumerWidget {
  const ReportsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authControllerProvider).user?.role;
    if (role == UserRole.student) {
      return const _StudentQuizHistoryPage();
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Card(
            child: ListTile(
              leading: Icon(Icons.assessment_outlined),
              title: Text('Monthly progress report'),
              subtitle: Text('Performance, rank history, and weak topics'),
            ),
          ),
          SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: Icon(Icons.ios_share_outlined),
              title: Text('Share secure report'),
              subtitle: Text('Generate a private link or QR code'),
            ),
          ),
        ],
      ),
    );
  }
}

class _StudentQuizHistoryPage extends ConsumerWidget {
  const _StudentQuizHistoryPage();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(studentQuizHistoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My quiz history'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(studentQuizHistoryProvider),
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
              onPressed: () => ref.invalidate(studentQuizHistoryProvider),
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
                message: 'Completed attempts will appear here.',
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(studentQuizHistoryProvider);
              await ref.read(studentQuizHistoryProvider.future);
            },
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: history.items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = history.items[index];
                return _HistoryReportCard(
                  item: item,
                  onOpenResult: item.attemptId == null
                      ? null
                      : () => _openResult(context, ref, item),
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

class _HistoryReportCard extends StatelessWidget {
  const _HistoryReportCard({
    required this.item,
    required this.onOpenResult,
  });

  final StudentQuizHistoryItemModel item;
  final VoidCallback? onOpenResult;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final submitted = item.lastSubmittedAt;
    final submittedLabel = submitted == null
        ? '—'
        : MaterialLocalizations.of(context).formatMediumDate(submitted);

    return Card(
      child: InkWell(
        onTap: onOpenResult,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      item.quizTitle,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Chip(
                    label: Text(item.resultStatus),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Attempts: ${item.attemptCount} · '
                'Best: ${item.bestPercentage ?? '—'}% · '
                'Submitted: $submittedLabel',
                style: theme.textTheme.bodyMedium,
              ),
              if (item.isReviewDone) ...[
                const SizedBox(height: 6),
                Text(
                  'Reviewed',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
              if (onOpenResult != null) ...[
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: onOpenResult,
                    icon: const Icon(Icons.open_in_new, size: 18),
                    label: const Text('View result'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
