import 'package:rankup_education/app/environment.dart';
import 'package:rankup_education/core/storage/token_store.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';

/// Uses the real API by default. Offline demo accounts are only available when
/// [AppEnvironment.enableMockRepositories] is true.
class RoleAwareAuthRepository implements AuthRepository {
  RoleAwareAuthRepository(
    this._apiRepository,
    this._mockRepository,
    this._tokenStore,
    this._environment,
  );

  final AuthRepository _apiRepository;
  final AuthRepository _mockRepository;
  final TokenStore _tokenStore;
  final AppEnvironment _environment;

  static const demoUsernames = {
    'student-demo',
    'parent-demo',
    'teacher-demo',
  };

  static bool isDemoUsername(String identifier) {
    return demoUsernames.contains(identifier.trim().toLowerCase());
  }

  AuthRepository _repositoryForLogin(String identifier) {
    if (_environment.enableMockRepositories && isDemoUsername(identifier)) {
      return _mockRepository;
    }

    return _apiRepository;
  }

  Future<AuthRepository> _repositoryForSession() async {
    if (!_environment.enableMockRepositories) {
      return _apiRepository;
    }

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
    String? cnic,
    int? schoolId,
    int? campusId,
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
      cnic: cnic,
      schoolId: schoolId,
      campusId: campusId,
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
