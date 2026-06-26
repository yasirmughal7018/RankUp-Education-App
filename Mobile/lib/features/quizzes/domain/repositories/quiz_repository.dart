import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';

abstract class QuizRepository {
  Future<List<QuizSummary>> getQuizzes({
    String? search,
    String? subject,
    String? grade,
  });
}
