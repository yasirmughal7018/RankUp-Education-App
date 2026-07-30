import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_manage_models.dart';
import 'package:rankup_education/features/quizzes/presentation/providers/quiz_providers.dart';

class QuizMonitoringPage extends ConsumerStatefulWidget {
  const QuizMonitoringPage({required this.quizId, super.key});

  final String quizId;

  @override
  ConsumerState<QuizMonitoringPage> createState() => _QuizMonitoringPageState();
}

class _QuizMonitoringPageState extends ConsumerState<QuizMonitoringPage> {
  late Future<QuizMonitoringSnapshot?> _snapshot;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _snapshot = ref
        .read(teacherQuizManageControllerProvider.notifier)
        .loadMonitoring(widget.quizId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quiz monitoring')),
      body: FutureBuilder<QuizMonitoringSnapshot?>(
        future: _snapshot,
        builder: (context, async) {
          if (async.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (async.hasError) {
            return Center(child: Text(async.error.toString()));
          }
          final snapshot = async.data;
          if (snapshot == null) {
            return const Center(child: Text('Monitoring is unavailable.'));
          }
          return RefreshIndicator(
            onRefresh: () async {
              setState(_reload);
              await _snapshot;
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  snapshot.quizTitle,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Chip(label: Text('${snapshot.totalStudents} students')),
                    Chip(label: Text('${snapshot.submittedCount} submitted')),
                    Chip(
                      label: Text(
                        '${snapshot.pendingReviewCount} pending review',
                      ),
                    ),
                    Chip(label: Text('${snapshot.reviewedCount} reviewed')),
                  ],
                ),
                const SizedBox(height: 16),
                for (final student in snapshot.students)
                  Card(
                    child: ListTile(
                      title: Text(student.studentName),
                      subtitle: Text(
                        '${student.status} · ${student.attemptCount} attempts'
                        '${student.bestPercentage == null ? '' : ' · best ${student.bestPercentage}%'}',
                      ),
                      trailing: student.isReviewDone
                          ? const Icon(Icons.check_circle_outline)
                          : null,
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
