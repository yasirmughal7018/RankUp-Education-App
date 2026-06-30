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
    this.description = '',
    this.quizType = 'Practice Quiz',
    this.topic = '',
    this.curriculum = '',
    this.book = '',
    this.chapter = '',
    this.learningObjective = '',
    this.difficulty = 'Medium',
    this.totalMarks = 0,
    this.timeLimitMinutes,
    this.attemptLimit = 1,
    this.startAt,
    this.dueAt,
    this.completedAt,
    this.instructions = const [],
    this.navigationMode = 'Free Navigation',
    this.answersCanBeChanged = true,
    this.hintsAllowed = false,
    this.reviewAvailable = true,
    this.resultStatus = 'Not Started',
    this.resultPercent,
    this.createdBy = '',
    this.schoolName = '',
  });

  final String id;
  final String title;
  final String subject;
  final String grade;
  final int questionCount;
  final int points;
  final QuizStatus status;
  final String description;
  final String quizType;
  final String topic;
  final String curriculum;
  final String book;
  final String chapter;
  final String learningObjective;
  final String difficulty;
  final int totalMarks;
  final int? timeLimitMinutes;
  final int attemptLimit;
  final DateTime? startAt;
  final DateTime? dueAt;
  final DateTime? completedAt;
  final List<String> instructions;
  final String navigationMode;
  final bool answersCanBeChanged;
  final bool hintsAllowed;
  final bool reviewAvailable;
  final String resultStatus;
  final int? resultPercent;
  final String createdBy;
  final String schoolName;

  QuizSummary copyWith({
    String? id,
    String? title,
    String? subject,
    String? grade,
    int? questionCount,
    int? points,
    QuizStatus? status,
    String? description,
    String? quizType,
    String? topic,
    String? curriculum,
    String? book,
    String? chapter,
    String? learningObjective,
    String? difficulty,
    int? totalMarks,
    int? timeLimitMinutes,
    int? attemptLimit,
    DateTime? startAt,
    DateTime? dueAt,
    DateTime? completedAt,
    List<String>? instructions,
    String? navigationMode,
    bool? answersCanBeChanged,
    bool? hintsAllowed,
    bool? reviewAvailable,
    String? resultStatus,
    int? resultPercent,
    String? createdBy,
    String? schoolName,
  }) {
    return QuizSummary(
      id: id ?? this.id,
      title: title ?? this.title,
      subject: subject ?? this.subject,
      grade: grade ?? this.grade,
      questionCount: questionCount ?? this.questionCount,
      points: points ?? this.points,
      status: status ?? this.status,
      description: description ?? this.description,
      quizType: quizType ?? this.quizType,
      topic: topic ?? this.topic,
      curriculum: curriculum ?? this.curriculum,
      book: book ?? this.book,
      chapter: chapter ?? this.chapter,
      learningObjective: learningObjective ?? this.learningObjective,
      difficulty: difficulty ?? this.difficulty,
      totalMarks: totalMarks ?? this.totalMarks,
      timeLimitMinutes: timeLimitMinutes ?? this.timeLimitMinutes,
      attemptLimit: attemptLimit ?? this.attemptLimit,
      startAt: startAt ?? this.startAt,
      dueAt: dueAt ?? this.dueAt,
      completedAt: completedAt ?? this.completedAt,
      instructions: instructions ?? this.instructions,
      navigationMode: navigationMode ?? this.navigationMode,
      answersCanBeChanged: answersCanBeChanged ?? this.answersCanBeChanged,
      hintsAllowed: hintsAllowed ?? this.hintsAllowed,
      reviewAvailable: reviewAvailable ?? this.reviewAvailable,
      resultStatus: resultStatus ?? this.resultStatus,
      resultPercent: resultPercent ?? this.resultPercent,
      createdBy: createdBy ?? this.createdBy,
      schoolName: schoolName ?? this.schoolName,
    );
  }
}
