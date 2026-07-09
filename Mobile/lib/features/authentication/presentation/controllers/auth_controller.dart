import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/core/notifications/notification_service.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
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
    required String schoolCampusName,
    required String studentOrEmployeeId,
    required String adminTarget,
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
        schoolCampusName: schoolCampusName,
        studentOrEmployeeId: studentOrEmployeeId,
        adminTarget: adminTarget,
        reasonMessage: reasonMessage,
        cnic: cnic,
        schoolId: schoolId,
        campusId: campusId,
      );
      state = state.copyWith(
        isLoading: false,
        successMessage: 'Account request sent to $adminTarget.',
      );
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
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
