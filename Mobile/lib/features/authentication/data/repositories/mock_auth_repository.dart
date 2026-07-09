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
    final account = _findDemoAccount(identifier, password);
    final session = AuthSessionModel.mock(account.role);
    _session = session;
    await _tokenStore.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    return session;
  }

  @override
  Future<void> requestPasswordReset({required String identifier}) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
  }

  @override
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
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
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

class _DemoAccount {
  const _DemoAccount({
    required this.username,
    required this.password,
    required this.role,
  });

  final String username;
  final String password;
  final UserRole role;
}

const _demoAccounts = [
  _DemoAccount(
    username: 'student-demo',
    password: 'password',
    role: UserRole.student,
  ),
  _DemoAccount(
    username: 'parent-demo',
    password: 'password',
    role: UserRole.parent,
  ),
  _DemoAccount(
    username: 'teacher-demo',
    password: 'password',
    role: UserRole.teacher,
  ),
];

_DemoAccount _findDemoAccount(String identifier, String password) {
  final normalized = identifier.trim().toLowerCase();
  final normalizedPassword = password.trim();

  for (final account in _demoAccounts) {
    if (account.username == normalized &&
        account.password == normalizedPassword) {
      return account;
    }
  }

  throw const FormatException(
    'Invalid demo username or password. Use student-demo, parent-demo, or '
    'teacher-demo with password.',
  );
}
