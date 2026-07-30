import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists a stable per-install device id for Competition attempt lock.
final studentDeviceIdStoreProvider = Provider<StudentDeviceIdStore>(
  (ref) => const SecureStudentDeviceIdStore(FlutterSecureStorage()),
);

/// Reads/creates the mobile quiz device identifier (max 100 chars on API).
abstract class StudentDeviceIdStore {
  Future<String> getOrCreate();
}

/// [StudentDeviceIdStore] backed by platform secure storage.
class SecureStudentDeviceIdStore implements StudentDeviceIdStore {
  const SecureStudentDeviceIdStore(this._storage);

  static const _key = 'rankup.studentDeviceId';
  static const _maxLength = 100;

  final FlutterSecureStorage _storage;

  @override
  Future<String> getOrCreate() async {
    final existing = await _storage.read(key: _key);
    final trimmed = existing?.trim();
    if (trimmed != null && trimmed.isNotEmpty) {
      return trimmed.length <= _maxLength
          ? trimmed
          : trimmed.substring(0, _maxLength);
    }

    final created = _createId();
    await _storage.write(key: _key, value: created);
    return created;
  }

  String _createId() {
    final random = Random.secure();
    final suffix =
        List.generate(16, (_) => random.nextInt(36).toRadixString(36)).join();
    final id = 'mobile-${DateTime.now().millisecondsSinceEpoch}-$suffix';
    return id.length <= _maxLength ? id : id.substring(0, _maxLength);
  }
}
