import 'package:flutter_riverpod/flutter_riverpod.dart';

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService();
});

class NotificationService {
  Future<void> initialize() async {
    // Firebase Messaging and local notification channels are wired here.
  }

  Future<void> registerDeviceToken(String userId) async {
    // Send the push token to the API after login.
  }
}
