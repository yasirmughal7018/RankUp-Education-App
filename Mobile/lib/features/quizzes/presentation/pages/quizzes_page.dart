import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/presentation/providers/quiz_providers.dart';

class QuizzesPage extends ConsumerStatefulWidget {
  const QuizzesPage({super.key});

  @override
  ConsumerState<QuizzesPage> createState() => _QuizzesPageState();
}

class _QuizzesPageState extends ConsumerState<QuizzesPage> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() {
      return ref.read(quizzesControllerProvider.notifier).load();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(quizzesControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Quizzes')),
      body: RefreshIndicator(
        onRefresh: () {
          return ref
              .read(quizzesControllerProvider.notifier)
              .load(search: _searchController.text.trim());
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                labelText: 'Search quizzes',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  tooltip: 'Search',
                  onPressed: _search,
                  icon: const Icon(Icons.arrow_forward),
                ),
              ),
              onSubmitted: (_) => _search(),
            ),
            const SizedBox(height: 16),
            if (state.isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (state.errorMessage != null)
              _ErrorPanel(
                message: state.errorMessage!,
                onRetry: () => ref
                    .read(quizzesControllerProvider.notifier)
                    .load(search: state.search),
              )
            else if (state.quizzes.isEmpty)
              const AppEmptyState(
                icon: Icons.quiz_outlined,
                title: 'No quizzes found',
                message: 'Try another search or check back after assignments.',
              )
            else
              for (final quiz in state.quizzes) ...[
                _QuizCard(quiz: quiz),
                const SizedBox(height: 12),
              ],
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        icon: const Icon(Icons.auto_awesome),
        label: const Text('AI Quiz'),
      ),
    );
  }

  void _search() {
    ref
        .read(quizzesControllerProvider.notifier)
        .load(search: _searchController.text.trim());
  }
}

class _QuizCard extends StatelessWidget {
  const _QuizCard({required this.quiz});

  final QuizSummary quiz;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: ListTile(
        leading: const Icon(Icons.quiz_outlined),
        title: Text(quiz.title),
        subtitle: Text(
          '${quiz.subject} • ${quiz.grade} • ${quiz.questionCount} questions',
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text('${quiz.points} pts', style: theme.textTheme.labelLarge),
            Text(quiz.status.label, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(Icons.error_outline, color: theme.colorScheme.error),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
