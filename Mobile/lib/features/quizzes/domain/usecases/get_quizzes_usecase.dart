import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

/// Fetches the signed-in student's quiz list from the repository.
class GetQuizzesUseCase {
  const GetQuizzesUseCase(this._repository);

  final QuizRepository _repository;

  Future<List<QuizSummary>> call({
    String? search,
    String? subject,
    String? grade,
  }) {
    return _repository.getQuizzes(
      search: search,
      subject: subject,
      grade: grade,
    );
  }
}
