import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

class QuizzesState {
  const QuizzesState({
    this.allQuizzes = const [],
    this.quizzes = const [],
    this.isLoading = false,
    this.errorMessage,
    this.search = '',
    this.quizType = '',
    this.status = '',
    this.dateFilter = '',
  });

  final List<QuizSummary> allQuizzes;
  final List<QuizSummary> quizzes;
  final bool isLoading;
  final String? errorMessage;
  final String search;
  final String quizType;
  final String status;
  final String dateFilter;

  QuizzesState copyWith({
    List<QuizSummary>? allQuizzes,
    List<QuizSummary>? quizzes,
    bool? isLoading,
    String? errorMessage,
    String? search,
    String? quizType,
    String? status,
    String? dateFilter,
    bool clearError = false,
  }) {
    return QuizzesState(
      allQuizzes: allQuizzes ?? this.allQuizzes,
      quizzes: quizzes ?? this.quizzes,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      search: search ?? this.search,
      quizType: quizType ?? this.quizType,
      status: status ?? this.status,
      dateFilter: dateFilter ?? this.dateFilter,
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
      final quizzes = await _repository.getQuizzes();
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

  Future<void> updateQuiz(QuizSummary updatedQuiz) async {
    final allQuizzes = [
      for (final quiz in state.allQuizzes)
        if (quiz.id == updatedQuiz.id) updatedQuiz else quiz,
    ];

    state = state.copyWith(
      allQuizzes: allQuizzes,
      quizzes: _applyLocalFilters(
        allQuizzes,
        search: state.search,
        quizType: state.quizType,
        status: state.status,
        dateFilter: state.dateFilter,
      ),
    );

    await _repository.updateQuiz(updatedQuiz);
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
      'Last 7 days' => _isWithinPastDays(date, now, 7),
      'Last 15 days' => _isWithinPastDays(date, now, 15),
      'Upcoming' => date.isAfter(now),
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
    return 'Upcoming';
  }

  return 'Not Attempted';
}
