import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/core/storage/token_store.dart';
import 'package:rankup_education/features/authentication/data/datasources/auth_local_datasource.dart';
import 'package:rankup_education/features/authentication/data/datasources/auth_remote_datasource.dart';
import 'package:rankup_education/features/authentication/data/repositories/api_auth_repository.dart';
import 'package:rankup_education/features/authentication/data/repositories/mock_auth_repository.dart';
import 'package:rankup_education/features/authentication/data/repositories/role_aware_auth_repository.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';
import 'package:rankup_education/features/authentication/presentation/controllers/auth_controller.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final tokenStore = ref.watch(tokenStoreProvider);
  final apiRepository = ApiAuthRepository(
    AuthRemoteDataSource(ref.watch(dioProvider)),
    const AuthLocalDataSource(FlutterSecureStorage()),
    tokenStore,
  );
  final mockRepository = MockAuthRepository(tokenStore);

  return RoleAwareAuthRepository(apiRepository, mockRepository, tokenStore);
});

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    return AuthController(ref.watch(authRepositoryProvider));
  },
);
