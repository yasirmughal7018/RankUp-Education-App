import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';

/// Authenticates credentials and returns a persisted session.
class LoginUseCase {
  const LoginUseCase(this._repository);

  final AuthRepository _repository;

  /// Signs in with [identifier] and [password].
  Future<AuthSession> call({
    required String identifier,
    required String password,
  }) {
    return _repository.login(
      identifier: identifier,
      password: password,
    );
  }
}
