import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';

abstract class AuthRepository {
  Future<AuthSession> login({
    required String identifier,
    required String password,
  });

  /// Step 1: check whether account needs password setup or can sign in.
  Future<({String status, String message})> getLoginStatus({
    required String identifier,
  });

  /// After approval: set password only (no session). User must sign in afterward.
  Future<void> setInitialPassword({
    required String identifier,
    required String newPassword,
  });

  Future<void> requestPasswordReset({required String identifier});

  Future<void> requestAccountAccess({
    required String fullName,
    required String mobileNumber,
    required String emailAddress,
    required String userType,
    required String rollNumberTeacherCode,
    required String reasonMessage,
    String? cnic,
    int? schoolId,
    int? campusId,
  });

  Future<List<({int id, String name})>> listRegistrationSchools();

  Future<List<({int id, String name})>> listRegistrationCampuses(int schoolId);

  Future<AuthSession> refreshSession();

  Future<AuthSession> switchRole(String role);

  Future<AppUser> changePassword({
    required String newPassword,
    String? currentPassword,
  });

  /// Teacher / Student / CampusAdmin: request school or campus move (locks account).
  Future<({int requestId, bool isLocked, String message})> requestSchoolChange({
    int? schoolId,
    int? campusId,
  });

  Future<void> logout();

  Future<AuthSession?> restoreSession();
}
