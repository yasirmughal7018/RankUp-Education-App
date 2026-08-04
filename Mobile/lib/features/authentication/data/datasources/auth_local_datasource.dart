import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:rankup_education/features/authentication/data/models/app_user_model.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';

/// Persists the cached signed-in user in secure storage.
class AuthLocalDataSource {
  const AuthLocalDataSource(this._storage);

  static const _userKey = 'rankup.currentUser';

  final FlutterSecureStorage _storage;

  Future<void> saveUser(AppUser user) {
    final model = AppUserModel.fromEntity(user);
    return _storage.write(key: _userKey, value: jsonEncode(model.toJson()));
  }

  Future<AppUser?> readUser() async {
    final encoded = await _storage.read(key: _userKey);
    if (encoded == null || encoded.isEmpty) {
      return null;
    }

    final decoded = jsonDecode(encoded);
    if (decoded is! Map) {
      return null;
    }

    return AppUserModel.fromJson(Map<String, dynamic>.from(decoded));
  }

  Future<void> clear() => _storage.delete(key: _userKey);
}
