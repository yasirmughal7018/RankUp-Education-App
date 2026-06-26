import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/app/environment.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/core/storage/token_store.dart';
import 'package:rankup_education/features/authentication/data/datasources/auth_remote_datasource.dart';
import 'package:rankup_education/features/authentication/data/repositories/api_auth_repository.dart';
import 'package:rankup_education/features/authentication/data/repositories/mock_auth_repository.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';
import 'package:rankup_education/features/authentication/presentation/controllers/auth_controller.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final environment = ref.watch(appEnvironmentProvider);
  final tokenStore = ref.watch(tokenStoreProvider);

  if (environment.enableMockRepositories) {
    return MockAuthRepository(tokenStore);
  }

  return ApiAuthRepository(
    AuthRemoteDataSource(ref.watch(dioProvider)),
    tokenStore,
  );
});

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    return AuthController(ref.watch(authRepositoryProvider));
  },
);
