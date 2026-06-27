import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';

abstract interface class StudentDashboardRepository {
  Future<StudentDashboardModel> getDashboard();
}
