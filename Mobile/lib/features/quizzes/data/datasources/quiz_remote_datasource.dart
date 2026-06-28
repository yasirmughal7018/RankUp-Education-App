import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_summary_model.dart';

class QuizRemoteDataSource {
  const QuizRemoteDataSource(this._dio);

  final Dio _dio;

  Future<List<QuizSummaryModel>> getQuizzes({
    String? search,
    String? subject,
    String? grade,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/quizzes',
        queryParameters: {
          if (search != null && search.isNotEmpty) 'search': search,
          if (subject != null && subject.isNotEmpty) 'subject': subject,
          if (grade != null && grade.isNotEmpty) 'grade': grade,
        },
      );

      final data = response.data;
      if (data == null) {
        throw const UnknownAppException('The server returned no quizzes.');
      }

      final apiResponse = ApiResponse<List<QuizSummaryModel>>.fromJson(
        data,
        _readQuizList,
      );

      if (!apiResponse.success) {
        throw ValidationException(apiResponse.message, apiResponse.errors);
      }

      return apiResponse.data;
    } on DioException catch (error) {
      throw mapDioException(error);
    }
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
