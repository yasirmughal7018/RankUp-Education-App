import 'package:rankup_education/core/storage/token_store.dart';
import 'package:rankup_education/features/authentication/data/datasources/auth_local_datasource.dart';
import 'package:rankup_education/features/authentication/data/datasources/auth_remote_datasource.dart';
import 'package:rankup_education/features/authentication/data/models/auth_session_model.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';

/// Production auth repository backed by remote API and secure token storage.
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
  }) async {
    final session = await _remoteDataSource.login(
      identifier: identifier,
      password: password,
    );
    await _tokenStore.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    await _localDataSource.saveUser(session.user);
    return session;
  }

  @override
  Future<({String status, String message})> getLoginStatus({
    required String identifier,
  }) {
    return _remoteDataSource.getLoginStatus(identifier: identifier);
  }

  @override
  Future<void> setInitialPassword({
    required String identifier,
    required String newPassword,
  }) {
    return _remoteDataSource.setInitialPassword(
      identifier: identifier,
      newPassword: newPassword,
    );
  }

  @override
  Future<void> requestPasswordReset({required String identifier}) {
    return _remoteDataSource.requestPasswordReset(identifier: identifier);
  }

  @override
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
    return _remoteDataSource.requestAccountAccess(
      fullName: fullName,
      mobileNumber: mobileNumber,
      emailAddress: emailAddress,
      userType: userType,
      rollNumberTeacherCode: rollNumberTeacherCode,
      reasonMessage: reasonMessage,
      cnic: cnic,
      schoolId: schoolId,
      campusId: campusId,
    );
  }

  @override
  Future<List<({int id, String name})>> listRegistrationSchools() {
    return _remoteDataSource.listRegistrationSchools();
  }

  @override
  Future<List<({int id, String name})>> listRegistrationCampuses(int schoolId) {
    return _remoteDataSource.listRegistrationCampuses(schoolId);
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
  Future<AuthSession> switchRole(String role) async {
    final session = await _remoteDataSource.switchRole(role);
    await _tokenStore.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    await _localDataSource.saveUser(session.user);
    return session;
  }

  @override
  Future<AppUser> changePassword({
    required String newPassword,
    String? currentPassword,
  }) async {
    final user = await _remoteDataSource.changePassword(
      newPassword: newPassword,
      currentPassword: currentPassword,
    );
    final cleared = user.copyWith(mustChangePassword: false);
    await _localDataSource.saveUser(cleared);
    return cleared;
  }

  @override
  Future<({int requestId, bool isLocked, String message})> requestSchoolChange({
    int? schoolId,
    int? campusId,
  }) {
    return _remoteDataSource.requestSchoolChange(
      schoolId: schoolId,
      campusId: campusId,
    );
  }

  @override
  Future<void> logout() async {
    final refreshToken = await _tokenStore.readRefreshToken();
    try {
      await _remoteDataSource.logout(refreshToken: refreshToken);
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

    try {
      final resolvedUser = await _remoteDataSource.getCurrentUser();
      await _localDataSource.saveUser(resolvedUser);
      return AuthSessionModel(
        user: resolvedUser,
        accessToken: accessToken!,
        refreshToken: refreshToken!,
      );
    } catch (_) {
      final user = await _localDataSource.readUser();
      if (user == null) {
        return null;
      }

      return AuthSessionModel(
        user: user,
        accessToken: accessToken!,
        refreshToken: refreshToken!,
      );
    }
  }
}
