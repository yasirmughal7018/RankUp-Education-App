/// Quiz history payload from `GET /reports/students/{id}/quiz-history`.
class StudentQuizHistoryModel {
  const StudentQuizHistoryModel({
    required this.studentId,
    required this.studentName,
    required this.items,
  });

  factory StudentQuizHistoryModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    final items = rawItems is List
        ? rawItems
            .whereType<Map<String, dynamic>>()
            .map(StudentQuizHistoryItemModel.fromJson)
            .toList()
        : const <StudentQuizHistoryItemModel>[];

    return StudentQuizHistoryModel(
      studentId: _readInt(json, ['studentId']),
      studentName: _readString(json, ['studentName']),
      items: items,
    );
  }

  final int studentId;
  final String studentName;
  final List<StudentQuizHistoryItemModel> items;
}

/// One quiz row in a student's attempt history.
class StudentQuizHistoryItemModel {
  const StudentQuizHistoryItemModel({
    required this.quizId,
    required this.quizTitle,
    required this.attemptId,
    required this.attemptCount,
    required this.bestPercentage,
    required this.resultStatus,
    required this.isReviewDone,
    required this.lastSubmittedAt,
  });

  factory StudentQuizHistoryItemModel.fromJson(Map<String, dynamic> json) {
    return StudentQuizHistoryItemModel(
      quizId: _readInt(json, ['quizId']),
      quizTitle: _readString(json, ['quizTitle', 'title']),
      attemptId: _readNullableInt(json, ['attemptId']),
      attemptCount: _readInt(json, ['attemptCount']),
      bestPercentage: _readNullableInt(json, ['bestPercentage']),
      resultStatus: _readString(json, ['resultStatus'], fallback: 'Unknown'),
      isReviewDone: _readBool(json, ['isReviewDone']),
      lastSubmittedAt: _readDate(json, ['lastSubmittedAt']),
    );
  }

  final int quizId;
  final String quizTitle;
  final int? attemptId;
  final int attemptCount;
  final int? bestPercentage;
  final String resultStatus;
  final bool isReviewDone;
  final DateTime? lastSubmittedAt;
}

String _readString(
  Map<String, dynamic> json,
  List<String> keys, {
  String fallback = '',
}) {
  for (final key in keys) {
    final value = json[key];
    if (value == null) {
      continue;
    }
    final text = value.toString().trim();
    if (text.isNotEmpty) {
      return text;
    }
  }
  return fallback;
}

int _readInt(Map<String, dynamic> json, List<String> keys, {int fallback = 0}) {
  return _readNullableInt(json, keys) ?? fallback;
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
    if (value is String) {
      final parsed = int.tryParse(value);
      if (parsed != null) {
        return parsed;
      }
    }
  }
  return null;
}

bool _readBool(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is bool) {
      return value;
    }
    if (value is String) {
      final normalized = value.trim().toLowerCase();
      if (normalized == 'true' || normalized == '1') {
        return true;
      }
      if (normalized == 'false' || normalized == '0') {
        return false;
      }
    }
    if (value is num) {
      return value != 0;
    }
  }
  return false;
}

DateTime? _readDate(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is DateTime) {
      return value;
    }
    if (value is String && value.trim().isNotEmpty) {
      return DateTime.tryParse(value);
    }
  }
  return null;
}
