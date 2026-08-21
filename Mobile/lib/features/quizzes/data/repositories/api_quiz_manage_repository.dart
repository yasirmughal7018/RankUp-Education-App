import 'package:rankup_education/features/quizzes/data/datasources/quiz_manage_remote_datasource.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_manage_models.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_manage_repository.dart';

/// Live API implementation of [QuizManageRepository].
class ApiQuizManageRepository implements QuizManageRepository {
  const ApiQuizManageRepository(this._remote);

  final QuizManageRemoteDataSource _remote;

  @override
  Future<ManageQuiz> getManageQuiz(String quizId) =>
      _remote.getManageQuiz(quizId);

  @override
  Future<ManageQuiz> createQuiz(CreateQuizInput input) =>
      _remote.createQuiz(input);

  @override
  Future<ManageQuiz> publishQuiz(String quizId) => _remote.publishQuiz(quizId);

  @override
  Future<ManageQuiz> addInlineQuestion(
    String quizId,
    AddInlineQuestionInput input,
  ) =>
      _remote.addInlineQuestion(quizId, input);

  @override
  Future<ManageQuiz> attachBankQuestion({
    required String quizId,
    required String questionId,
    int? marks,
  }) =>
      _remote.attachBankQuestion(
        quizId: quizId,
        questionId: questionId,
        marks: marks,
      );

  @override
  Future<ManageQuiz> removeQuestion({
    required String quizId,
    required String questionId,
  }) =>
      _remote.removeQuestion(quizId: quizId, questionId: questionId);

  @override
  Future<void> assignQuiz(String quizId, AssignQuizInput input) =>
      _remote.assignQuiz(quizId, input);

  @override
  Future<List<AssignmentBoardItem>> listAssignmentBoard({int? studentId}) =>
      _remote.listAssignmentBoard(studentId: studentId);

  @override
  Future<List<QuizAssignmentItem>> getAssignments(String quizId) =>
      _remote.getAssignments(quizId);

  @override
  Future<List<PendingReviewItem>> listPendingReviews() =>
      _remote.listPendingReviews();

  @override
  Future<AttemptReview> getAttemptReview({
    required String quizId,
    required String attemptId,
  }) =>
      _remote.getAttemptReview(quizId: quizId, attemptId: attemptId);

  @override
  Future<AttemptReview> markAttemptAnswers({
    required String quizId,
    required String attemptId,
    required List<MarkAttemptAnswerInput> answers,
  }) =>
      _remote.markAttemptAnswers(
        quizId: quizId,
        attemptId: attemptId,
        answers: answers,
      );

  @override
  Future<void> finalizeAttemptReview({
    required String quizId,
    required String attemptId,
  }) =>
      _remote.finalizeAttemptReview(quizId: quizId, attemptId: attemptId);

  @override
  Future<List<DirectoryStudentOption>> listStudents({
    String? search,
    int? grade,
  }) =>
      _remote.listStudents(search: search, grade: grade);

  @override
  Future<ManageQuiz> duplicateQuiz(String quizId) =>
      _remote.duplicateQuiz(quizId);

  @override
  Future<void> archiveQuiz(String quizId) => _remote.archiveQuiz(quizId);

  @override
  Future<void> cancelAssignments(String quizId) =>
      _remote.cancelAssignments(quizId);

  @override
  Future<void> allowRetry({
    required String quizId,
    required String assignmentId,
    int extraAttempts = 1,
  }) =>
      _remote.allowRetry(
        quizId: quizId,
        assignmentId: assignmentId,
        extraAttempts: extraAttempts,
      );

  @override
  Future<QuizMonitoringSnapshot> getMonitoring(String quizId) =>
      _remote.getMonitoring(quizId);

  @override
  Future<List<PendingQuizApprovalItem>> listPendingQuizApprovals() =>
      _remote.listPendingQuizApprovals();

  @override
  Future<void> approveQuiz(String quizId) => _remote.approveQuiz(quizId);

  @override
  Future<void> rejectQuiz(String quizId, {String? reason}) =>
      _remote.rejectQuiz(quizId, reason: reason);
}
