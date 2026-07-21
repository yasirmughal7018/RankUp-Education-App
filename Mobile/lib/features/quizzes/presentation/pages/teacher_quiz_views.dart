import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/presentation/controllers/quizzes_controller.dart';

/// Teacher-facing quiz list with search and status filters.
class TeacherQuizListView extends StatelessWidget {
  const TeacherQuizListView({
    required this.state,
    required this.searchController,
    required this.onSearch,
    required this.onRefresh,
    required this.onOpenQuiz,
    super.key,
  });

  final QuizzesState state;
  final TextEditingController searchController;
  final VoidCallback onSearch;
  final Future<void> Function() onRefresh;
  final ValueChanged<QuizSummary> onOpenQuiz;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          TextField(
            controller: searchController,
            decoration: InputDecoration(
              hintText: 'Search quizzes',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                tooltip: 'Search',
                onPressed: onSearch,
                icon: const Icon(Icons.arrow_forward),
              ),
            ),
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => onSearch(),
          ),
          const SizedBox(height: 16),
          if (state.isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ),
            )
          else if (state.errorMessage != null)
            AppEmptyState(
              icon: Icons.error_outline,
              title: 'Could not load quizzes',
              message: state.errorMessage!,
            )
          else if (state.quizzes.isEmpty)
            const AppEmptyState(
              icon: Icons.assignment_outlined,
              title: 'No quizzes yet',
              message: 'Quizzes you create or manage will appear here.',
            )
          else
            for (final quiz in state.quizzes) ...[
              Card(
                child: ListTile(
                  leading: const Icon(Icons.assignment_outlined),
                  title: Text(quiz.title),
                  subtitle: Text(
                    '${quiz.subject} · ${quiz.grade} · ${quiz.questionCount} questions',
                  ),
                  trailing: Chip(
                    label: Text(quiz.status.label),
                    visualDensity: VisualDensity.compact,
                  ),
                  onTap: () => onOpenQuiz(quiz),
                ),
              ),
              const SizedBox(height: 8),
            ],
        ],
      ),
    );
  }
}

/// Teacher read-only quiz detail panel.
class TeacherQuizDetailsView extends StatelessWidget {
  const TeacherQuizDetailsView({
    required this.quiz,
    required this.isLoading,
    required this.onBack,
    super.key,
  });

  final QuizSummary quiz;
  final bool isLoading;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final description = quiz.description.trim();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  quiz.title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Chip(label: Text(quiz.status.label)),
                    Chip(label: Text('${quiz.questionCount} questions')),
                    Chip(label: Text('${quiz.totalMarks} marks')),
                    if (quiz.subject.isNotEmpty) Chip(label: Text(quiz.subject)),
                    if (quiz.grade.isNotEmpty) Chip(label: Text(quiz.grade)),
                  ],
                ),
                if (description.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(description),
                ],
                const SizedBox(height: 16),
                Text(
                  'Create, edit, assign, and from-bank attach are available on web for this MVP.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: onBack,
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Back to list'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
