import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

class QuizzesState {
  const QuizzesState({
    this.quizzes = const [],
    this.isLoading = false,
    this.errorMessage,
    this.search = '',
  });

  final List<QuizSummary> quizzes;
  final bool isLoading;
  final String? errorMessage;
  final String search;

  QuizzesState copyWith({
    List<QuizSummary>? quizzes,
    bool? isLoading,
    String? errorMessage,
    String? search,
    bool clearError = false,
  }) {
    return QuizzesState(
      quizzes: quizzes ?? this.quizzes,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      search: search ?? this.search,
    );
  }
}

class QuizzesController extends StateNotifier<QuizzesState> {
  QuizzesController(this._repository) : super(const QuizzesState());

  final QuizRepository _repository;

  Future<void> load({String? search}) async {
    state = state.copyWith(isLoading: true, search: search, clearError: true);

    try {
      final quizzes = await _repository.getQuizzes(search: search);
      state = state.copyWith(quizzes: quizzes, isLoading: false);
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }
}
