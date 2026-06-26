import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

abstract class AuthRepository {
  Future<AuthSession> login({
    required String identifier,
    required String password,
    required UserRole role,
  });

  Future<void> requestOtp({required String identifier, required UserRole role});

  Future<AuthSession> verifyOtp({
    required String identifier,
    required String code,
    required UserRole role,
  });

  Future<void> requestPasswordReset({required String identifier});

  Future<AuthSession> refreshSession();

  Future<void> logout();

  Future<AuthSession?> restoreSession();
}
