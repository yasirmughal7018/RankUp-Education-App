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
    super.description,
    super.quizType,
    super.topic,
    super.curriculum,
    super.book,
    super.chapter,
    super.learningObjective,
    super.difficulty,
    super.totalMarks,
    super.timeLimitMinutes,
    super.attemptLimit,
    super.startAt,
    super.dueAt,
    super.completedAt,
    super.instructions,
    super.navigationMode,
    super.answersCanBeChanged,
    super.hintsAllowed,
    super.reviewAvailable,
    super.resultStatus,
    super.resultPercent,
    super.createdBy,
    super.schoolName,
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
      description: _readString(json, ['description']),
      quizType: _readString(
        json,
        ['quizType', 'type'],
        fallback: 'Practice Quiz',
      ),
      topic: _readString(json, ['topic', 'topicName']),
      curriculum: _readString(json, ['curriculum']),
      book: _readString(json, ['book', 'bookName']),
      chapter: _readString(json, ['chapter', 'chapterName']),
      learningObjective: _readString(json, ['learningObjective']),
      difficulty: _readString(json, ['difficulty'], fallback: 'Medium'),
      totalMarks: _readInt(json, ['totalMarks', 'marks']),
      timeLimitMinutes: _readNullableInt(json, ['timeLimitMinutes']),
      attemptLimit: _readInt(
        json,
        ['attemptLimit', 'numberOfAttempts'],
        fallback: 1,
      ),
      startAt: _readDate(json, ['startAt', 'startDate']),
      dueAt: _readDate(json, ['dueAt', 'endAt', 'deadline']),
      completedAt: _readDate(json, ['completedAt', 'submittedAt']),
      instructions: _readStringList(json, ['instructions']),
      navigationMode: _readString(
        json,
        ['navigationMode'],
        fallback: 'Free Navigation',
      ),
      answersCanBeChanged:
          _readBool(json, ['answersCanBeChanged'], defaultValue: true),
      hintsAllowed: _readBool(json, ['hintsAllowed']),
      reviewAvailable: _readBool(json, ['reviewAvailable'], defaultValue: true),
      resultStatus:
          _readString(json, ['resultStatus'], fallback: 'Not Started'),
      resultPercent: _readNullableInt(json, ['resultPercent']),
      createdBy: _readString(json, ['createdBy']),
      schoolName: _readString(json, ['schoolName', 'school', 'campusName']),
    );
  }
}

String _readString(
  Map<String, dynamic> json,
  List<String> keys, {
  String fallback = '',
}) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.isNotEmpty) {
      return value;
    }
  }

  return fallback;
}

int _readInt(
  Map<String, dynamic> json,
  List<String> keys, {
  int fallback = 0,
}) {
  for (final key in keys) {
    final value = json[key];
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
  }

  return fallback;
}

int? _readNullableInt(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
  }

  return null;
}

bool _readBool(
  Map<String, dynamic> json,
  List<String> keys, {
  bool defaultValue = false,
}) {
  for (final key in keys) {
    final value = json[key];
    if (value is bool) {
      return value;
    }
  }

  return defaultValue;
}

List<String> _readStringList(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is List) {
      return value.whereType<String>().toList();
    }
  }

  return const [];
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
