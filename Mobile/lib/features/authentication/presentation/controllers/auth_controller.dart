import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';

class AuthState {
  const AuthState({this.user, this.isLoading = false, this.errorMessage});

  final AppUser? user;
  final bool isLoading;
  final String? errorMessage;

  AuthState copyWith({
    AppUser? user,
    bool? isLoading,
    String? errorMessage,
    bool clearUser = false,
    bool clearError = false,
  }) {
    return AuthState(
      user: clearUser ? null : user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
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
    state = state.copyWith(isLoading: true, clearError: true);
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

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState();
  }
}
