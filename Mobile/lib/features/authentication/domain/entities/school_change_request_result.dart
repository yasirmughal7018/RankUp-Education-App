import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

/// Outcome of POST /auth/me/school-change.
class SchoolChangeRequestResult {
  const SchoolChangeRequestResult({
    required this.requestId,
    required this.isLocked,
    required this.isAccountFullyLocked,
    required this.message,
    this.lockedRole,
    this.continuedSession,
  });

  final int requestId;
  final bool isLocked;
  final bool isAccountFullyLocked;
  final String message;
  final UserRole? lockedRole;

  /// When role-scoped lock: session to continue as another role.
  final AuthSession? continuedSession;

  bool get canContinueAsOtherRole =>
      !isAccountFullyLocked && continuedSession != null;
}
