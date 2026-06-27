import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';
import 'package:rankup_education/features/student_dashboard/domain/repositories/student_dashboard_repository.dart';

class GetStudentDashboardUseCase {
  const GetStudentDashboardUseCase(this._repository);

  final StudentDashboardRepository _repository;

  Future<StudentDashboardModel> call() {
    return _repository.getDashboard();
  }
}
