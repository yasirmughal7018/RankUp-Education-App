import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';

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
