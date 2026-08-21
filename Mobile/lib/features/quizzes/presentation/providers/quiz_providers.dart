import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/core/network/connectivity_service.dart';
import 'package:rankup_education/core/storage/student_device_id_store.dart';
import 'package:rankup_education/features/quizzes/data/datasources/quiz_manage_remote_datasource.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_manage_models.dart';
import 'package:rankup_education/features/quizzes/data/datasources/quiz_remote_datasource.dart';
import 'package:rankup_education/features/quizzes/data/repositories/api_quiz_manage_repository.dart';
import 'package:rankup_education/features/quizzes/data/repositories/api_quiz_repository.dart';
import 'package:rankup_education/features/quizzes/domain/offline_attempt_session.dart';
import 'package:rankup_education/features/quizzes/domain/offline_quiz_sync.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_manage_repository.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';
import 'package:rankup_education/features/quizzes/presentation/controllers/quizzes_controller.dart';
import 'package:rankup_education/features/quizzes/presentation/controllers/teacher_quiz_manage_controller.dart';

/// Student quiz flow always uses the live API.
final quizRepositoryProvider = Provider<QuizRepository>((ref) {
  return ApiQuizRepository(QuizRemoteDataSource(ref.watch(dioProvider)));
});

final quizManageRepositoryProvider = Provider<QuizManageRepository>((ref) {
  return ApiQuizManageRepository(
    QuizManageRemoteDataSource(ref.watch(dioProvider)),
  );
});

final offlineQuizSyncStoreProvider = Provider<OfflineQuizSyncStore>((ref) {
  return OfflineQuizSyncStore();
});

final offlineAttemptSessionStoreProvider =
    Provider<OfflineAttemptSessionStore>((ref) {
  return OfflineAttemptSessionStore();
});

/// State for the student/teacher quiz hub screen.
final quizzesControllerProvider =
    StateNotifierProvider<QuizzesController, QuizzesState>((ref) {
  return QuizzesController(
    ref.watch(quizRepositoryProvider),
    ref.watch(offlineQuizSyncStoreProvider),
    ref.watch(offlineAttemptSessionStoreProvider),
    ref.watch(connectivityServiceProvider),
    ref.watch(studentDeviceIdStoreProvider),
  );
});

/// Teacher create / manage / assign / subjective review state.
final teacherQuizManageControllerProvider = StateNotifierProvider<
    TeacherQuizManageController, TeacherQuizManageState>((ref) {
  return TeacherQuizManageController(ref.watch(quizManageRepositoryProvider));
});

/// Cross-quiz assignment board (`GET /quizzes/assignments`).
final assignmentBoardProvider = FutureProvider.autoDispose
    .family<List<AssignmentBoardItem>, int?>((ref, studentId) async {
  return ref
      .watch(quizManageRepositoryProvider)
      .listAssignmentBoard(studentId: studentId);
});
