import 'package:rankup_education/features/quizzes/domain/entities/quiz_attempt.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';

/// Loads, starts, drafts, and submits student quiz attempts.
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
    bool instructionsAcknowledged = false,
  });

  Future<void> saveDraft({
    required String quizId,
    required String attemptId,
    required List<QuizAnswerSubmission> answers,
    int? timeSpentSeconds,
    int? focusLossDelta,
    int? clipboardPasteDelta,
    String? deviceId,
  });

  Future<QuizAttemptResult> submitAttempt({
    required String quizId,
    required String attemptId,
    required List<QuizAnswerSubmission> answers,
    required int timeSpentSeconds,
    bool isAutoSubmit = false,
    String? deviceId,
  });

  Future<QuizAttemptResult> getAttemptResult({
    required String quizId,
    required String attemptId,
  });

  /// Replays a queued offline draft or submit (`POST .../sync`).
  Future<OfflineQuizSyncResult> syncOfflineAttempt({
    required String quizId,
    required String attemptId,
    required String clientSyncId,
    required List<QuizAnswerSubmission> answers,
    required int timeSpentSeconds,
    required String deviceId,
    bool submit = false,
    bool isAutoSubmit = false,
    int? focusLossDelta,
    int? clipboardPasteDelta,
  });
}

/// Result of [QuizRepository.syncOfflineAttempt].
class OfflineQuizSyncResult {
  const OfflineQuizSyncResult({
    required this.attemptId,
    required this.alreadySynced,
    required this.submitted,
    required this.clientSyncId,
    this.result,
  });

  final String attemptId;
  final bool alreadySynced;
  final bool submitted;
  final String clientSyncId;
  final QuizAttemptResult? result;
}

/// Answer payload sent when saving or submitting an attempt.
class QuizAnswerSubmission {
  const QuizAnswerSubmission({
    required this.questionId,
    this.selectedOptionId,
    this.selectedOptionIds,
    this.submittedText,
    this.isMarkedForReview,
    this.timeSpentSeconds,
  });

  final String questionId;
  final String? selectedOptionId;
  final List<String>? selectedOptionIds;
  final String? submittedText;
  final bool? isMarkedForReview;
  final int? timeSpentSeconds;
}
