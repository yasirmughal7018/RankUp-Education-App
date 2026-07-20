import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/core/notifications/notification_service.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';

class AuthState {
  const AuthState({
    this.user,
    this.isLoading = false,
    this.errorMessage,
    this.successMessage,
  });

  final AppUser? user;
  final bool isLoading;
  final String? errorMessage;
  final String? successMessage;

  AuthState copyWith({
    AppUser? user,
    bool? isLoading,
    String? errorMessage,
    String? successMessage,
    bool clearUser = false,
    bool clearError = false,
    bool clearSuccess = false,
  }) {
    return AuthState(
      user: clearUser ? null : user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      successMessage:
          clearSuccess ? null : successMessage ?? this.successMessage,
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository, this._notifications)
      : super(const AuthState());

  final AuthRepository _repository;
  final NotificationService _notifications;

  Future<void> restoreSession() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final session = await _repository.restoreSession();
      state = state.copyWith(user: session?.user, isLoading: false);
      final user = session?.user;
      if (user != null) {
        await _notifications.registerDeviceToken(user.id);
      }
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> login({
    required String identifier,
    required String password,
  }) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      final session = await _repository.login(
        identifier: identifier,
        password: password,
      );
      state = state.copyWith(user: session.user, isLoading: false);
      await _notifications.registerDeviceToken(session.user.id);
    } on AppException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<({String status, String message})> getLoginStatus({
    required String identifier,
  }) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      final result = await _repository.getLoginStatus(identifier: identifier);
      state = state.copyWith(isLoading: false);
      return result;
    } on AppException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
      rethrow;
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
      rethrow;
    }
  }

  Future<void> setInitialPassword({
    required String identifier,
    required String newPassword,
  }) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      await _repository.setInitialPassword(
        identifier: identifier,
        newPassword: newPassword,
      );
      state = state.copyWith(
        isLoading: false,
        successMessage:
            'Password set successfully. Sign in with your new password.',
      );
    } on AppException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
      rethrow;
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
      rethrow;
    }
  }

  Future<void> requestPasswordReset({required String identifier}) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      await _repository.requestPasswordReset(identifier: identifier);
      state = state.copyWith(
        isLoading: false,
        successMessage: 'Password reset request sent to admin.',
      );
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

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
  }) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      await _repository.requestAccountAccess(
        fullName: fullName,
        mobileNumber: mobileNumber,
        emailAddress: emailAddress,
        userType: userType,
        rollNumberTeacherCode: rollNumberTeacherCode,
        reasonMessage: reasonMessage,
        cnic: cnic,
        schoolId: schoolId,
        campusId: campusId,
      );
      final routing = schoolId != null && campusId != null
          ? 'Campus Admin / School Admin (recorded) and Portal Admin '
              '(required to activate)'
          : schoolId != null
              ? 'School Admin (recorded) and Portal Admin (required to activate)'
              : 'Portal Admin';
      state = state.copyWith(
        isLoading: false,
        successMessage:
            'Account request sent to $routing. After Portal Admin approval, '
            'set your initial password on the login screen, then sign in.',
      );
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> changePassword({
    required String newPassword,
    String? currentPassword,
  }) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      final user = await _repository.changePassword(
        newPassword: newPassword,
        currentPassword: currentPassword,
      );
      state = state.copyWith(
        user: user,
        isLoading: false,
        successMessage: 'Password updated. You can continue.',
      );
    } on AppException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
      rethrow;
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
      rethrow;
    }
  }

  Future<void> switchRole(String role) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      final session = await _repository.switchRole(role);
      state = state.copyWith(
        user: session.user,
        isLoading: false,
        successMessage: 'Switched to ${session.user.role.label}.',
      );
    } on AppException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
      rethrow;
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
      rethrow;
    }
  }

  Future<({int requestId, bool isLocked, String message})> requestSchoolChange({
    int? schoolId,
    int? campusId,
  }) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      final result = await _repository.requestSchoolChange(
        schoolId: schoolId,
        campusId: campusId,
      );
      state = state.copyWith(isLoading: false);
      return result;
    } on AppException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
      rethrow;
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
      rethrow;
    }
  }

  Future<void> refreshSession() async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      final session = await _repository.refreshSession();
      state = state.copyWith(user: session.user, isLoading: false);
    } on Exception catch (error) {
      state = state.copyWith(
        isLoading: false,
        clearUser: true,
        errorMessage: error.toString(),
      );
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState();
  }
}
