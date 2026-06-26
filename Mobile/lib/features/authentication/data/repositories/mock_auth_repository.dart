import 'package:rankup_education/core/storage/token_store.dart';
import 'package:rankup_education/features/authentication/data/models/auth_session_model.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';

class MockAuthRepository implements AuthRepository {
  MockAuthRepository(this._tokenStore);

  final TokenStore _tokenStore;
  AuthSession? _session;

  @override
  Future<AuthSession> login({
    required String identifier,
    required String password,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 350));
    final role = _roleFromIdentifier(identifier);
    final session = AuthSessionModel.mock(role);
    _session = session;
    await _tokenStore.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    return session;
  }

  @override
  Future<AuthSession> refreshSession() async {
    final session = _session ?? AuthSessionModel.mock(UserRole.student);
    _session = session;
    await _tokenStore.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    return session;
  }

  @override
  Future<void> logout() async {
    _session = null;
    await _tokenStore.clear();
  }

  @override
  Future<AuthSession?> restoreSession() async {
    final token = await _tokenStore.readAccessToken();
    if (token == null || token.isEmpty) {
      return null;
    }

    return _session ??= AuthSessionModel.mock(UserRole.student);
  }
}

UserRole _roleFromIdentifier(String identifier) {
  final normalized = identifier.trim().toLowerCase();

  if (normalized.startsWith('parent') || normalized.startsWith('par-')) {
    return UserRole.parent;
  }

  if (normalized.startsWith('teacher') ||
      normalized.startsWith('teach') ||
      normalized.startsWith('tch-')) {
    return UserRole.teacher;
  }

  return UserRole.student;
}
