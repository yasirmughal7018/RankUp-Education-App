import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';

class QuizSummary {
  const QuizSummary({
    required this.id,
    required this.title,
    required this.subject,
    required this.grade,
    required this.questionCount,
    required this.points,
    required this.status,
    this.dueAt,
  });

  final String id;
  final String title;
  final String subject;
  final String grade;
  final int questionCount;
  final int points;
  final QuizStatus status;
  final DateTime? dueAt;
}
