import 'package:dio/dio.dart';
import 'package:rankup_education/core/errors/app_exception.dart';

AppException mapDioException(DioException error) {
  final response = error.response;
  final statusCode = response?.statusCode;
  final data = response?.data;

  if (statusCode == 401) {
    return const AuthenticationException('Your session has expired.');
  }

  if (statusCode == 403) {
    return const AuthorizationException(
      'You do not have permission to perform this action.',
    );
  }

  if (statusCode == 422 || statusCode == 400) {
    return ValidationException(_messageFrom(data), _errorsFrom(data));
  }

  if (error.type == DioExceptionType.connectionError ||
      error.type == DioExceptionType.connectionTimeout ||
      error.type == DioExceptionType.receiveTimeout ||
      error.type == DioExceptionType.sendTimeout) {
    return const NetworkException(
      'Network connection failed. Please check your internet and try again.',
    );
  }

  return UnknownAppException(_messageFrom(data));
}

String _messageFrom(Object? data) {
  if (data is Map<String, dynamic>) {
    final message = data['message'];
    if (message is String && message.isNotEmpty) {
      return message;
    }
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
