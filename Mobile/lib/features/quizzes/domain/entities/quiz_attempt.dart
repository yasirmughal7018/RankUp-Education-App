import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';

/// Selectable answer choice within a quiz question.
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

/// Single question payload for an in-progress or review attempt.
class QuizQuestion {
  const QuizQuestion({
    required this.id,
    required this.text,
    required this.questionType,
    required this.marks,
    required this.displayOrder,
    this.hint,
    this.options = const [],
    this.estimatedTimeSeconds = 0,
    this.timeSpentSeconds = 0,
  });

  final String id;
  final String text;
  final String questionType;
  final int marks;
  final int displayOrder;
  final String? hint;
  final List<QuizOption> options;
  final int estimatedTimeSeconds;
  final int timeSpentSeconds;

  int get questionTypeId => questionTypeIdFromName(questionType);

  List<String> get optionLabels =>
      options.map((option) => option.text).toList(growable: false);
}

/// Full quiz metadata plus question list for attempt and review flows.
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

/// Locally cached answer draft before submit or sync.
class SavedQuizAnswer {
  const SavedQuizAnswer({
    required this.questionId,
    this.selectedOptionId,
    this.selectedOptionIds = const [],
    this.submittedText,
    this.isMarkedForReview = false,
  });

  final String questionId;
  final String? selectedOptionId;
  final List<String> selectedOptionIds;
  final String? submittedText;
  final bool isMarkedForReview;
}

/// Server-issued attempt session with timing and draft answers.
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
    this.navigationMode = 'Free',
    this.enforceDeviceLock = false,
    this.focusLossCount = 0,
    this.clipboardPasteCount = 0,
    this.enablePerQuestionTimer = false,
  });

  final String attemptId;
  final String quizId;
  final int attemptNumber;
  final DateTime startedAt;
  final List<QuizQuestion> questions;
  final int? timeLimitMinutes;
  final bool resumed;
  final List<SavedQuizAnswer> savedAnswers;
  final String navigationMode;
  final bool enforceDeviceLock;
  final int focusLossCount;
  final int clipboardPasteCount;
  final bool enablePerQuestionTimer;
}

/// Per-question grading breakdown after submission.
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

/// Final scored attempt returned after submit or result fetch.
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
      (normalized.contains('short') && !normalized.contains('file'))) {
    return 44;
  }
  if (normalized.contains('file')) {
    return 45;
  }
  if (normalized == 'matching' || normalized == 'match') {
    return 46;
  }
  if (normalized == 'ordering' ||
      normalized == 'order' ||
      normalized == 'sequence') {
    return 47;
  }
  if (normalized.contains('media') || normalized.contains('imagechoice')) {
    return 48;
  }

  return 40;
}
