import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/authentication/data/models/app_user_model.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_summary_model.dart';
import 'package:rankup_education/features/student_dashboard/data/mappers/student_dashboard_mapper.dart';
import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';

class StudentDashboardRemoteDataSource {
  const StudentDashboardRemoteDataSource(this._dio);

  final Dio _dio;

  Future<StudentDashboardModel> getDashboard() async {
    try {
      final meResponse = await _dio.get<Map<String, dynamic>>('/auth/me');
      final quizzesResponse = await _dio.get<Map<String, dynamic>>('/quizzes');

      final user = _readUser(meResponse.data);
      final quizzes = _readQuizzes(quizzesResponse.data);

      return StudentDashboardMapper.fromApi(user: user, quizzes: quizzes);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  AppUserModel _readUser(Map<String, dynamic>? json) {
    if (json == null) {
      throw const UnknownAppException('The server returned no profile data.');
    }

    final response = ApiResponse<Map<String, dynamic>>.fromJson(
      json,
      (data) => data is Map<String, dynamic> ? data : <String, dynamic>{},
    );

    if (!response.success) {
      throw ValidationException(response.message, response.errors);
    }

    return AppUserModel.fromJson(response.data);
  }

  List<QuizSummaryModel> _readQuizzes(Map<String, dynamic>? json) {
    if (json == null) {
      throw const UnknownAppException('The server returned no dashboard quizzes.');
    }

    final response = ApiResponse<List<QuizSummaryModel>>.fromJson(
      json,
      _readQuizList,
    );

    if (!response.success) {
      throw ValidationException(response.message, response.errors);
    }

    return response.data;
  }
}

List<QuizSummaryModel> _readQuizList(Object? payload) {
  final items = payload is Map<String, dynamic> ? payload['items'] : payload;

  if (items is! List) {
    return const [];
  }

  return items
      .whereType<Map<String, dynamic>>()
      .map(QuizSummaryModel.fromJson)
      .toList();
}
