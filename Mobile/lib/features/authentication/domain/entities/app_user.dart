import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.role,
    required this.permissions,
    required this.schoolId,
    required this.campusId,
    required this.profileId,
  });

  final String id;
  final String name;
  final UserRole role;
  final List<String> permissions;
  final String schoolId;
  final String campusId;
  final String profileId;
}
