import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';
import 'package:rankup_education/features/questions/data/models/question_summary_model.dart';
import 'package:rankup_education/features/questions/presentation/providers/question_providers.dart';

/// Question-bank browse screen for roles allowed by [canManageQuestions].
///
/// Students are blocked (they only see questions inside quizzes). This page
/// lists summaries from [questionsListProvider] and marks “quiz ready” when
/// [QuestionSummaryModel.isActive] and [QuestionSummaryModel.approvedBy] are set.
///
/// **Approval / visibility note:** Mobile still treats approval as binary
/// (`approvedBy` present). WebApi now uses 3-tier visibility (`Campus` /
/// `School` / `Public`) with optional `schoolId` / `campusId` on each summary —
/// those fields are parsed on the model but not yet shown or filtered here.
/// AI approve remains a PortalAdmin-oriented API action; human approve sets the
/// visibility tier from the approver’s role.
class QuestionsPage extends ConsumerWidget {
  const QuestionsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final role = user?.role;

    if (role == null || !canManageQuestions(role)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Question Bank')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_outline, size: 48),
                const SizedBox(height: 16),
                Text(
                  'Access restricted',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'The question bank is for teachers and admins. '
                  'Students answer questions inside quizzes only.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () {
                    if (role != null) {
                      context.go(_dashboardPath(role));
                    } else {
                      context.go('/login');
                    }
                  },
                  child: const Text('Back to dashboard'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final async = ref.watch(questionsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Question Bank'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(questionsListProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(error.toString(), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(questionsListProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (questions) {
          if (questions.isEmpty) {
            return const AppEmptyState(
              icon: Icons.quiz_outlined,
              title: 'No questions yet',
              message: 'Approved and pending bank questions will appear here.',
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(questionsListProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: questions.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                return _QuestionCard(question: questions[index]);
              },
            ),
          );
        },
      ),
    );
  }
}

/// Single bank question row: type, marks, approval, and status chip.
class _QuestionCard extends StatelessWidget {
  const _QuestionCard({required this.question});

  final QuestionSummaryModel question;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Binary approval signal until UI consumes visibility / schoolId / campusId.
    final approved =
        question.approvedBy != null && question.approvedBy!.isNotEmpty;
    final quizReady = question.isActive && approved;

    return Card(
      child: ListTile(
        leading: Icon(
          question.isActive ? Icons.quiz_outlined : Icons.block_outlined,
        ),
        title: Text(
          question.text,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          [
            question.questionType,
            '${question.marks} marks',
            if (approved) 'Approved',
            if (quizReady) 'Quiz ready',
          ].join(' · '),
        ),
        trailing: Chip(
          label: Text(question.status),
          visualDensity: VisualDensity.compact,
          labelStyle: theme.textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

/// Home route for the signed-in role after leaving a restricted bank view.
String _dashboardPath(UserRole role) {
  return switch (role) {
    UserRole.student => '/student',
    UserRole.parent => '/parent',
    UserRole.teacher => '/teacher',
    UserRole.schoolAdmin ||
    UserRole.campusAdmin ||
    UserRole.portalAdmin =>
      '/admin',
  };
}
