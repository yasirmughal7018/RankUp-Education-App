import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

class AppUserModel extends AppUser {
  const AppUserModel({
    required super.id,
    required super.name,
    required super.role,
    required super.permissions,
    required super.schoolId,
    required super.campusId,
    required super.profileId,
    super.mustChangePassword = false,
  });

  factory AppUserModel.fromJson(Map<String, dynamic> json) {
    return AppUserModel(
      id: _readString(json, ['id', 'userId']),
      name: _readString(json, ['name', 'fullName', 'displayName']),
      role: parseUserRole(_readString(json, ['role'])),
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
      'role': role.name,
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
