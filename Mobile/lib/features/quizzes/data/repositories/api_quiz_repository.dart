import 'package:rankup_education/features/quizzes/data/datasources/quiz_remote_datasource.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

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
}
