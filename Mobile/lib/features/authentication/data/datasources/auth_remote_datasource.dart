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
    required String schoolCampusName,
    required String studentOrEmployeeId,
    required String adminTarget,
    required String reasonMessage,
    String? cnic,
    int? schoolId,
    int? campusId,
  }) {
    return _requestVoid(
      '/auth/register',
      data: {
        'fullName': fullName,
        'mobileNumber': mobileNumber,
        'emailAddress': emailAddress,
        'userType': userType,
        'schoolCampusName': schoolCampusName,
        'studentOrEmployeeId': studentOrEmployeeId,
        'adminTarget': adminTarget,
        'reasonMessage': reasonMessage,
        if (cnic != null && cnic.isNotEmpty) 'cnic': cnic,
        if (schoolId != null) 'schoolId': schoolId,
        if (campusId != null) 'campusId': campusId,
      },
    );
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
    throw ValidationException(response.message, response.errors);
  }

  return response.data;
}
