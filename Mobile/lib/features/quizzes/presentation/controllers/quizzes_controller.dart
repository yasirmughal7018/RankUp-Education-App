import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_attempt.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

class QuizzesState {
  const QuizzesState({
    this.allQuizzes = const [],
    this.quizzes = const [],
    this.isLoading = false,
    this.isDetailLoading = false,
    this.isAttemptLoading = false,
    this.errorMessage,
    this.actionError,
    this.search = '',
    this.quizType = '',
    this.status = '',
    this.dateFilter = '',
    this.selectedDetail,
    this.activeAttempt,
    this.attemptResult,
  });

  final List<QuizSummary> allQuizzes;
  final List<QuizSummary> quizzes;
  final bool isLoading;
  final bool isDetailLoading;
  final bool isAttemptLoading;
  final String? errorMessage;
  final String? actionError;
  final String search;
  final String quizType;
  final String status;
  final String dateFilter;
  final QuizDetail? selectedDetail;
  final QuizAttemptSession? activeAttempt;
  final QuizAttemptResult? attemptResult;

  QuizzesState copyWith({
    List<QuizSummary>? allQuizzes,
    List<QuizSummary>? quizzes,
    bool? isLoading,
    bool? isDetailLoading,
    bool? isAttemptLoading,
    String? errorMessage,
    String? actionError,
    String? search,
    String? quizType,
    String? status,
    String? dateFilter,
    QuizDetail? selectedDetail,
    QuizAttemptSession? activeAttempt,
    QuizAttemptResult? attemptResult,
    bool clearError = false,
    bool clearActionError = false,
    bool clearAttempt = false,
    bool clearResult = false,
  }) {
    return QuizzesState(
      allQuizzes: allQuizzes ?? this.allQuizzes,
      quizzes: quizzes ?? this.quizzes,
      isLoading: isLoading ?? this.isLoading,
      isDetailLoading: isDetailLoading ?? this.isDetailLoading,
      isAttemptLoading: isAttemptLoading ?? this.isAttemptLoading,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      actionError: clearActionError ? null : actionError ?? this.actionError,
      search: search ?? this.search,
      quizType: quizType ?? this.quizType,
      status: status ?? this.status,
      dateFilter: dateFilter ?? this.dateFilter,
      selectedDetail: selectedDetail ?? this.selectedDetail,
      activeAttempt: clearAttempt ? null : activeAttempt ?? this.activeAttempt,
      attemptResult: clearResult ? null : attemptResult ?? this.attemptResult,
    );
  }
}

class QuizzesController extends StateNotifier<QuizzesState> {
  QuizzesController(this._repository) : super(const QuizzesState());

  final QuizRepository _repository;

  Future<void> load({
    String? search,
    String? quizType,
    String? status,
    String? dateFilter,
  }) async {
    state = state.copyWith(
      isLoading: true,
      search: search,
      quizType: quizType,
      status: status,
      dateFilter: dateFilter,
      clearError: true,
    );

    try {
      final quizzes = await _repository.getQuizzes(search: state.search);
      state = state.copyWith(
        allQuizzes: quizzes,
        quizzes: _applyLocalFilters(
          quizzes,
          search: state.search,
          quizType: state.quizType,
          status: state.status,
          dateFilter: state.dateFilter,
        ),
        isLoading: false,
      );
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<QuizDetail?> loadDetail(String quizId) async {
    state = state.copyWith(
      isDetailLoading: true,
      clearActionError: true,
      clearAttempt: true,
      clearResult: true,
    );

    try {
      final detail = await _repository.getQuizDetail(quizId);
      state = state.copyWith(selectedDetail: detail, isDetailLoading: false);
      return detail;
    } on Exception catch (error) {
      state = state.copyWith(
        isDetailLoading: false,
        actionError: error.toString(),
      );
      return null;
    }
  }

  Future<QuizAttemptSession?> startAttempt({
    required String quizId,
    required String deviceId,
  }) async {
    state = state.copyWith(isAttemptLoading: true, clearActionError: true);

    try {
      final attempt = await _repository.startAttempt(
        quizId: quizId,
        deviceId: deviceId,
      );
      state = state.copyWith(
        activeAttempt: attempt,
        isAttemptLoading: false,
        clearResult: true,
      );
      return attempt;
    } on Exception catch (error) {
      state = state.copyWith(
        isAttemptLoading: false,
        actionError: error.toString(),
      );
      return null;
    }
  }

  Future<QuizAttemptResult?> submitAttempt({
    required String quizId,
    required String attemptId,
    required List<QuizAnswerSubmission> answers,
    required int timeSpentSeconds,
  }) async {
    state = state.copyWith(isAttemptLoading: true, clearActionError: true);

    try {
      final result = await _repository.submitAttempt(
        quizId: quizId,
        attemptId: attemptId,
        answers: answers,
        timeSpentSeconds: timeSpentSeconds,
      );
      state = state.copyWith(
        attemptResult: result,
        isAttemptLoading: false,
        clearAttempt: true,
      );
      await load(
        search: state.search,
        quizType: state.quizType,
        status: state.status,
        dateFilter: state.dateFilter,
      );
      return result;
    } on Exception catch (error) {
      state = state.copyWith(
        isAttemptLoading: false,
        actionError: error.toString(),
      );
      return null;
    }
  }

  Future<QuizAttemptResult?> loadAttemptResult({
    required String quizId,
    required String attemptId,
  }) async {
    state = state.copyWith(isDetailLoading: true, clearActionError: true);

    try {
      final result = await _repository.getAttemptResult(
        quizId: quizId,
        attemptId: attemptId,
      );
      state = state.copyWith(attemptResult: result, isDetailLoading: false);
      return result;
    } on Exception catch (error) {
      state = state.copyWith(
        isDetailLoading: false,
        actionError: error.toString(),
      );
      return null;
    }
  }

  void clearAttemptState() {
    state = state.copyWith(clearAttempt: true, clearResult: true);
  }
}

List<QuizSummary> _applyLocalFilters(
  List<QuizSummary> quizzes, {
  required String search,
  required String quizType,
  required String status,
  required String dateFilter,
}) {
  final now = DateTime.now();
  final selectedDateFilter = dateFilter.isEmpty ? 'All' : dateFilter;

  return quizzes.where((quiz) {
    final date = quiz.dueAt ?? quiz.startAt ?? now;
    final query = search.trim().toLowerCase();
    final searchableText =
        '${quiz.title} ${quiz.subject} ${quiz.topic}'.toLowerCase();
    final matchesSearch = query.isEmpty || searchableText.contains(query);
    final matchesType = quizType.isEmpty || quiz.quizType.startsWith(quizType);
    final matchesStatus = status.isEmpty || _studentStatus(quiz, now) == status;
    final matchesDate = switch (selectedDateFilter) {
      'Today' => _isSameDay(date, now),
      'Yesterday' => _isSameDay(date, now.subtract(const Duration(days: 1))),
      'Last 7 Days' => _isWithinPastDays(date, now, 7),
      'Last 15 Days' => _isWithinPastDays(date, now, 15),
      _ => true,
    };

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  }).toList();
}

bool _isSameDay(DateTime left, DateTime right) {
  return left.year == right.year &&
      left.month == right.month &&
      left.day == right.day;
}

bool _isWithinPastDays(DateTime date, DateTime now, int days) {
  final startOfToday = DateTime(now.year, now.month, now.day);
  final windowStart = startOfToday.subtract(Duration(days: days - 1));
  final tomorrow = startOfToday.add(const Duration(days: 1));

  return !date.isBefore(windowStart) && date.isBefore(tomorrow);
}

String studentQuizStatus(QuizSummary quiz, [DateTime? currentTime]) {
  return _studentStatus(quiz, currentTime ?? DateTime.now());
}

String _studentStatus(QuizSummary quiz, DateTime now) {
  final normalizedResultStatus =
      quiz.resultStatus.toLowerCase().replaceAll(' ', '');

  if (quiz.resultPercent != null || normalizedResultStatus == 'reviewed') {
    return 'Completed';
  }

  if (quiz.dueAt != null && quiz.dueAt!.isBefore(now)) {
    return 'Expired';
  }

  if (normalizedResultStatus == 'underteacherreview' ||
      normalizedResultStatus == 'aireview' ||
      normalizedResultStatus == 'teacherreview' ||
      normalizedResultStatus == 'pendingteacherreview' ||
      normalizedResultStatus == 'submitted' ||
      normalizedResultStatus == 'autosubmitted') {
    return 'Under Review';
  }

  if (normalizedResultStatus == 'inprogress') {
    return 'InProgress';
  }

  if (quiz.status == QuizStatus.upcoming ||
      (quiz.startAt != null && quiz.startAt!.isAfter(now))) {
    return 'Up Coming';
  }

  return 'Not Attempted';
}
