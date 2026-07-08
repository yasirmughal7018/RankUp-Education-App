import 'package:rankup_education/features/quizzes/domain/entities/quiz_attempt.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';

abstract class QuizRepository {
  Future<List<QuizSummary>> getQuizzes({
    String? search,
    String? subject,
    String? grade,
  });

  Future<QuizDetail> getQuizDetail(String quizId);

  Future<QuizAttemptSession> startAttempt({
    required String quizId,
    required String deviceId,
  });

  Future<void> saveDraft({
    required String quizId,
    required String attemptId,
    required List<QuizAnswerSubmission> answers,
    int? timeSpentSeconds,
  });

  Future<QuizAttemptResult> submitAttempt({
    required String quizId,
    required String attemptId,
    required List<QuizAnswerSubmission> answers,
    required int timeSpentSeconds,
  });

  Future<QuizAttemptResult> getAttemptResult({
    required String quizId,
    required String attemptId,
  });
}

class QuizAnswerSubmission {
  const QuizAnswerSubmission({
    required this.questionId,
    this.selectedOptionId,
    this.selectedOptionIds,
    this.submittedText,
  });

  final String questionId;
  final String? selectedOptionId;
  final List<String>? selectedOptionIds;
  final String? submittedText;
}
