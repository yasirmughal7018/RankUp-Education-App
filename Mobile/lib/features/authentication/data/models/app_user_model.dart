import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/pending_school_change.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

/// JSON-serializable user model with tolerant field name parsing.
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
    super.pendingSchoolChange,
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
      pendingSchoolChange: _readPendingSchoolChange(json['pendingSchoolChange']),
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
      pendingSchoolChange: user.pendingSchoolChange,
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
      if (pendingSchoolChange != null)
        'pendingSchoolChange': {
          'id': pendingSchoolChange!.id,
          'toSchoolId': pendingSchoolChange!.toSchoolId,
          'toCampusId': pendingSchoolChange!.toCampusId,
          'requestedAt': pendingSchoolChange!.requestedAt,
          'status': pendingSchoolChange!.status,
          'lockedRole': pendingSchoolChange!.lockedRole?.apiName,
          'isAccountFullyLocked': pendingSchoolChange!.isAccountFullyLocked,
        },
    };
  }
}

PendingSchoolChange? _readPendingSchoolChange(Object? value) {
  if (value is! Map) {
    return null;
  }
  final json = Map<String, dynamic>.from(value);
  final lockedRaw = _readString(json, ['lockedRole']);
  return PendingSchoolChange(
    id: _readString(json, ['id']),
    toSchoolId: _readInt(json, ['toSchoolId']),
    toCampusId: _readInt(json, ['toCampusId']),
    requestedAt: _readString(json, ['requestedAt']),
    status: _readString(json, ['status']),
    lockedRole: lockedRaw.isEmpty ? null : parseUserRole(lockedRaw),
    isAccountFullyLocked: _readBool(
      json,
      ['isAccountFullyLocked'],
      defaultValue: true,
    ),
  );
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

int? _readInt(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is num) {
      return value.toInt();
    }
    if (value is String) {
      return int.tryParse(value);
    }
  }
  return null;
}

bool _readBool(
  Map<String, dynamic> json,
  List<String> keys, {
  bool defaultValue = false,
}) {
  for (final key in keys) {
    final value = json[key];
    if (value is bool) {
      return value;
    }
  }

  return defaultValue;
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
