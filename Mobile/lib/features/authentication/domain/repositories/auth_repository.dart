import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';

abstract class AuthRepository {
  Future<AuthSession> login({
    required String identifier,
    required String password,
  });

  Future<void> requestPasswordReset({required String identifier});

  Future<void> requestAccountAccess({
    required String fullName,
    required String mobileNumber,
    required String emailAddress,
    required String userType,
    required String schoolCampusName,
    required String studentOrEmployeeId,
    required String adminTarget,
    required String reasonMessage,
  });

  Future<AuthSession> refreshSession();

  Future<void> logout();

  Future<AuthSession?> restoreSession();
}
