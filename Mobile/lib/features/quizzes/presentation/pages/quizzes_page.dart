import 'package:flutter/material.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_summary.dart';

class QuizzesPage extends StatelessWidget {
  const QuizzesPage({super.key});

  static const _quizzes = [
    QuizSummary(
      id: 'quiz-1',
      title: 'Fractions Practice',
      subject: 'Math',
      grade: 'Grade 7',
      questionCount: 15,
      points: 120,
    ),
    QuizSummary(
      id: 'quiz-2',
      title: 'Grammar Builder',
      subject: 'English',
      grade: 'Grade 7',
      questionCount: 12,
      points: 90,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quizzes')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemBuilder: (context, index) {
          final quiz = _quizzes[index];
          return Card(
            child: ListTile(
              leading: const Icon(Icons.quiz_outlined),
              title: Text(quiz.title),
              subtitle: Text(
                '${quiz.subject} • ${quiz.grade} • ${quiz.questionCount} questions',
              ),
              trailing: Text('${quiz.points} pts'),
            ),
          );
        },
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemCount: _quizzes.length,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        icon: const Icon(Icons.auto_awesome),
        label: const Text('AI Quiz'),
      ),
    );
  }
}
