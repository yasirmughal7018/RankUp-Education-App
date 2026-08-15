import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/teacher/data/models/teacher_roster_models.dart';

class TeacherRemoteDataSource {
  const TeacherRemoteDataSource(this._dio);

  final Dio _dio;

  Future<TeacherRoster> getMyRoster() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/teachers/me/roster',
      );
      final payload = _readObject(response.data, (data) => data);
      return TeacherRoster.fromJson(payload);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<List<TeacherGroup>> listMyGroups() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/teachers/me/groups',
      );
      final payload = _readObject(response.data, (data) => data);
      final items = payload['items'];
      if (items is! List) {
        return const [];
      }
      return items
          .whereType<Map<dynamic, dynamic>>()
          .map((item) => TeacherGroup.fromJson(Map<String, dynamic>.from(item)))
          .where((group) => group.groupId > 0)
          .toList();
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<AddMyStudentResult> addMyStudent({
    required String identifier,
    required int grade,
    required String section,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/teachers/me/students',
        data: {
          'identifier': identifier.trim(),
          'grade': grade,
          'section': section.trim(),
        },
      );
      final payload = _readObject(response.data, (data) => data);
      return AddMyStudentResult.fromJson(payload);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<TeacherGroup> createGroup({
    required String groupName,
    String description = '',
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/teachers/me/groups',
        data: {
          'groupName': groupName.trim(),
          'description': description.trim(),
        },
      );
      final payload = _readObject(response.data, (data) => data);
      return TeacherGroup.fromJson(payload);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<TeacherGroup> addGroupMember({
    required int groupId,
    required int studentId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/teachers/me/groups/$groupId/members',
        data: {'studentId': studentId},
      );
      final payload = _readObject(response.data, (data) => data);
      return TeacherGroup.fromJson(payload);
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
