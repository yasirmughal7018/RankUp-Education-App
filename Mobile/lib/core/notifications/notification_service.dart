import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(ref.watch(dioProvider));
});

/// Push / local notification wiring.
///
/// Firebase Messaging is not bundled yet. After login we register a
/// development placeholder device with `POST /devices/register` so the
/// API path is exercised; replace [resolvePushToken] when FCM is added.
class NotificationService {
  NotificationService(this._dio);

  final Dio _dio;
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) {
      return;
    }
    // TODO(rankup): Firebase.initializeApp + FlutterLocalNotificationsPlugin.
    _initialized = true;
    if (kDebugMode) {
      debugPrint('NotificationService.initialize (placeholder)');
    }
  }

  Future<void> registerDeviceToken(String userId) async {
    await initialize();
    final pushToken = await resolvePushToken();
    try {
      await _dio.post<Map<String, dynamic>>(
        '/devices/register',
        data: {
          'deviceId': 'mobile-$userId',
          'platform': defaultTargetPlatform.name,
          'pushToken': pushToken,
          'appVersion': '0.1.0-dev',
        },
      );
    } on DioException catch (error) {
      if (kDebugMode) {
        debugPrint(
          'NotificationService.registerDeviceToken failed: ${error.message}',
        );
      }
    }
  }

  /// Override / replace when Firebase Messaging is integrated.
  Future<String?> resolvePushToken() async {
    // Placeholder token keeps the register endpoint callable in debug builds.
    if (kDebugMode) {
      return 'debug-push-token-placeholder';
    }
    return null;
  }
}
