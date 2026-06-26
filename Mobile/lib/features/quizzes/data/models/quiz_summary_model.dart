import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';

class QuizSummaryModel extends QuizSummary {
  const QuizSummaryModel({
    required super.id,
    required super.title,
    required super.subject,
    required super.grade,
    required super.questionCount,
    required super.points,
    required super.status,
    super.dueAt,
  });

  factory QuizSummaryModel.fromJson(Map<String, dynamic> json) {
    return QuizSummaryModel(
      id: _readString(json, ['id', 'quizId']),
      title: _readString(json, ['title', 'name']),
      subject: _readString(json, ['subject', 'subjectName']),
      grade: _readString(json, ['grade', 'gradeName']),
      questionCount: _readInt(json, ['questionCount', 'questionsCount']),
      points: _readInt(json, ['points', 'totalPoints']),
      status: parseQuizStatus(_readString(json, ['status'])),
      dueAt: _readDate(json, ['dueAt', 'endAt', 'deadline']),
    );
  }
}

String _readString(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.isNotEmpty) {
      return value;
    }
  }

  return '';
}

int _readInt(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
  }

  return 0;
}

DateTime? _readDate(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
  }

  return null;
}
