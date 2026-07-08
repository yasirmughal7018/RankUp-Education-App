import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';

/// Resolves the REST API base URL for the current device.
///
/// Android emulators must use [hostLoopbackAddress] (`10.0.2.2`) to reach the
/// developer machine. `localhost` inside the emulator points to the emulator
/// itself, so API breakpoints on the host will never be hit.
String resolveApiBaseUrl(String fromDartDefine) {
  final trimmed = fromDartDefine.trim();
  if (trimmed.isNotEmpty) {
    return _normalize(trimmed);
  }

  if (kIsWeb) {
    return 'http://localhost:5255/api';
  }

  if (Platform.isAndroid) {
    return 'http://$hostLoopbackAddress:5255/api';
  }

  return 'http://localhost:5255/api';
}

/// Special alias to the host machine from the Android emulator.
const hostLoopbackAddress = '10.0.2.2';

bool usesHostUnreachableLocalhost(String apiBaseUrl) {
  if (kIsWeb || !Platform.isAndroid) {
    return false;
  }

  final normalized = apiBaseUrl.toLowerCase();
  return normalized.contains('://localhost') ||
      normalized.contains('://127.0.0.1');
}

String _normalize(String url) {
  return url.endsWith('/') ? url.substring(0, url.length - 1) : url;
}
