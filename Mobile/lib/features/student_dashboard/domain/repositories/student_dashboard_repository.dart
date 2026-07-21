import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';

/// Fetches the aggregated student dashboard payload.
abstract interface class StudentDashboardRepository {
  Future<StudentDashboardModel> getDashboard();
}
