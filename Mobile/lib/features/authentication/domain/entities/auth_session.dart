import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';

/// Active login session pairing the user with JWT tokens.
class AuthSession {
  const AuthSession({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });

  final AppUser user;
  final String accessToken;
  final String refreshToken;
}
