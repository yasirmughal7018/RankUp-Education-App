import 'package:rankup_education/features/quizzes/data/models/quiz_manage_models.dart';

/// Teacher quiz create / manage / assign / subjective review.
abstract class QuizManageRepository {
  Future<ManageQuiz> getManageQuiz(String quizId);

  Future<ManageQuiz> createQuiz(CreateQuizInput input);

  Future<ManageQuiz> publishQuiz(String quizId);

  Future<ManageQuiz> addInlineQuestion(
    String quizId,
    AddInlineQuestionInput input,
  );

  Future<ManageQuiz> attachBankQuestion({
    required String quizId,
    required String questionId,
    int? marks,
  });

  Future<ManageQuiz> removeQuestion({
    required String quizId,
    required String questionId,
  });

  Future<void> assignQuiz(String quizId, AssignQuizInput input);

  Future<List<QuizAssignmentItem>> getAssignments(String quizId);

  Future<List<PendingReviewItem>> listPendingReviews();

  Future<AttemptReview> getAttemptReview({
    required String quizId,
    required String attemptId,
  });

  Future<AttemptReview> markAttemptAnswers({
    required String quizId,
    required String attemptId,
    required List<MarkAttemptAnswerInput> answers,
  });

  Future<void> finalizeAttemptReview({
    required String quizId,
    required String attemptId,
  });

  Future<List<DirectoryStudentOption>> listStudents({
    String? search,
    int? grade,
  });

  Future<ManageQuiz> duplicateQuiz(String quizId);

  Future<void> archiveQuiz(String quizId);

  Future<void> cancelAssignments(String quizId);

  Future<void> allowRetry({
    required String quizId,
    required String assignmentId,
    int extraAttempts = 1,
  });

  Future<QuizMonitoringSnapshot> getMonitoring(String quizId);

  Future<List<PendingQuizApprovalItem>> listPendingQuizApprovals();

  Future<void> approveQuiz(String quizId);

  Future<void> rejectQuiz(String quizId, {String? reason});
}
