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

List<String> _readStringList(Object? value) {
  if (value is List) {
    return value.map((item) => item.toString()).toList();
  }

  return const [];
}
