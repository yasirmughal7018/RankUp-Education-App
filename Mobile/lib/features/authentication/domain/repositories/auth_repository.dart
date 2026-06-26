import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';

abstract class AuthRepository {
  Future<AuthSession> login({
    required String identifier,
    required String password,
  });

  Future<AuthSession> refreshSession();

  Future<void> logout();

  Future<AuthSession?> restoreSession();
}
