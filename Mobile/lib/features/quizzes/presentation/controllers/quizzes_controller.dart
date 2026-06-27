import 'package:flutter_riverpod/flutter_riverpod.dart';
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
}

List<QuizSummary> _applyLocalFilters(
  List<QuizSummary> quizzes, {
  required String search,
  required String quizType,
  required String status,
  required String dateFilter,
}) {
  final now = DateTime.now();
  final monthStart = now.subtract(const Duration(days: 30));

  return quizzes.where((quiz) {
    final date = quiz.dueAt ?? quiz.startAt ?? now;
    final query = search.trim().toLowerCase();
    final searchableText =
        '${quiz.title} ${quiz.subject} ${quiz.topic}'.toLowerCase();
    final inCurrentWindow = !date.isBefore(monthStart);
    final matchesSearch = query.isEmpty || searchableText.contains(query);
    final matchesType = quizType.isEmpty || quiz.quizType.startsWith(quizType);
    final matchesStatus = status.isEmpty || _studentStatus(quiz, now) == status;
    final matchesDate = switch (dateFilter) {
      'Today' => _isSameDay(date, now),
      'Current Week' => _isInCurrentWeek(date, now),
      'Upcoming' => date.isAfter(now),
      _ => true,
    };

    return inCurrentWindow &&
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesDate;
  }).toList();
}

bool _isSameDay(DateTime left, DateTime right) {
  return left.year == right.year &&
      left.month == right.month &&
      left.day == right.day;
}

bool _isInCurrentWeek(DateTime date, DateTime now) {
  final startOfToday = DateTime(now.year, now.month, now.day);
  final weekStart = startOfToday.subtract(Duration(days: now.weekday - 1));
  final weekEnd = weekStart.add(const Duration(days: 7));

  return !date.isBefore(weekStart) && date.isBefore(weekEnd);
}

String studentQuizStatus(QuizSummary quiz, [DateTime? currentTime]) {
  return _studentStatus(quiz, currentTime ?? DateTime.now());
}

String _studentStatus(QuizSummary quiz, DateTime now) {
  if (quiz.status.name == 'completed' ||
      quiz.resultPercent != null ||
      quiz.resultStatus.toLowerCase() == 'reviewed') {
    return 'Completed';
  }

  if (quiz.dueAt != null && quiz.dueAt!.isBefore(now)) {
    return 'Expired';
  }

  if (quiz.resultStatus.toLowerCase().replaceAll(' ', '') == 'inprogress') {
    return 'InProgress';
  }

  return 'Not Started';
}
