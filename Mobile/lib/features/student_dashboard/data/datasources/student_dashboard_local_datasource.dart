import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';

/// In-memory cache for the last fetched dashboard payload.
class StudentDashboardLocalDataSource {
  StudentDashboardLocalDataSource();

  static StudentDashboardModel? _cachedDashboard;

  Future<void> saveDashboard(StudentDashboardModel dashboard) async {
    _cachedDashboard = dashboard;
  }

  Future<StudentDashboardModel?> readDashboard() async {
    return _cachedDashboard;
  }
}
