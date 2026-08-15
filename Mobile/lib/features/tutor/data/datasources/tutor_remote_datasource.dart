import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/tutor/data/models/tutor_linked_student.dart';

/// Tutor-facing REST calls.
class TutorRemoteDataSource {
  const TutorRemoteDataSource(this._dio);

  final Dio _dio;

  Future<List<TutorLinkedStudent>> listLinkedStudents() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/tutors/me/students',
      );
      final payload = _readObject(response.data, (data) => data);
      final items = payload['items'];
      if (items is! List) {
        return const [];
      }
      return items
          .whereType<Map<dynamic, dynamic>>()
          .map(
            (item) =>
                TutorLinkedStudent.fromJson(Map<String, dynamic>.from(item)),
          )
          .where((student) => student.studentId > 0)
          .toList();
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<LinkTutorStudentResult> linkStudent({
    required String identifier,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/tutors/me/students',
        data: {'identifier': identifier.trim()},
      );
      final payload = _readObject(response.data, (data) => data);
      return LinkTutorStudentResult.fromJson(payload);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> unlinkStudent(int studentId) async {
    try {
      await _dio.delete<Map<String, dynamic>>(
        '/tutors/me/students/$studentId',
      );
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Map<String, dynamic> _readObject(
    Map<String, dynamic>? json,
    Map<String, dynamic> Function(Map<String, dynamic> data) mapper,
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
