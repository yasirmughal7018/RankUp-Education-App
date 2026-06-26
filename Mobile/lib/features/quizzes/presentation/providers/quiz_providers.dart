import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/app/environment.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/features/quizzes/data/datasources/quiz_remote_datasource.dart';
import 'package:rankup_education/features/quizzes/data/repositories/api_quiz_repository.dart';
import 'package:rankup_education/features/quizzes/data/repositories/mock_quiz_repository.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';
import 'package:rankup_education/features/quizzes/presentation/controllers/quizzes_controller.dart';

final quizRepositoryProvider = Provider<QuizRepository>((ref) {
  final environment = ref.watch(appEnvironmentProvider);

  if (environment.enableMockRepositories) {
    return const MockQuizRepository();
  }

  return ApiQuizRepository(QuizRemoteDataSource(ref.watch(dioProvider)));
});

final quizzesControllerProvider =
    StateNotifierProvider<QuizzesController, QuizzesState>((ref) {
      return QuizzesController(ref.watch(quizRepositoryProvider));
    });
