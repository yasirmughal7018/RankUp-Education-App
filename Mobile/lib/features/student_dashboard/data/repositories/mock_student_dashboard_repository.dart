import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';
import 'package:rankup_education/features/student_dashboard/domain/repositories/student_dashboard_repository.dart';

class MockStudentDashboardRepository implements StudentDashboardRepository {
  const MockStudentDashboardRepository();

  @override
  Future<StudentDashboardModel> getDashboard() async {
    await Future<void>.delayed(const Duration(milliseconds: 450));
    return StudentDashboardModel.mock();
  }
}
