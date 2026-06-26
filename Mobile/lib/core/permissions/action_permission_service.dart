import 'package:rankup_education/core/auth/permission.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';

class ActionPermissionService {
  const ActionPermissionService();

  bool can(AppUser user, Permission permission) {
    return user.permissions.contains(permission.value);
  }
}
