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
  /// Optional filters map to query params. Prefer [eligibleForQuizOnly] when
  /// attaching to quizzes (Public + Active on the server).
  Future<List<QuestionSummaryModel>> getQuestions({
    bool? isActive,
    bool? pendingApprovalOnly,
    bool? eligibleForQuizOnly,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/questions',
        queryParameters: {
          if (isActive != null) 'isActive': isActive,
          if (pendingApprovalOnly != null)
            'pendingApprovalOnly': pendingApprovalOnly,
          if (eligibleForQuizOnly != null)
            'eligibleForQuizOnly': eligibleForQuizOnly,
        },
      );
      return _readList(response.data);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuestionSummaryModel> getQuestion(String questionId) async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/questions/$questionId');
      return _readObject(response.data, QuestionSummaryModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuestionSummaryModel> createQuestion(Map<String, dynamic> body) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/questions',
        data: body,
      );
      return _readObject(response.data, QuestionSummaryModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuestionSummaryModel> updateQuestion(
    String questionId,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/questions/$questionId',
        data: body,
      );
      return _readObject(response.data, QuestionSummaryModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuestionSummaryModel> submitQuestion(String questionId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/questions/$questionId/submit',
      );
      return _readObject(response.data, QuestionSummaryModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuestionSummaryModel> approveQuestion(String questionId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/questions/$questionId/approve',
      );
      return _readObject(response.data, QuestionSummaryModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuestionSummaryModel> rejectQuestion(
    String questionId, {
    required String reason,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/questions/$questionId/reject',
        data: {'reason': reason},
      );
      return _readObject(response.data, QuestionSummaryModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuestionSummaryModel> activateQuestion(String questionId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/questions/$questionId/activate',
      );
      return _readObject(response.data, QuestionSummaryModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuestionSummaryModel> deactivateQuestion(String questionId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/questions/$questionId/deactivate',
      );
      return _readObject(response.data, QuestionSummaryModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuestionSummaryModel> archiveQuestion(String questionId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/questions/$questionId/archive',
      );
      return _readObject(response.data, QuestionSummaryModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuestionSummaryModel> unarchiveQuestion(String questionId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/questions/$questionId/unarchive',
      );
      return _readObject(response.data, QuestionSummaryModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<List<QuestionSummaryModel>> listPendingApproval() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/questions/pending-approval',
      );
      return _readList(response.data);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<({int created, List<String> errors})> importQuestions({
    required List<int> fileBytes,
    required String fileName,
    bool dryRun = false,
  }) async {
    try {
      final form = FormData.fromMap({
        'file': MultipartFile.fromBytes(fileBytes, filename: fileName),
      });
      final response = await _dio.post<Map<String, dynamic>>(
        '/questions/import',
        queryParameters: {'dryRun': dryRun},
        data: form,
      );
      if (response.data == null) {
        throw const UnknownAppException('The server returned an empty response.');
      }
      final envelope = ApiResponse<Map<String, dynamic>>.fromJson(
        response.data!,
        (data) => data is Map<String, dynamic> ? data : <String, dynamic>{},
      );
      if (!envelope.success) {
        throw ValidationException.fromApi(
          message: envelope.message,
          errors: envelope.errors,
        );
      }
      final created = envelope.data['createdCount'] ??
          envelope.data['created'] ??
          envelope.data['importedCount'] ??
          0;
      final errors = (envelope.data['errors'] as List<dynamic>? ?? const [])
          .map((e) => e.toString())
          .toList();
      return (
        created: created is int ? created : int.tryParse('$created') ?? 0,
        errors: errors,
      );
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
      throw ValidationException.fromApi(
        message: response.message,
        errors: response.errors,
      );
    }

    return response.data;
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
