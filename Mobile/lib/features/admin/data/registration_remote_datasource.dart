import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/admin/domain/pending_registration.dart';

class RegistrationRemoteDataSource {
  const RegistrationRemoteDataSource(this._dio);

  final Dio _dio;

  Future<List<PendingRegistration>> listPending({int take = 50}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/auth/registrations/pending',
        queryParameters: {'take': take},
      );
      final payload = _unwrapList(response.data);
      return payload
          .whereType<Map<String, dynamic>>()
          .map(PendingRegistration.fromJson)
          .toList();
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<ApproveRegistrationResult> approve(int userId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/registrations/$userId/approve',
      );
      return _unwrapApprove(response.data);
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> reject(int userId) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/auth/registrations/$userId/reject',
      );
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  Future<void> markRegistrationNotificationsRead() async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/notifications/read-category',
        queryParameters: {'category': 'RegistrationRequest'},
      );
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }
}

List<dynamic> _unwrapList(Map<String, dynamic>? json) {
  if (json == null) {
    throw const UnknownAppException('The server returned an empty response.');
  }

  final response = ApiResponse<List<dynamic>>.fromJson(
    json,
    (data) => data is List<dynamic> ? data : const [],
  );

  if (!response.success) {
    throw ValidationException.fromApi(message: response.message, errors: response.errors);
  }

  return response.data;
}

class ApproveRegistrationResult {
  const ApproveRegistrationResult({
    required this.userId,
    required this.username,
    required this.fullName,
    required this.isActivated,
    required this.message,
  });

  factory ApproveRegistrationResult.fromJson(Map<String, dynamic> json) {
    return ApproveRegistrationResult(
      userId: (json['userId'] as num?)?.toInt() ?? 0,
      username: json['username'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '',
      isActivated: json['isActivated'] as bool? ?? false,
      message: json['message'] as String? ?? '',
    );
  }

  final int userId;
  final String username;
  final String fullName;
  final bool isActivated;
  final String message;
}

ApproveRegistrationResult _unwrapApprove(Map<String, dynamic>? json) {
  if (json == null) {
    throw const UnknownAppException('The server returned an empty response.');
  }

  final response = ApiResponse<ApproveRegistrationResult>.fromJson(
    json,
    (data) => ApproveRegistrationResult.fromJson(
      data is Map<String, dynamic> ? data : const {},
    ),
  );

  if (!response.success) {
    throw ValidationException.fromApi(message: response.message, errors: response.errors);
  }

  return response.data;
}
