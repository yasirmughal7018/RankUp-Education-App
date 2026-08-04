import 'package:rankup_education/core/auth/permission.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';

/// Evaluates whether a user holds a given [Permission].
class ActionPermissionService {
  const ActionPermissionService();

  /// Returns true when the user's permission list includes [permission].
  bool can(AppUser user, Permission permission) {
    return user.permissions.contains(permission.value);
  }
}
