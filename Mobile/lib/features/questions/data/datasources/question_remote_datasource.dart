import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/questions/data/models/question_summary_model.dart';

class QuestionRemoteDataSource {
  const QuestionRemoteDataSource(this._dio);

  final Dio _dio;

  Future<List<QuestionSummaryModel>> getQuestions({
    bool? isActive,
    bool? pendingApprovalOnly,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/questions',
        queryParameters: {
          if (isActive != null) 'isActive': isActive,
          if (pendingApprovalOnly != null)
            'pendingApprovalOnly': pendingApprovalOnly,
        },
      );
      return _readList(response.data);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  List<QuestionSummaryModel> _readList(Map<String, dynamic>? json) {
    if (json == null) {
      throw const UnknownAppException('The server returned an empty response.');
    }

    final response = ApiResponse<List<QuestionSummaryModel>>.fromJson(
      json,
      (payload) {
        final items =
            payload is Map<String, dynamic> ? payload['items'] : payload;
        if (items is! List) {
          return const [];
        }
        return items
            .whereType<Map<String, dynamic>>()
            .map(QuestionSummaryModel.fromJson)
            .toList();
      },
    );

    if (!response.success) {
      throw ValidationException.fromApi(message: response.message, errors: response.errors);
    }

    return response.data;
  }
}
