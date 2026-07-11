import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

class AppUserModel extends AppUser {
  const AppUserModel({
    required super.id,
    required super.name,
    required super.role,
    required super.roles,
    required super.permissions,
    required super.schoolId,
    required super.campusId,
    required super.profileId,
    super.mustChangePassword = false,
  });

  factory AppUserModel.fromJson(Map<String, dynamic> json) {
    final role = parseUserRole(_readString(json, ['role']));
    final roles = _readRoles(json['roles'], fallback: role);

    return AppUserModel(
      id: _readString(json, ['id', 'userId']),
      name: _readString(json, ['name', 'fullName', 'displayName']),
      role: role,
      roles: roles,
      permissions: _readStringList(json['permissions']),
      schoolId: _readString(json, ['schoolId']),
      campusId: _readString(json, ['campusId']),
      profileId: _readString(json, ['profileId']),
      mustChangePassword: _readBool(json, ['mustChangePassword']),
    );
  }

  factory AppUserModel.fromEntity(AppUser user) {
    return AppUserModel(
      id: user.id,
      name: user.name,
      role: user.role,
      roles: user.roles,
      permissions: user.permissions,
      schoolId: user.schoolId,
      campusId: user.campusId,
      profileId: user.profileId,
      mustChangePassword: user.mustChangePassword,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'role': role.apiName,
      'roles': roles.map((role) => role.apiName).toList(),
      'permissions': permissions,
      'schoolId': schoolId,
      'campusId': campusId,
      'profileId': profileId,
      'mustChangePassword': mustChangePassword,
    };
  }
}

String _readString(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.isNotEmpty) {
      return value;
    }
    if (value is num) {
      return value.toString();
    }
  }

  return '';
}

bool _readBool(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is bool) {
      return value;
    }
  }

  return false;
}

List<String> _readStringList(Object? value) {
  if (value is List) {
    return value.map((item) => item.toString()).toList();
  }

  return const [];
}

List<UserRole> _readRoles(Object? value, {required UserRole fallback}) {
  if (value is List && value.isNotEmpty) {
    return value
        .map((item) => parseUserRole(item.toString()))
        .toSet()
        .toList();
  }

  return [fallback];
}
