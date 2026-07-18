import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';

class QuizOption {
  const QuizOption({
    required this.id,
    required this.text,
    this.imageUrl,
  });

  final String id;
  final String text;
  final String? imageUrl;
}

class QuizQuestion {
  const QuizQuestion({
    required this.id,
    required this.text,
    required this.questionType,
    required this.marks,
    required this.displayOrder,
    this.hint,
    this.options = const [],
  });

  final String id;
  final String text;
  final String questionType;
  final int marks;
  final int displayOrder;
  final String? hint;
  final List<QuizOption> options;

  int get questionTypeId => questionTypeIdFromName(questionType);

  List<String> get optionLabels =>
      options.map((option) => option.text).toList(growable: false);
}

class QuizDetail extends QuizSummary {
  const QuizDetail({
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
    this.attemptsUsed = 0,
    this.shuffleQuestions = false,
    this.shuffleOptions = false,
  });

  factory QuizDetail.fromSummary(QuizSummary summary) {
    return QuizDetail(
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
      navigationMode: summary.navigationMode,
      answersCanBeChanged: summary.answersCanBeChanged,
      hintsAllowed: summary.hintsAllowed,
      reviewAvailable: summary.reviewAvailable,
      resultStatus: summary.resultStatus,
      resultPercent: summary.resultPercent,
      createdBy: summary.createdBy,
      schoolName: summary.schoolName,
    );
  }

  final int attemptsUsed;
  final bool shuffleQuestions;
  final bool shuffleOptions;
}

class SavedQuizAnswer {
  const SavedQuizAnswer({
    required this.questionId,
    this.selectedOptionId,
    this.selectedOptionIds = const [],
    this.submittedText,
  });

  final String questionId;
  final String? selectedOptionId;
  final List<String> selectedOptionIds;
  final String? submittedText;
}

class QuizAttemptSession {
  const QuizAttemptSession({
    required this.attemptId,
    required this.quizId,
    required this.attemptNumber,
    required this.startedAt,
    required this.questions,
    this.timeLimitMinutes,
    this.resumed = false,
    this.savedAnswers = const [],
  });

  final String attemptId;
  final String quizId;
  final int attemptNumber;
  final DateTime startedAt;
  final List<QuizQuestion> questions;
  final int? timeLimitMinutes;
  final bool resumed;
  final List<SavedQuizAnswer> savedAnswers;
}

class QuizResultQuestion {
  const QuizResultQuestion({
    required this.id,
    required this.text,
    required this.marks,
    required this.awardedMarks,
    required this.isCorrect,
    this.explanation,
    this.selectedOptionId,
    this.correctOptionId,
    this.submittedText,
  });

  final String id;
  final String text;
  final int marks;
  final int awardedMarks;
  final bool isCorrect;
  final String? explanation;
  final String? selectedOptionId;
  final String? correctOptionId;
  final String? submittedText;
}

class QuizAttemptResult {
  const QuizAttemptResult({
    required this.attemptId,
    required this.quizId,
    required this.quizTitle,
    required this.attemptNumber,
    required this.totalMarks,
    required this.obtainedMarks,
    required this.percentage,
    required this.timeSpentSeconds,
    required this.resultStatus,
    required this.reviewAvailable,
    required this.questions,
  });

  final String attemptId;
  final String quizId;
  final String quizTitle;
  final int attemptNumber;
  final int totalMarks;
  final int obtainedMarks;
  final int percentage;
  final int timeSpentSeconds;
  final String resultStatus;
  final bool reviewAvailable;
  final List<QuizResultQuestion> questions;
}

int questionTypeIdFromName(String questionType) {
  final normalized = questionType.toLowerCase().replaceAll(' ', '');

  if (normalized.contains('multiple')) {
    return 41;
  }
  if (normalized.contains('true') || normalized.contains('false')) {
    return 42;
  }
  if (normalized.contains('fill')) {
    return 43;
  }
  if (normalized.contains('descriptive') ||
      normalized.contains('shortanswer') ||
      normalized.contains('short')) {
    return 44;
  }

  return 40;
}
