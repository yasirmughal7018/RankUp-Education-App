import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.role,
    required this.roles,
    required this.permissions,
    required this.schoolId,
    required this.campusId,
    required this.profileId,
    this.mustChangePassword = false,
  });

  final String id;
  final String name;
  final UserRole role;
  final List<UserRole> roles;
  final List<String> permissions;
  final String schoolId;
  final String campusId;
  final String profileId;
  final bool mustChangePassword;

  AppUser copyWith({
    String? id,
    String? name,
    UserRole? role,
    List<UserRole>? roles,
    List<String>? permissions,
    String? schoolId,
    String? campusId,
    String? profileId,
    bool? mustChangePassword,
  }) {
    return AppUser(
      id: id ?? this.id,
      name: name ?? this.name,
      role: role ?? this.role,
      roles: roles ?? this.roles,
      permissions: permissions ?? this.permissions,
      schoolId: schoolId ?? this.schoolId,
      campusId: campusId ?? this.campusId,
      profileId: profileId ?? this.profileId,
      mustChangePassword: mustChangePassword ?? this.mustChangePassword,
    );
  }
}
