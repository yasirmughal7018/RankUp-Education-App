import 'package:dio/dio.dart';
import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';

class StudentDashboardRemoteDataSource {
  const StudentDashboardRemoteDataSource(this._dio);

  final Dio _dio;

  Future<StudentDashboardModel> getDashboard() async {
    await _dio.get<Map<String, dynamic>>('/student/dashboard');

    // The backend contract is reserved; mock-shaped data remains the safe
    // fallback until the API response schema is finalized.
    return StudentDashboardModel.mock();
  }
}
