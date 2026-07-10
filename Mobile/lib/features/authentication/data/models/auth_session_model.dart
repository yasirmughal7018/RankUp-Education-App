import 'package:rankup_education/features/authentication/data/models/app_user_model.dart';
import 'package:rankup_education/features/authentication/data/models/auth_tokens_model.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

class AuthSessionModel extends AuthSession {
  const AuthSessionModel({
    required super.user,
    required super.accessToken,
    required super.refreshToken,
  });

  factory AuthSessionModel.fromJson(Map<String, dynamic> json) {
    final userJson = _readMap(json, ['user', 'profile', 'account']);
    final tokenJson = _readMap(json, ['tokens', 'token']);
    final tokens = AuthTokensModel.fromJson({...json, ...tokenJson});

    return AuthSessionModel(
      user: AppUserModel.fromJson(userJson),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    );
  }

  factory AuthSessionModel.mock(UserRole role) {
    final permissions = switch (role) {
      UserRole.student => [
          'dashboard.view',
          'quiz.attempt',
          'worksheet.submit',
          'message.send',
        ],
      UserRole.parent => [
          'dashboard.view',
          'child.view',
          'goal.create',
          'message.send',
        ],
      UserRole.teacher => [
          'dashboard.view',
          'quiz.create',
          'worksheet.review',
          'attendance.mark',
          'message.send',
        ],
      UserRole.schoolAdmin || UserRole.portalAdmin => [
          'dashboard.view',
          'registration.approve',
          'notification.view',
        ],
    };

    return AuthSessionModel(
      user: AppUserModel(
        id: 'mock-${role.name}-001',
        name: '${role.label} Demo',
        role: role,
        permissions: permissions,
        schoolId: 'school-demo',
        campusId: 'campus-main',
        profileId: 'profile-${role.name}',
      ),
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    );
  }
}

Map<String, dynamic> _readMap(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is Map<String, dynamic>) {
      return value;
    }
  }

  return json;
}
