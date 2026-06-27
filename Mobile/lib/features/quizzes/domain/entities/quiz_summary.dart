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
  final List<String> instructions;
  final String navigationMode;
  final bool answersCanBeChanged;
  final bool hintsAllowed;
  final bool reviewAvailable;
  final String resultStatus;
  final int? resultPercent;
  final String createdBy;
  final String schoolName;
}
