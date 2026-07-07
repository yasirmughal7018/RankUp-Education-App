import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_attempt_models.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_summary_model.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

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

      return _readList(response.data, _readQuizList);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuizDetailModel> getQuizDetail(String quizId) async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/quizzes/$quizId');
      return _readObject(response.data, QuizDetailModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuizAttemptSessionModel> startAttempt({
    required String quizId,
    required String deviceId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/attempts',
        data: {'deviceId': deviceId},
      );
      return _readObject(response.data, QuizAttemptSessionModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuizAttemptResultModel> submitAttempt({
    required String quizId,
    required String attemptId,
    required List<QuizAnswerSubmission> answers,
    required int timeSpentSeconds,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/quizzes/$quizId/attempts/$attemptId/submit',
        data: {
          'answers': [
            for (final answer in answers)
              {
                'questionId': int.tryParse(answer.questionId) ?? answer.questionId,
                if (answer.selectedOptionId != null)
                  'selectedOptionId':
                      int.tryParse(answer.selectedOptionId!) ??
                          answer.selectedOptionId,
                if (answer.submittedText != null &&
                    answer.submittedText!.trim().isNotEmpty)
                  'submittedText': answer.submittedText,
              },
          ],
          'timeSpentSeconds': timeSpentSeconds,
        },
      );
      return _readObject(response.data, QuizAttemptResultModel.fromJson);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<QuizAttemptResultModel> getAttemptResult({
    required String quizId,
    required String attemptId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/quizzes/$quizId/attempts/$attemptId/result',
      );
      return _readObject(response.data, QuizAttemptResultModel.fromJson);
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
      throw ValidationException(response.message, response.errors);
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
