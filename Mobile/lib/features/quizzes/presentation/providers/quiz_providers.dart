import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/core/network/connectivity_service.dart';
import 'package:rankup_education/core/storage/student_device_id_store.dart';
import 'package:rankup_education/features/quizzes/data/datasources/quiz_remote_datasource.dart';
import 'package:rankup_education/features/quizzes/data/repositories/api_quiz_repository.dart';
import 'package:rankup_education/features/quizzes/domain/offline_quiz_sync.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';
import 'package:rankup_education/features/quizzes/presentation/controllers/quizzes_controller.dart';

/// Student quiz flow always uses the live API.
final quizRepositoryProvider = Provider<QuizRepository>((ref) {
  return ApiQuizRepository(QuizRemoteDataSource(ref.watch(dioProvider)));
});

final offlineQuizSyncStoreProvider = Provider<OfflineQuizSyncStore>((ref) {
  return OfflineQuizSyncStore();
});

/// State for the student/teacher quiz hub screen.
final quizzesControllerProvider =
    StateNotifierProvider<QuizzesController, QuizzesState>((ref) {
  return QuizzesController(
    ref.watch(quizRepositoryProvider),
    ref.watch(offlineQuizSyncStoreProvider),
    ref.watch(connectivityServiceProvider),
    ref.watch(studentDeviceIdStoreProvider),
  );
});
