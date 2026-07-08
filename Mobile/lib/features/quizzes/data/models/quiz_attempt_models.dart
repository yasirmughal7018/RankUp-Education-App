import 'package:rankup_education/features/quizzes/data/models/quiz_summary_model.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_attempt.dart';

class QuizDetailModel extends QuizDetail {
  const QuizDetailModel({
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
    super.attemptsUsed,
    super.shuffleQuestions,
    super.shuffleOptions,
  });

  factory QuizDetailModel.fromJson(Map<String, dynamic> json) {
    final summary = QuizSummaryModel.fromJson(json);
    return QuizDetailModel(
      id: summary.id,
      title: summary.title,
      subject: summary.subject,
      grade: summary.grade,
      questionCount: summary.questionCount,
      points: summary.points,
      status: summary.status,
      description: summary.description,
      quizType: summary.quizType,
      topic: summary.topic,
      difficulty: summary.difficulty,
      totalMarks: summary.totalMarks,
      timeLimitMinutes: summary.timeLimitMinutes,
      attemptLimit: summary.attemptLimit,
      startAt: summary.startAt,
      dueAt: summary.dueAt,
      completedAt: summary.completedAt,
      instructions: summary.instructions,
      navigationMode: _readBool(json, ['shuffleQuestions'])
          ? 'Locked Navigation'
          : summary.navigationMode,
      answersCanBeChanged: !_readBool(json, ['shuffleQuestions']),
      hintsAllowed: summary.hintsAllowed,
      reviewAvailable: summary.reviewAvailable,
      resultStatus: summary.resultStatus,
      resultPercent: summary.resultPercent,
      createdBy: summary.createdBy,
      schoolName: summary.schoolName,
      attemptsUsed: _readInt(json, ['attemptsUsed']),
      shuffleQuestions: _readBool(json, ['shuffleQuestions']),
      shuffleOptions: _readBool(json, ['shuffleOptions']),
    );
  }
}

class QuizQuestionModel extends QuizQuestion {
  const QuizQuestionModel({
    required super.id,
    required super.text,
    required super.questionType,
    required super.marks,
    required super.displayOrder,
    super.hint,
    super.options,
  });

  factory QuizQuestionModel.fromJson(Map<String, dynamic> json) {
    final options = json['options'];
    return QuizQuestionModel(
      id: _readString(json, ['id', 'questionId']),
      text: _readString(json, ['text', 'questionText']),
      questionType: _readString(json, ['questionType', 'type'], fallback: 'MCQ'),
      marks: _readInt(json, ['marks']),
      displayOrder: _readInt(json, ['displayOrder'], fallback: 1),
      hint: _readNullableString(json, ['hint']),
      options: options is List
          ? options
              .whereType<Map<String, dynamic>>()
              .map(QuizOptionModel.fromJson)
              .toList()
          : const [],
    );
  }
}

class QuizOptionModel extends QuizOption {
  const QuizOptionModel({
    required super.id,
    required super.text,
    super.imageUrl,
  });

  factory QuizOptionModel.fromJson(Map<String, dynamic> json) {
    return QuizOptionModel(
      id: _readString(json, ['id', 'optionId']),
      text: _readString(json, ['text', 'optionText']),
      imageUrl: _readNullableString(json, ['imageUrl']),
    );
  }
}

class SavedQuizAnswerModel extends SavedQuizAnswer {
  const SavedQuizAnswerModel({
    required super.questionId,
    super.selectedOptionId,
    super.selectedOptionIds,
    super.submittedText,
  });

  factory SavedQuizAnswerModel.fromJson(Map<String, dynamic> json) {
    final selectedOptionIds = json['selectedOptionIds'];
    final parsedIds = selectedOptionIds is List
        ? selectedOptionIds
            .map((value) => value?.toString() ?? '')
            .where((value) => value.isNotEmpty)
            .toList(growable: false)
        : const <String>[];
    final singleId = _readNullableString(json, ['selectedOptionId']);

    return SavedQuizAnswerModel(
      questionId: _readString(json, ['questionId', 'id']),
      selectedOptionId: singleId,
      selectedOptionIds: parsedIds.isNotEmpty
          ? parsedIds
          : (singleId == null ? const <String>[] : <String>[singleId]),
      submittedText: _readNullableString(json, ['submittedText']),
    );
  }
}

class QuizAttemptSessionModel extends QuizAttemptSession {
  const QuizAttemptSessionModel({
    required super.attemptId,
    required super.quizId,
    required super.attemptNumber,
    required super.startedAt,
    required super.questions,
    super.timeLimitMinutes,
    super.resumed,
    super.savedAnswers,
  });

  factory QuizAttemptSessionModel.fromJson(Map<String, dynamic> json) {
    final questions = json['questions'];
    final savedAnswers = json['savedAnswers'];
    return QuizAttemptSessionModel(
      attemptId: _readString(json, ['attemptId', 'id']),
      quizId: _readString(json, ['quizId']),
      attemptNumber: _readInt(json, ['attemptNumber'], fallback: 1),
      startedAt: _readDate(json, ['startedAt']) ?? DateTime.now(),
      timeLimitMinutes: _readNullableInt(json, ['timeLimitMinutes']),
      resumed: _readBool(json, ['resumed']),
      questions: questions is List
          ? questions
              .whereType<Map<String, dynamic>>()
              .map(QuizQuestionModel.fromJson)
              .toList()
          : const [],
      savedAnswers: savedAnswers is List
          ? savedAnswers
              .whereType<Map<String, dynamic>>()
              .map(SavedQuizAnswerModel.fromJson)
              .toList()
          : const [],
    );
  }
}

class QuizAttemptResultModel extends QuizAttemptResult {
  const QuizAttemptResultModel({
    required super.attemptId,
    required super.quizId,
    required super.quizTitle,
    required super.attemptNumber,
    required super.totalMarks,
    required super.obtainedMarks,
    required super.percentage,
    required super.timeSpentSeconds,
    required super.resultStatus,
    required super.reviewAvailable,
    required super.questions,
  });

  factory QuizAttemptResultModel.fromJson(Map<String, dynamic> json) {
    final questions = json['questions'];
    return QuizAttemptResultModel(
      attemptId: _readString(json, ['attemptId', 'id']),
      quizId: _readString(json, ['quizId']),
      quizTitle: _readString(json, ['quizTitle', 'title']),
      attemptNumber: _readInt(json, ['attemptNumber'], fallback: 1),
      totalMarks: _readInt(json, ['totalMarks']),
      obtainedMarks: _readInt(json, ['obtainedMarks']),
      percentage: _readInt(json, ['percentage']),
      timeSpentSeconds: _readInt(json, ['timeSpentSeconds']),
      resultStatus: _readString(json, ['resultStatus'], fallback: 'Submitted'),
      reviewAvailable: _readBool(json, ['reviewAvailable'], defaultValue: true),
      questions: questions is List
          ? questions
              .whereType<Map<String, dynamic>>()
              .map(QuizResultQuestionModel.fromJson)
              .toList()
          : const [],
    );
  }
}

class QuizResultQuestionModel extends QuizResultQuestion {
  const QuizResultQuestionModel({
    required super.id,
    required super.text,
    required super.marks,
    required super.awardedMarks,
    required super.isCorrect,
    super.explanation,
    super.selectedOptionId,
    super.correctOptionId,
    super.submittedText,
  });

  factory QuizResultQuestionModel.fromJson(Map<String, dynamic> json) {
    return QuizResultQuestionModel(
      id: _readString(json, ['id', 'questionId']),
      text: _readString(json, ['text', 'questionText']),
      marks: _readInt(json, ['marks']),
      awardedMarks: _readInt(json, ['awardedMarks']),
      isCorrect: _readBool(json, ['isCorrect']),
      explanation: _readNullableString(json, ['explanation']),
      selectedOptionId: _readNullableString(json, ['selectedOptionId']),
      correctOptionId: _readNullableString(json, ['correctOptionId']),
      submittedText: _readNullableString(json, ['submittedText']),
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
    if (value is num) {
      return value.toString();
    }
  }

  return fallback;
}

String? _readNullableString(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.isNotEmpty) {
      return value;
    }
  }

  return null;
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

DateTime? _readDate(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
  }

  return null;
}
