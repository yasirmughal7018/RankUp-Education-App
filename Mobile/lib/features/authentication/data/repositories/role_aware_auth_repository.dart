import 'package:rankup_education/core/storage/token_store.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';

/// Routes student logins to the real API while parent/teacher demo accounts
/// continue using mock auth.
class RoleAwareAuthRepository implements AuthRepository {
  RoleAwareAuthRepository(
    this._apiRepository,
    this._mockRepository,
    this._tokenStore,
  );

  final AuthRepository _apiRepository;
  final AuthRepository _mockRepository;
  final TokenStore _tokenStore;

  static bool usesMockDemoLogin(String identifier) {
    final normalized = identifier.trim().toLowerCase();
    return normalized == 'parent-demo' || normalized == 'teacher-demo';
  }

  AuthRepository _repositoryForLogin(String identifier) {
    return usesMockDemoLogin(identifier) ? _mockRepository : _apiRepository;
  }

  Future<AuthRepository> _repositoryForSession() async {
    final token = await _tokenStore.readAccessToken();
    if (token != null && token.startsWith('mock-')) {
      return _mockRepository;
    }

    return _apiRepository;
  }

  @override
  Future<AuthSession> login({
    required String identifier,
    required String password,
  }) {
    return _repositoryForLogin(identifier).login(
      identifier: identifier,
      password: password,
    );
  }

  @override
  Future<void> requestPasswordReset({required String identifier}) {
    return _repositoryForLogin(identifier).requestPasswordReset(
      identifier: identifier,
    );
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
  }) {
    return _apiRepository.requestAccountAccess(
      fullName: fullName,
      mobileNumber: mobileNumber,
      emailAddress: emailAddress,
      userType: userType,
      schoolCampusName: schoolCampusName,
      studentOrEmployeeId: studentOrEmployeeId,
      adminTarget: adminTarget,
      reasonMessage: reasonMessage,
    );
  }

  @override
  Future<AuthSession> refreshSession() async {
    return (await _repositoryForSession()).refreshSession();
  }

  @override
  Future<void> logout() async {
    final repository = await _repositoryForSession();
    await repository.logout();
  }

  @override
  Future<AuthSession?> restoreSession() async {
    return (await _repositoryForSession()).restoreSession();
  }
}
