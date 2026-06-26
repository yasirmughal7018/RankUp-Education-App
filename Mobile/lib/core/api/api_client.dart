import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/app/environment.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/storage/token_store.dart';

final dioProvider = Provider<Dio>((ref) {
  final environment = ref.watch(appEnvironmentProvider);
  final tokenStore = ref.watch(tokenStoreProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: environment.apiBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: const {'Accept': 'application/json'},
    ),
  );

  final refreshDio = Dio(
    BaseOptions(
      baseUrl: environment.apiBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: const {'Accept': 'application/json'},
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final accessToken = await tokenStore.readAccessToken();
        if (accessToken != null && accessToken.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $accessToken';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final shouldRefresh =
            error.response?.statusCode == 401 &&
            error.requestOptions.extra['skipAuthRefresh'] != true;

        if (!shouldRefresh) {
          handler.next(error);
          return;
        }

        try {
          final refreshToken = await tokenStore.readRefreshToken();
          if (refreshToken == null || refreshToken.isEmpty) {
            handler.next(error);
            return;
          }

          final tokens = await _refreshTokens(refreshDio, refreshToken);
          await tokenStore.saveTokens(
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          );

          final response = await dio.fetch<dynamic>(
            _retryOptions(error.requestOptions, tokens.accessToken),
          );
          handler.resolve(response);
        } on DioException catch (refreshError) {
          await tokenStore.clear();
          handler.reject(refreshError);
        } on Exception {
          await tokenStore.clear();
          handler.next(error);
        }
      },
    ),
  );

  if (environment.enableNetworkLogging) {
    dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        requestHeader: false,
        responseHeader: false,
      ),
    );
  }

  return dio;
});

Future<_RefreshTokens> _refreshTokens(Dio dio, String refreshToken) async {
  try {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/token/refresh',
      data: {'refreshToken': refreshToken},
      options: Options(extra: {'skipAuthRefresh': true}),
    );
    final data = response.data ?? <String, dynamic>{};
    final payload = data['data'] is Map<String, dynamic>
        ? data['data'] as Map<String, dynamic>
        : data;

    return _RefreshTokens(
      accessToken: _readToken(payload, ['accessToken', 'token', 'jwt']),
      refreshToken: _readToken(payload, ['refreshToken']),
    );
  } on DioException catch (error) {
    throw mapDioException(error);
  }
}

RequestOptions _retryOptions(RequestOptions request, String accessToken) {
  request.headers['Authorization'] = 'Bearer $accessToken';
  request.extra['skipAuthRefresh'] = true;
  return request;
}

String _readToken(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.isNotEmpty) {
      return value;
    }
  }

  return '';
}

class _RefreshTokens {
  const _RefreshTokens({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;
}
