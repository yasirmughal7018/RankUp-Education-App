import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_manage_models.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_manage_repository.dart';

/// Teacher manage / create / assign / review UI state.
class TeacherQuizManageState {
  const TeacherQuizManageState({
    this.manageQuiz,
    this.assignments = const [],
    this.pendingReviews = const [],
    this.attemptReview,
    this.students = const [],
    this.isLoading = false,
    this.isSaving = false,
    this.errorMessage,
    this.successMessage,
  });

  final ManageQuiz? manageQuiz;
  final List<QuizAssignmentItem> assignments;
  final List<PendingReviewItem> pendingReviews;
  final AttemptReview? attemptReview;
  final List<DirectoryStudentOption> students;
  final bool isLoading;
  final bool isSaving;
  final String? errorMessage;
  final String? successMessage;

  TeacherQuizManageState copyWith({
    ManageQuiz? manageQuiz,
    List<QuizAssignmentItem>? assignments,
    List<PendingReviewItem>? pendingReviews,
    AttemptReview? attemptReview,
    List<DirectoryStudentOption>? students,
    bool? isLoading,
    bool? isSaving,
    String? errorMessage,
    String? successMessage,
    bool clearError = false,
    bool clearSuccess = false,
    bool clearManage = false,
    bool clearReview = false,
  }) {
    return TeacherQuizManageState(
      manageQuiz: clearManage ? null : manageQuiz ?? this.manageQuiz,
      assignments: assignments ?? this.assignments,
      pendingReviews: pendingReviews ?? this.pendingReviews,
      attemptReview: clearReview ? null : attemptReview ?? this.attemptReview,
      students: students ?? this.students,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      successMessage:
          clearSuccess ? null : successMessage ?? this.successMessage,
    );
  }
}

/// Loads and mutates teacher-managed quizzes.
class TeacherQuizManageController
    extends StateNotifier<TeacherQuizManageState> {
  TeacherQuizManageController(this._repository)
      : super(const TeacherQuizManageState());

  final QuizManageRepository _repository;

  Future<ManageQuiz?> loadManageQuiz(String quizId) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      final quiz = await _repository.getManageQuiz(quizId);
      final assignments = await _repository.getAssignments(quizId);
      state = state.copyWith(
        manageQuiz: quiz,
        assignments: assignments,
        isLoading: false,
      );
      return quiz;
    } on AppException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
      return null;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load quiz.',
      );
      return null;
    }
  }

  Future<ManageQuiz?> createQuiz(CreateQuizInput input) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      final quiz = await _repository.createQuiz(input);
      state = state.copyWith(
        manageQuiz: quiz,
        assignments: const [],
        isSaving: false,
        successMessage: 'Quiz created.',
      );
      return quiz;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return null;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to create quiz.',
      );
      return null;
    }
  }

  Future<bool> publishQuiz(String quizId) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      final quiz = await _repository.publishQuiz(quizId);
      state = state.copyWith(
        manageQuiz: quiz,
        isSaving: false,
        successMessage: 'Quiz published.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to publish quiz.',
      );
      return false;
    }
  }

  Future<bool> addInlineQuestion(
    String quizId,
    AddInlineQuestionInput input,
  ) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      final quiz = await _repository.addInlineQuestion(quizId, input);
      state = state.copyWith(
        manageQuiz: quiz,
        isSaving: false,
        successMessage: 'Question added.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to add question.',
      );
      return false;
    }
  }

  Future<bool> attachBankQuestion({
    required String quizId,
    required String questionId,
    int? marks,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      final quiz = await _repository.attachBankQuestion(
        quizId: quizId,
        questionId: questionId,
        marks: marks,
      );
      state = state.copyWith(
        manageQuiz: quiz,
        isSaving: false,
        successMessage: 'Question attached from bank.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to attach question.',
      );
      return false;
    }
  }

  Future<bool> removeQuestion({
    required String quizId,
    required String questionId,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      final quiz = await _repository.removeQuestion(
        quizId: quizId,
        questionId: questionId,
      );
      state = state.copyWith(
        manageQuiz: quiz,
        isSaving: false,
        successMessage: 'Question removed.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to remove question.',
      );
      return false;
    }
  }

  Future<bool> assignQuiz(String quizId, AssignQuizInput input) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      await _repository.assignQuiz(quizId, input);
      final quiz = await _repository.getManageQuiz(quizId);
      final assignments = await _repository.getAssignments(quizId);
      state = state.copyWith(
        manageQuiz: quiz,
        assignments: assignments,
        isSaving: false,
        successMessage: 'Quiz assigned.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to assign quiz.',
      );
      return false;
    }
  }

  Future<void> loadPendingReviews() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final items = await _repository.listPendingReviews();
      state = state.copyWith(pendingReviews: items, isLoading: false);
    } on AppException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load pending reviews.',
      );
    }
  }

  Future<AttemptReview?> loadAttemptReview({
    required String quizId,
    required String attemptId,
  }) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearReview: true,
    );
    try {
      final review = await _repository.getAttemptReview(
        quizId: quizId,
        attemptId: attemptId,
      );
      state = state.copyWith(attemptReview: review, isLoading: false);
      return review;
    } on AppException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
      return null;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load review.',
      );
      return null;
    }
  }

  void patchLocalReviewMarks({
    required String questionId,
    required int awardedMarks,
    String? feedback,
  }) {
    final review = state.attemptReview;
    if (review == null) {
      return;
    }

    state = state.copyWith(
      attemptReview: AttemptReview(
        attemptId: review.attemptId,
        quizId: review.quizId,
        quizTitle: review.quizTitle,
        studentId: review.studentId,
        studentName: review.studentName,
        attemptNumber: review.attemptNumber,
        totalMarks: review.totalMarks,
        obtainedMarks: review.obtainedMarks,
        percentage: review.percentage,
        status: review.status,
        isReviewDone: review.isReviewDone,
        submittedAt: review.submittedAt,
        focusLossCount: review.focusLossCount,
        clipboardPasteCount: review.clipboardPasteCount,
        questions: [
          for (final question in review.questions)
            question.questionId == questionId
                ? question.copyWith(
                    awardedMarks: awardedMarks,
                    parentFeedback: feedback,
                  )
                : question,
        ],
      ),
    );
  }

  Future<bool> saveReviewMarks({
    required String quizId,
    required String attemptId,
  }) async {
    final review = state.attemptReview;
    if (review == null) {
      return false;
    }

    final answers = [
      for (final question in review.questions.where((q) => q.requiresReview))
        MarkAttemptAnswerInput(
          questionId: question.questionId,
          awardedMarks: question.awardedMarks,
          feedback: question.parentFeedback,
        ),
    ];

    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      final updated = await _repository.markAttemptAnswers(
        quizId: quizId,
        attemptId: attemptId,
        answers: answers,
      );
      state = state.copyWith(
        attemptReview: updated,
        isSaving: false,
        successMessage: 'Marks saved.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to save marks.',
      );
      return false;
    }
  }

  Future<bool> finalizeReview({
    required String quizId,
    required String attemptId,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      await _repository.finalizeAttemptReview(
        quizId: quizId,
        attemptId: attemptId,
      );
      final review = await _repository.getAttemptReview(
        quizId: quizId,
        attemptId: attemptId,
      );
      state = state.copyWith(
        attemptReview: review,
        isSaving: false,
        successMessage: 'Review finalized.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to finalize review.',
      );
      return false;
    }
  }

  Future<void> loadStudents({String? search, int? grade}) async {
    try {
      final students = await _repository.listStudents(
        search: search,
        grade: grade,
      );
      state = state.copyWith(students: students, clearError: true);
    } on AppException catch (error) {
      state = state.copyWith(errorMessage: error.message);
    } catch (_) {
      state = state.copyWith(errorMessage: 'Unable to load students.');
    }
  }

  Future<ManageQuiz?> duplicateQuiz(String quizId) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      final quiz = await _repository.duplicateQuiz(quizId);
      state = state.copyWith(
        manageQuiz: quiz,
        assignments: const [],
        isSaving: false,
        successMessage: 'Quiz duplicated.',
      );
      return quiz;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return null;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to duplicate quiz.',
      );
      return null;
    }
  }

  Future<bool> archiveQuiz(String quizId) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      await _repository.archiveQuiz(quizId);
      final quiz = await _repository.getManageQuiz(quizId);
      state = state.copyWith(
        manageQuiz: quiz,
        isSaving: false,
        successMessage: 'Quiz archived.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to archive quiz.',
      );
      return false;
    }
  }

  Future<bool> cancelAssignments(String quizId) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      await _repository.cancelAssignments(quizId);
      final quiz = await _repository.getManageQuiz(quizId);
      final assignments = await _repository.getAssignments(quizId);
      state = state.copyWith(
        manageQuiz: quiz,
        assignments: assignments,
        isSaving: false,
        successMessage: 'Upcoming assignments cancelled.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to cancel assignments.',
      );
      return false;
    }
  }

  Future<bool> allowRetry({
    required String quizId,
    required String assignmentId,
    int extraAttempts = 1,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      await _repository.allowRetry(
        quizId: quizId,
        assignmentId: assignmentId,
        extraAttempts: extraAttempts,
      );
      final assignments = await _repository.getAssignments(quizId);
      state = state.copyWith(
        assignments: assignments,
        isSaving: false,
        successMessage: 'Retry allowed.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to allow retry.',
      );
      return false;
    }
  }

  Future<QuizMonitoringSnapshot?> loadMonitoring(String quizId) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final snapshot = await _repository.getMonitoring(quizId);
      state = state.copyWith(isLoading: false);
      return snapshot;
    } on AppException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
      return null;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load monitoring.',
      );
      return null;
    }
  }

  Future<List<PendingQuizApprovalItem>> loadPendingQuizApprovals() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final items = await _repository.listPendingQuizApprovals();
      state = state.copyWith(isLoading: false);
      return items;
    } on AppException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
      return const [];
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load quiz approvals.',
      );
      return const [];
    }
  }

  Future<bool> approveQuiz(String quizId) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      await _repository.approveQuiz(quizId);
      state = state.copyWith(
        isSaving: false,
        successMessage: 'Quiz approved.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to approve quiz.',
      );
      return false;
    }
  }

  Future<bool> rejectQuiz(String quizId, {String? reason}) async {
    state = state.copyWith(isSaving: true, clearError: true, clearSuccess: true);
    try {
      await _repository.rejectQuiz(quizId, reason: reason);
      state = state.copyWith(
        isSaving: false,
        successMessage: 'Quiz rejected.',
      );
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to reject quiz.',
      );
      return false;
    }
  }

  void clearMessages() {
    state = state.copyWith(clearError: true, clearSuccess: true);
  }

  void clearManage() {
    state = state.copyWith(clearManage: true, clearReview: true);
  }
}
