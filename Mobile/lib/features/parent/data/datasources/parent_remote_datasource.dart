import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/parent/data/models/linked_student.dart';

/// Parent-facing REST calls.
class ParentRemoteDataSource {
  const ParentRemoteDataSource(this._dio);

  final Dio _dio;

  Future<List<LinkedStudent>> listLinkedStudents() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/parents/me/students',
      );
      final payload = _readObject(response.data, (data) => data);
      final items = payload['items'];
      if (items is! List) {
        return const [];
      }
      return items
          .whereType<Map<dynamic, dynamic>>()
          .map(
            (item) => LinkedStudent.fromJson(Map<String, dynamic>.from(item)),
          )
          .where((student) => student.studentId > 0)
          .toList();
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  /// Links a student to the signed-in parent by CNIC or username.
  Future<LinkMyChildResult> linkMyChild({
    required String identifier,
    String relationship = 'Guardian',
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/parents/me/students',
        data: {
          'identifier': identifier.trim(),
          'relationship': relationship.trim().isEmpty
              ? 'Guardian'
              : relationship.trim(),
        },
      );
      final payload = _readObject(response.data, (data) => data);
      return LinkMyChildResult.fromJson(payload);
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
