import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/rankings/data/models/student_ranking_models.dart';
import 'package:rankup_education/features/rankings/presentation/providers/rankings_providers.dart';

/// Student peer leaderboard from submitted quiz best percentages.
class RankingsPage extends ConsumerStatefulWidget {
  const RankingsPage({super.key});

  @override
  ConsumerState<RankingsPage> createState() => _RankingsPageState();
}

class _RankingsPageState extends ConsumerState<RankingsPage> {
  String _scope = 'class';

  @override
  Widget build(BuildContext context) {
    final rankingsAsync = ref.watch(studentRankingsProvider(_scope));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rankings'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(studentRankingsProvider(_scope)),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'class', label: Text('Class')),
                ButtonSegment(value: 'school', label: Text('School')),
              ],
              selected: {_scope},
              onSelectionChanged: (values) {
                setState(() => _scope = values.first);
              },
            ),
          ),
          Expanded(
            child: rankingsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => _ErrorBody(
                message: error is AppException
                    ? error.message
                    : 'Unable to load rankings.',
                onRetry: () =>
                    ref.invalidate(studentRankingsProvider(_scope)),
              ),
              data: (report) => RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(studentRankingsProvider(_scope));
                  await ref.read(studentRankingsProvider(_scope).future);
                },
                child: _RankingsBody(report: report),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RankingsBody extends StatelessWidget {
  const _RankingsBody({required this.report});

  final StudentRankingReportModel report;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor:
                      theme.colorScheme.primary.withValues(alpha: 0.12),
                  child: Icon(
                    Icons.emoji_events_outlined,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        report.title,
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        report.myRank != null
                            ? 'Your rank #${report.myRank}'
                            : 'No submitted quizzes yet',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        report.myBestPercentage != null
                            ? 'Best score ${report.myBestPercentage}% · ${report.myAttemptCount} attempt(s)'
                            : 'Submit a quiz to appear on the board.',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Leaderboard',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        if (report.items.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'When classmates submit quizzes, their best scores will show here.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          )
        else
          for (final item in report.items) ...[
            Card(
              color: item.studentId == report.viewerStudentId
                  ? theme.colorScheme.primary.withValues(alpha: 0.08)
                  : null,
              child: ListTile(
                leading: CircleAvatar(child: Text('#${item.rank}')),
                title: Text(
                  item.studentId == report.viewerStudentId
                      ? '${item.studentName} (You)'
                      : item.studentName,
                ),
                subtitle: Text('${item.attemptCount} attempt(s)'),
                trailing: Text(
                  '${item.bestPercentage}%',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
      ],
    );
  }
}

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
