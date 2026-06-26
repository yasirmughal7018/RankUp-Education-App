import 'package:flutter_riverpod/flutter_riverpod.dart';
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
      successMessage: clearSuccess
          ? null
          : successMessage ?? this.successMessage,
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository) : super(const AuthState());

  final AuthRepository _repository;

  Future<void> restoreSession() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final session = await _repository.restoreSession();
      state = state.copyWith(user: session?.user, isLoading: false);
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> login({
    required String identifier,
    required String password,
    required UserRole role,
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
        role: role,
      );
      state = state.copyWith(user: session.user, isLoading: false);
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> requestOtp({
    required String identifier,
    required UserRole role,
  }) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      await _repository.requestOtp(identifier: identifier, role: role);
      state = state.copyWith(
        isLoading: false,
        successMessage: 'OTP sent successfully.',
      );
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> verifyOtp({
    required String identifier,
    required String code,
    required UserRole role,
  }) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
    );
    try {
      final session = await _repository.verifyOtp(
        identifier: identifier,
        code: code,
        role: role,
      );
      state = state.copyWith(user: session.user, isLoading: false);
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
        successMessage: 'Password reset instructions sent.',
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
