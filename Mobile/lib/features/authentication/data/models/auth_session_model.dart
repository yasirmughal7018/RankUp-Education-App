import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

class AuthSessionModel extends AuthSession {
  const AuthSessionModel({
    required super.user,
    required super.accessToken,
    required super.refreshToken,
  });

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
    };

    return AuthSessionModel(
      user: AppUser(
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
