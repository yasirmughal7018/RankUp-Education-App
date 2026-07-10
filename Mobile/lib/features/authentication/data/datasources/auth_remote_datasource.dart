import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/authentication/data/models/app_user_model.dart';
import 'package:rankup_education/features/authentication/data/models/auth_session_model.dart';
import 'package:rankup_education/features/authentication/data/models/auth_tokens_model.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';

class AuthRemoteDataSource {
  const AuthRemoteDataSource(this._dio);

  final Dio _dio;

  Future<AuthSession> login({
    required String identifier,
    required String password,
  }) async {
    if (kDebugMode) {
      debugPrint(
        'AuthRemoteDataSource.login -> POST /auth/login '
        '(username: $identifier)',
      );
    }

    return _requestSession(
      '/auth/login',
      data: {'username': identifier, 'password': password},
    );
  }

  Future<({String status, String message})> getLoginStatus({
    required String identifier,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/login-status',
        data: {'username': identifier},
        options: Options(extra: {'skipAuthRefresh': true}),
      );
      final payload = _unwrap(response.data);
      return (
        status: payload['status'] as String? ?? 'Ready',
        message: payload['message'] as String? ?? '',
      );
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> setInitialPassword({
    required String identifier,
    required String newPassword,
  }) async {
    if (kDebugMode) {
      debugPrint(
        'AuthRemoteDataSource.setInitialPassword -> POST /auth/set-initial-password '
        '(username: $identifier)',
      );
    }

    return _requestVoid(
      '/auth/set-initial-password',
      data: {'username': identifier, 'newPassword': newPassword},
    );
  }

  Future<void> requestPasswordReset({required String identifier}) {
    return _requestVoid(
      '/auth/password-reset/request',
      data: {'username': identifier},
    );
  }

  Future<void> requestAccountAccess({
    required String fullName,
    required String mobileNumber,
    required String emailAddress,
    required String userType,
    required String rollNumberTeacherCode,
    required String reasonMessage,
    String? cnic,
    int? schoolId,
    int? campusId,
  }) {
    final adminTarget = schoolId != null ? 'School Admin' : 'Portal Admin';
    return _requestVoid(
      '/auth/register',
      data: {
        'fullName': fullName,
        'mobileNumber': mobileNumber,
        'emailAddress': emailAddress.isEmpty ? null : emailAddress,
        'userType': userType,
        'rollNumberTeacherCode':
            rollNumberTeacherCode.isEmpty ? null : rollNumberTeacherCode,
        'adminTarget': adminTarget,
        'reasonMessage': reasonMessage.isEmpty ? null : reasonMessage,
        if (cnic != null && cnic.isNotEmpty) 'cnic': cnic,
        if (schoolId != null) 'schoolId': schoolId,
        if (schoolId != null && campusId != null) 'campusId': campusId,
      },
    );
  }

  Future<List<({int id, String name})>> listRegistrationSchools() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/auth/registration-options/schools',
        options: Options(extra: {'skipAuthRefresh': true}),
      );
      final payload = _unwrap(response.data);
      final items = payload['items'] as List<dynamic>? ?? const [];
      return items
          .whereType<Map<String, dynamic>>()
          .map(
            (item) => (
              id: (item['id'] as num).toInt(),
              name: item['name'] as String? ?? 'School ${item['id']}',
            ),
          )
          .toList();
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<List<({int id, String name})>> listRegistrationCampuses(
    int schoolId,
  ) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/auth/registration-options/schools/$schoolId/campuses',
        options: Options(extra: {'skipAuthRefresh': true}),
      );
      final payload = _unwrap(response.data);
      final items = payload['items'] as List<dynamic>? ?? const [];
      return items
          .whereType<Map<String, dynamic>>()
          .map(
            (item) => (
              id: (item['id'] as num).toInt(),
              name: item['name'] as String? ?? 'Campus ${item['id']}',
            ),
          )
          .toList();
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<AuthTokensModel> refreshToken({required String refreshToken}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/token/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(extra: {'skipAuthRefresh': true}),
      );
      final payload = _unwrap(response.data);
      return AuthTokensModel.fromJson(payload);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<AppUser> getCurrentUser() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/auth/me');
      final payload = _unwrap(response.data);
      return AppUserModel.fromJson(payload);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<AppUser> changePassword({
    required String newPassword,
    String? currentPassword,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/change-password',
        data: {
          'newPassword': newPassword,
          if (currentPassword != null && currentPassword.isNotEmpty)
            'currentPassword': currentPassword,
        },
      );
      final payload = _unwrap(response.data);
      return AppUserModel.fromJson(payload);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> logout() => _requestVoid('/auth/logout');

  Future<AuthSession> _requestSession(
    String path, {
    required Map<String, dynamic> data,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        path,
        data: data,
        options: Options(extra: {'skipAuthRefresh': true}),
      );
      return AuthSessionModel.fromJson(_unwrap(response.data));
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> _requestVoid(String path, {Map<String, dynamic>? data}) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        path,
        data: data,
        options: Options(extra: {'skipAuthRefresh': true}),
      );
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }
}

Map<String, dynamic> _unwrap(Map<String, dynamic>? json) {
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

  return response.data;
}
