import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/features/student_dashboard/data/datasources/student_dashboard_local_datasource.dart';
import 'package:rankup_education/features/student_dashboard/data/datasources/student_dashboard_remote_datasource.dart';
import 'package:rankup_education/features/student_dashboard/data/repositories/api_student_dashboard_repository.dart';
import 'package:rankup_education/features/student_dashboard/domain/repositories/student_dashboard_repository.dart';
import 'package:rankup_education/features/student_dashboard/domain/usecases/get_student_dashboard_usecase.dart';
import 'package:rankup_education/features/student_dashboard/presentation/controllers/student_dashboard_controller.dart';

final studentDashboardLocalDataSourceProvider =
    Provider<StudentDashboardLocalDataSource>((ref) {
  return StudentDashboardLocalDataSource();
});

/// Student dashboard always loads from the live API.
final studentDashboardRepositoryProvider =
    Provider<StudentDashboardRepository>((ref) {
  return ApiStudentDashboardRepository(
    StudentDashboardRemoteDataSource(ref.watch(dioProvider)),
    ref.watch(studentDashboardLocalDataSourceProvider),
  );
});

final getStudentDashboardUseCaseProvider =
    Provider<GetStudentDashboardUseCase>((ref) {
  return GetStudentDashboardUseCase(
    ref.watch(studentDashboardRepositoryProvider),
  );
});

final studentDashboardControllerProvider =
    StateNotifierProvider<StudentDashboardController, StudentDashboardState>(
        (ref) {
  return StudentDashboardController(
    ref.watch(getStudentDashboardUseCaseProvider),
  );
});
