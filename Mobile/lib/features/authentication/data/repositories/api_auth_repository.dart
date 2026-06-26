import 'package:rankup_education/core/storage/token_store.dart';
import 'package:rankup_education/features/authentication/data/datasources/auth_local_datasource.dart';
import 'package:rankup_education/features/authentication/data/datasources/auth_remote_datasource.dart';
import 'package:rankup_education/features/authentication/data/models/auth_session_model.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';

class ApiAuthRepository implements AuthRepository {
  ApiAuthRepository(
    this._remoteDataSource,
    this._localDataSource,
    this._tokenStore,
  );

  final AuthRemoteDataSource _remoteDataSource;
  final AuthLocalDataSource _localDataSource;
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
    await _localDataSource.saveUser(session.user);
    return session;
  }

  @override
  Future<void> requestOtp({
    required String identifier,
    required UserRole role,
  }) {
    return _remoteDataSource.requestOtp(identifier: identifier, role: role);
  }

  @override
  Future<AuthSession> verifyOtp({
    required String identifier,
    required String code,
    required UserRole role,
  }) async {
    final session = await _remoteDataSource.verifyOtp(
      identifier: identifier,
      code: code,
      role: role,
    );
    await _saveSession(session);
    return session;
  }

  @override
  Future<void> requestPasswordReset({required String identifier}) {
    return _remoteDataSource.requestPasswordReset(identifier: identifier);
  }

  @override
  Future<AuthSession> refreshSession() async {
    final refreshToken = await _tokenStore.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      throw StateError('Missing refresh token.');
    }

    final tokens = await _remoteDataSource.refreshToken(
      refreshToken: refreshToken,
    );
    await _tokenStore.saveTokens(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    );

    final user = await _remoteDataSource.getCurrentUser();
    await _localDataSource.saveUser(user);

    return AuthSessionModel(
      user: user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    );
  }

  @override
  Future<void> logout() async {
    try {
      await _remoteDataSource.logout();
    } finally {
      await _tokenStore.clear();
      await _localDataSource.clear();
    }
  }

  @override
  Future<AuthSession?> restoreSession() async {
    if (!await _tokenStore.hasTokens) {
      return null;
    }

    final accessToken = await _tokenStore.readAccessToken();
    final refreshToken = await _tokenStore.readRefreshToken();
    var user = await _localDataSource.readUser();

    final resolvedUser = user ?? await _remoteDataSource.getCurrentUser();
    await _localDataSource.saveUser(resolvedUser);

    return AuthSessionModel(
      user: resolvedUser,
      accessToken: accessToken!,
      refreshToken: refreshToken!,
    );
  }

  Future<void> _saveSession(AuthSession session) async {
    await _tokenStore.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    await _localDataSource.saveUser(session.user);
  }
}
