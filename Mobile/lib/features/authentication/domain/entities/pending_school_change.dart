import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

/// Pending school/campus transfer from GET /auth/me.
class PendingSchoolChange {
  const PendingSchoolChange({
    required this.id,
    required this.toSchoolId,
    required this.toCampusId,
    required this.requestedAt,
    required this.status,
    required this.lockedRole,
    required this.isAccountFullyLocked,
  });

  final String id;
  final int? toSchoolId;
  final int? toCampusId;
  final String requestedAt;
  final String status;
  final UserRole? lockedRole;
  final bool isAccountFullyLocked;
}
