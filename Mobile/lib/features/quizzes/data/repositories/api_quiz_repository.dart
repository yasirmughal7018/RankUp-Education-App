import 'package:rankup_education/features/quizzes/data/datasources/quiz_remote_datasource.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_attempt.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

/// Live API implementation of [QuizRepository].
class ApiQuizRepository implements QuizRepository {
  const ApiQuizRepository(this._remoteDataSource);

  final QuizRemoteDataSource _remoteDataSource;

  @override
  Future<List<QuizSummary>> getQuizzes({
    String? search,
    String? subject,
    String? grade,
  }) {
    return _remoteDataSource.getQuizzes(
      search: search,
      subject: subject,
      grade: grade,
    );
  }

  @override
  Future<QuizDetail> getQuizDetail(String quizId) {
    return _remoteDataSource.getQuizDetail(quizId);
  }

  @override
  Future<QuizAttemptSession> startAttempt({
    required String quizId,
    required String deviceId,
  }) {
    return _remoteDataSource.startAttempt(quizId: quizId, deviceId: deviceId);
  }

  @override
  Future<void> saveDraft({
    required String quizId,
    required String attemptId,
    required List<QuizAnswerSubmission> answers,
    int? timeSpentSeconds,
  }) {
    return _remoteDataSource.saveDraft(
      quizId: quizId,
      attemptId: attemptId,
      answers: answers,
      timeSpentSeconds: timeSpentSeconds,
    );
  }

  @override
  Future<QuizAttemptResult> submitAttempt({
    required String quizId,
    required String attemptId,
    required List<QuizAnswerSubmission> answers,
    required int timeSpentSeconds,
  }) {
    return _remoteDataSource.submitAttempt(
      quizId: quizId,
      attemptId: attemptId,
      answers: answers,
      timeSpentSeconds: timeSpentSeconds,
    );
  }

  @override
  Future<QuizAttemptResult> getAttemptResult({
    required String quizId,
    required String attemptId,
  }) {
    return _remoteDataSource.getAttemptResult(
      quizId: quizId,
      attemptId: attemptId,
    );
  }
}
