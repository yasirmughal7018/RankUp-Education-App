import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/authentication/data/models/app_user_model.dart';
import 'package:rankup_education/features/authentication/data/models/auth_session_model.dart';
import 'package:rankup_education/features/authentication/data/models/auth_tokens_model.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

class AuthRemoteDataSource {
  const AuthRemoteDataSource(this._dio);

  final Dio _dio;

  Future<AuthSession> login({
    required String identifier,
    required String password,
    required UserRole role,
  }) async {
    return _requestSession(
      '/auth/login',
      data: {'identifier': identifier, 'password': password, 'role': role.name},
    );
  }

  Future<void> requestOtp({
    required String identifier,
    required UserRole role,
  }) async {
    await _requestVoid(
      '/auth/otp/request',
      data: {'identifier': identifier, 'role': role.name},
    );
  }

  Future<AuthSession> verifyOtp({
    required String identifier,
    required String code,
    required UserRole role,
  }) {
    return _requestSession(
      '/auth/otp/verify',
      data: {'identifier': identifier, 'code': code, 'role': role.name},
    );
  }

  Future<void> requestPasswordReset({required String identifier}) {
    return _requestVoid(
      '/auth/password/forgot',
      data: {'identifier': identifier},
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
      final response = await _dio.post<Map<String, dynamic>>(path, data: data);
      return AuthSessionModel.fromJson(_unwrap(response.data));
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> _requestVoid(String path, {Map<String, dynamic>? data}) async {
    try {
      await _dio.post<Map<String, dynamic>>(path, data: data);
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
