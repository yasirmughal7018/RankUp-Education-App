/// Base type for user-facing application errors.
sealed class AppException implements Exception {
  const AppException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Connectivity or transport failure talking to the API.
class NetworkException extends AppException {
  const NetworkException(super.message);
}

/// Missing, expired, or invalid credentials.
class AuthenticationException extends AppException {
  const AuthenticationException(super.message);
}

/// Authenticated user lacks permission for the requested action.
class AuthorizationException extends AppException {
  const AuthorizationException(super.message);
}

/// Request rejected due to invalid input or business rules.
class ValidationException extends AppException {
  const ValidationException(super.message, this.errors);

  factory ValidationException.fromApi({
    required String message,
    List<String> errors = const [],
  }) {
    return ValidationException(
      resolveValidationMessage(message, errors),
      errors,
    );
  }

  final List<String> errors;
}

/// Prefer concrete validation errors over a generic envelope message.
String resolveValidationMessage(String message, List<String> errors) {
  final trimmedErrors =
      errors.map((error) => error.trim()).where((error) => error.isNotEmpty);
  final normalized = message.trim().toLowerCase();
  final isGeneric = normalized.isEmpty ||
      normalized == 'validation failed.' ||
      normalized == 'validation failed' ||
      normalized == 'one or more validation errors occurred.';

  if (trimmedErrors.isNotEmpty && isGeneric) {
    return trimmedErrors.join(' ');
  }
  if (message.trim().isNotEmpty) {
    return message.trim();
  }
  if (trimmedErrors.isNotEmpty) {
    return trimmedErrors.join(' ');
  }
  return 'Something went wrong. Please try again.';
}

/// Unclassified server or client failure.
class UnknownAppException extends AppException {
  const UnknownAppException(super.message);
}
