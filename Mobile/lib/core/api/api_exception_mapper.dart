import 'dart:io';

import 'package:dio/dio.dart';
import 'package:rankup_education/core/errors/app_exception.dart';

/// Maps [DioException] HTTP failures to typed [AppException] values for the UI.
AppException mapDioException(DioException error) {
  final response = error.response;
  final statusCode = response?.statusCode;
  final data = response?.data;

  if (statusCode == 401) {
    final message = _messageFrom(data);
    if (message != 'Something went wrong. Please try again.') {
      return AuthenticationException(message);
    }
    return const AuthenticationException('Your session has expired.');
  }

  if (statusCode == 307 || statusCode == 308) {
    return const NetworkException(
      'The API redirected to HTTPS. Start the API with the http profile on port 5255.',
    );
  }

  if (statusCode == 403) {
    return const AuthorizationException(
      'You do not have permission to perform this action.',
    );
  }

  if (statusCode == 422 || statusCode == 400) {
    final errors = _errorsFrom(data);
    return ValidationException.fromApi(
      message: _messageFrom(data),
      errors: errors,
    );
  }

  if (statusCode == 429) {
    return ValidationException(
      _messageFrom(data),
      const ['Too many requests. Please wait and try again.'],
    );
  }

  if (_isConnectionFailure(error)) {
    return NetworkException(_connectionMessage(error));
  }

  return UnknownAppException(_messageFrom(data));
}

bool _isConnectionFailure(DioException error) {
  if (error.type == DioExceptionType.connectionError ||
      error.type == DioExceptionType.connectionTimeout ||
      error.type == DioExceptionType.receiveTimeout ||
      error.type == DioExceptionType.sendTimeout) {
    return true;
  }

  final underlying = error.error;
  if (underlying is SocketException) {
    return true;
  }

  final message = error.message?.toLowerCase() ?? '';
  return message.contains('connection refused') ||
      message.contains('failed host lookup') ||
      message.contains('network is unreachable') ||
      message.contains('connection reset');
}

String _connectionMessage(DioException error) {
  final underlying = error.error;
  if (underlying is SocketException) {
    return 'Cannot reach the API at the configured address. '
        'Start the Web API and confirm the emulator uses http://10.0.2.2:5255/api.';
  }

  return 'Network connection failed. Start the Web API and confirm the emulator '
      'uses http://10.0.2.2:5255/api.';
}

String _messageFrom(Object? data) {
  if (data is Map<String, dynamic>) {
    final message = data['message'] ?? data['title'];
    if (message is String && message.isNotEmpty) {
      return message;
    }
  }

  if (data is String && data.isNotEmpty) {
    return data;
  }

  return 'Something went wrong. Please try again.';
}

List<String> _errorsFrom(Object? data) {
  if (data is! Map<String, dynamic>) {
    return const [];
  }

  final errors = data['errors'];
  if (errors is List) {
    return errors.map((error) => error.toString()).toList();
  }

  if (errors is Map) {
    return errors.values
        .expand((value) => value is List ? value : [value])
        .map((error) => error.toString())
        .toList();
  }

  return const [];
}
