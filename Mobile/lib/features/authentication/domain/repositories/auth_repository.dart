import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

abstract class AuthRepository {
  Future<AuthSession> login({
    required String identifier,
    required String password,
    required UserRole role,
  });

  Future<void> logout();

  Future<AuthSession?> restoreSession();
}
