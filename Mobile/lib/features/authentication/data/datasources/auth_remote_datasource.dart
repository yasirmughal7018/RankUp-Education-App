import 'package:dio/dio.dart';
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
    final response = await _dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'identifier': identifier, 'password': password, 'role': role.name},
    );

    throw UnimplementedError(
      'Map API response to AuthSession when backend schema is finalized. '
      'Raw response: ${response.statusCode}',
    );
  }
}
