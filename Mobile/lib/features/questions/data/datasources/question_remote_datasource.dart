import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/questions/data/models/question_summary_model.dart';

/// Remote access to the question-bank HTTP API (`/questions`).
///
/// List results are scoped by the server from the caller’s JWT. Approved items
/// may include 3-tier [QuestionSummaryModel.visibility] (`Campus` / `School` /
/// `Public`) plus [QuestionSummaryModel.schoolId] / [QuestionSummaryModel.campusId];
/// this client does not filter those locally — it forwards API payloads as-is.
class QuestionRemoteDataSource {
  const QuestionRemoteDataSource(this._dio);

  final Dio _dio;

  /// Fetches bank question summaries.
  ///
  /// Optional [isActive] and [pendingApprovalOnly] map to query params. Mobile
  /// does not currently call approve/reject here; historically AI approve was
  /// PortalAdmin-only on WebApi, while human approve now sets Campus/School/Public
  /// visibility by approver role.
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

  /// Unwraps the standard API envelope and maps `data.items` (or a bare list).
  List<QuestionSummaryModel> _readList(Map<String, dynamic>? json) {
    if (json == null) {
      throw const UnknownAppException('The server returned an empty response.');
    }

    final response = ApiResponse<List<QuestionSummaryModel>>.fromJson(
      json,
      (payload) {
        // Some endpoints nest under `items`; others return the list as `data`.
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
