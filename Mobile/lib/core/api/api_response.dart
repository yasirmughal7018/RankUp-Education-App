/// Standard envelope returned by RankUp REST endpoints.
class ApiResponse<T> {
  const ApiResponse({
    required this.success,
    required this.message,
    required this.data,
    required this.errors,
  });

  /// Parses the API envelope and maps the `data` field with [fromData].
  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromData,
  ) {
    return ApiResponse<T>(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String? ?? '',
      data: fromData(json['data']),
      errors: (json['errors'] as List<dynamic>? ?? const [])
          .map((error) => error.toString())
          .toList(),
    );
  }

  final bool success;
  final String message;
  final T data;
  final List<String> errors;
}
