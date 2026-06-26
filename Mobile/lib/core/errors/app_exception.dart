sealed class AppException implements Exception {
  const AppException(this.message);

  final String message;

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  const NetworkException(super.message);
}

class AuthenticationException extends AppException {
  const AuthenticationException(super.message);
}

class AuthorizationException extends AppException {
  const AuthorizationException(super.message);
}

class ValidationException extends AppException {
  const ValidationException(super.message, this.errors);

  final List<String> errors;
}

class UnknownAppException extends AppException {
  const UnknownAppException(super.message);
}
