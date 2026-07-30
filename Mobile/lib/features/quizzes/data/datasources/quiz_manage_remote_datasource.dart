import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_manage_models.dart';

/// REST client for teacher quiz manage, assign, and review endpoints.
class QuizManageRemoteDataSource {
  const QuizManageRemoteDataSource(this._dio);

  final Dio _dio;

  Future<ManageQuiz> getManageQuiz(String quizId) async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/quizzes/$quizId/manage');
      return _readObject(response.data, ManageQuiz.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<ManageQuiz> createQuiz(CreateQuizInput input) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes',
        data: input.toJson(),
      );
      return _readObject(response.data, ManageQuiz.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<ManageQuiz> publishQuiz(String quizId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/publish',
      );
      return _readObject(response.data, ManageQuiz.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<ManageQuiz> addInlineQuestion(
    String quizId,
    AddInlineQuestionInput input,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/questions',
        data: input.toJson(),
      );
      return _readObject(response.data, ManageQuiz.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<ManageQuiz> attachBankQuestion({
    required String quizId,
    required String questionId,
    int? marks,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/questions/from-bank',
        data: {
          'questionId': int.tryParse(questionId) ?? questionId,
          'marks': marks,
        },
      );
      return _readObject(response.data, ManageQuiz.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<ManageQuiz> removeQuestion({
    required String quizId,
    required String questionId,
  }) async {
    try {
      final response = await _dio.delete<Map<String, dynamic>>(
        '/quizzes/$quizId/questions/$questionId',
      );
      return _readObject(response.data, ManageQuiz.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> assignQuiz(String quizId, AssignQuizInput input) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/assign',
        data: input.toJson(),
      );
      _ensureSuccess(response.data);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<List<QuizAssignmentItem>> getAssignments(String quizId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/quizzes/$quizId/assignments',
      );
      return _readList(response.data, (payload) {
        final items = payload is Map<String, dynamic> ? payload['items'] : payload;
        if (items is! List) {
          return const <QuizAssignmentItem>[];
        }
        return items
            .whereType<Map<String, dynamic>>()
            .map(QuizAssignmentItem.fromJson)
            .toList();
      });
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<List<PendingReviewItem>> listPendingReviews() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/quizzes/reviews/pending',
      );
      return _readList(response.data, (payload) {
        final items = payload is Map<String, dynamic> ? payload['items'] : payload;
        if (items is! List) {
          return const <PendingReviewItem>[];
        }
        return items
            .whereType<Map<String, dynamic>>()
            .map(PendingReviewItem.fromJson)
            .toList();
      });
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<AttemptReview> getAttemptReview({
    required String quizId,
    required String attemptId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/quizzes/$quizId/attempts/$attemptId/review',
      );
      return _readObject(response.data, AttemptReview.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<AttemptReview> markAttemptAnswers({
    required String quizId,
    required String attemptId,
    required List<MarkAttemptAnswerInput> answers,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/quizzes/$quizId/attempts/$attemptId/answers',
        data: {
          'answers': [for (final answer in answers) answer.toJson()],
        },
      );
      return _readObject(response.data, AttemptReview.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> finalizeAttemptReview({
    required String quizId,
    required String attemptId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/attempts/$attemptId/finalize-review',
      );
      _ensureSuccess(response.data);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<List<DirectoryStudentOption>> listStudents({
    String? search,
    int? grade,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/directory/students',
        queryParameters: {
          if (search != null && search.isNotEmpty) 'search': search,
          if (grade != null && grade > 0) 'grade': grade,
          'pageNumber': 1,
          'pageSize': 50,
        },
      );
      return _readList(response.data, (payload) {
        final items = payload is Map<String, dynamic> ? payload['items'] : payload;
        if (items is! List) {
          return const <DirectoryStudentOption>[];
        }
        return items
            .whereType<Map<String, dynamic>>()
            .map(DirectoryStudentOption.fromJson)
            .toList();
      });
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<ManageQuiz> duplicateQuiz(String quizId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/duplicate',
      );
      return _readObject(response.data, ManageQuiz.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> archiveQuiz(String quizId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/archive',
      );
      _ensureSuccess(response.data);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> cancelAssignments(String quizId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/cancel',
      );
      _ensureSuccess(response.data);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> allowRetry({
    required String quizId,
    required String assignmentId,
    int extraAttempts = 1,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/assignments/$assignmentId/allow-retry',
        data: {'extraAttempts': extraAttempts},
      );
      _ensureSuccess(response.data);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuizMonitoringSnapshot> getMonitoring(String quizId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/quizzes/$quizId/monitoring',
      );
      return _readObject(response.data, QuizMonitoringSnapshot.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<List<PendingQuizApprovalItem>> listPendingQuizApprovals() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/quizzes/pending-approval',
      );
      return _readList(response.data, (payload) {
        final items =
            payload is Map<String, dynamic> ? payload['items'] : payload;
        if (items is! List) {
          return const <PendingQuizApprovalItem>[];
        }
        return items
            .whereType<Map<String, dynamic>>()
            .map(PendingQuizApprovalItem.fromJson)
            .toList();
      });
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> approveQuiz(String quizId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/approve',
      );
      _ensureSuccess(response.data);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> rejectQuiz(String quizId, {String? reason}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/reject',
        data: {'reason': reason},
      );
      _ensureSuccess(response.data);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  void _ensureSuccess(Map<String, dynamic>? json) {
    if (json == null) {
      throw const UnknownAppException('The server returned an empty response.');
    }

    final response = ApiResponse<Object?>.fromJson(json, (data) => data);
    if (!response.success) {
      throw ValidationException.fromApi(
        message: response.message,
        errors: response.errors,
      );
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

  T _readList<T>(
    Map<String, dynamic>? json,
    T Function(Object? payload) mapper,
  ) {
    if (json == null) {
      throw const UnknownAppException('The server returned an empty response.');
    }

    final response = ApiResponse<T>.fromJson(json, mapper);
    if (!response.success) {
      throw ValidationException.fromApi(
        message: response.message,
        errors: response.errors,
      );
    }

    return response.data;
  }
}
