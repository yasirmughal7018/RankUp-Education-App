import 'package:rankup_education/core/storage/token_store.dart';
import 'package:rankup_education/features/authentication/data/datasources/auth_remote_datasource.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';

class ApiAuthRepository implements AuthRepository {
  ApiAuthRepository(this._remoteDataSource, this._tokenStore);

  final AuthRemoteDataSource _remoteDataSource;
  final TokenStore _tokenStore;

  @override
  Future<AuthSession> login({
    required String identifier,
    required String password,
    required UserRole role,
  }) async {
    final session = await _remoteDataSource.login(
      identifier: identifier,
      password: password,
      role: role,
    );
    await _tokenStore.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    return session;
  }

  @override
  Future<void> logout() => _tokenStore.clear();

  @override
  Future<AuthSession?> restoreSession() async {
    return null;
  }
}
