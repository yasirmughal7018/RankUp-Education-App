import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/core/lookups/lookup_item.dart';

/// REST client for `/api/lookups`.
class LookupRemoteDataSource {
  const LookupRemoteDataSource(this._dio);

  final Dio _dio;

  Future<List<LookupItem>> list({
    required String type,
    int? parentId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/lookups',
        queryParameters: {
          'type': type,
          if (parentId != null && parentId > 0) 'parentId': parentId,
        },
      );

      if (response.data == null) {
        throw const UnknownAppException('The server returned an empty response.');
      }

      final envelope = ApiResponse<List<LookupItem>>.fromJson(
        response.data!,
        (data) {
          final items = data is Map<String, dynamic> ? data['items'] : data;
          if (items is! List) {
            return const <LookupItem>[];
          }
          return items
              .whereType<Map<String, dynamic>>()
              .map(LookupItem.fromJson)
              .toList();
        },
      );

      if (!envelope.success) {
        throw ValidationException.fromApi(
          message: envelope.message,
          errors: envelope.errors,
        );
      }

      return envelope.data;
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }
}
