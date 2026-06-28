import 'package:rankup_education/features/student_dashboard/data/datasources/student_dashboard_local_datasource.dart';
import 'package:rankup_education/features/student_dashboard/data/datasources/student_dashboard_remote_datasource.dart';
import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';
import 'package:rankup_education/features/student_dashboard/domain/repositories/student_dashboard_repository.dart';

class ApiStudentDashboardRepository implements StudentDashboardRepository {
  const ApiStudentDashboardRepository(
    this._remoteDataSource,
    this._localDataSource,
  );

  final StudentDashboardRemoteDataSource _remoteDataSource;
  final StudentDashboardLocalDataSource _localDataSource;

  @override
  Future<StudentDashboardModel> getDashboard() async {
    try {
      final dashboard = await _remoteDataSource.getDashboard();
      await _localDataSource.saveDashboard(dashboard);
      return dashboard;
    } on Exception {
      final cached = await _localDataSource.readDashboard();
      if (cached != null) {
        return cached;
      }

      rethrow;
    }
  }
}
