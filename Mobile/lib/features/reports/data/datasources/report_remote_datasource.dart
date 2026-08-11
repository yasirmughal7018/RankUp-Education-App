import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/rankings/data/models/student_ranking_models.dart';
import 'package:rankup_education/features/reports/data/models/student_quiz_history_models.dart';

/// REST client for student-scoped report endpoints (History self + rankings).
class ReportRemoteDataSource {
  const ReportRemoteDataSource(this._dio);

  final Dio _dio;

  Future<StudentQuizHistoryModel> getStudentQuizHistory(int studentId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/reports/students/$studentId/quiz-history',
      );
      return _readObject(response.data, StudentQuizHistoryModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<StudentRankingReportModel> getMyRankings({
    String scope = 'class',
    int? quizId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/reports/rankings/me',
        queryParameters: {
          'scope': scope,
          if (quizId != null) 'quizId': quizId,
        },
      );
      return _readObject(response.data, StudentRankingReportModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  T _readObject<T>(
    Map<String, dynamic>? json,
    T Function(Map<String, dynamic> json) mapper,
  ) {
    if (json == null) {
      throw const UnknownAppException('The server returned an empty response.');
    }

    final response = ApiResponse<Map<String, dynamic>>.fromJson(
      json,
      (data) => data is Map<String, dynamic> ? data : <String, dynamic>{},
    );

    if (!response.success) {
      throw ValidationException.fromApi(
        message: response.message,
        errors: response.errors,
      );
    }

    return mapper(response.data);
  }
}
