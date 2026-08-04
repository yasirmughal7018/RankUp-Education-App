import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:rankup_education/app/environment.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/core/notifications/notification_service.dart';
import 'package:rankup_education/core/storage/token_store.dart';
import 'package:rankup_education/features/authentication/data/datasources/auth_local_datasource.dart';
import 'package:rankup_education/features/authentication/data/datasources/auth_remote_datasource.dart';
import 'package:rankup_education/features/authentication/data/repositories/api_auth_repository.dart';
import 'package:rankup_education/features/authentication/data/repositories/mock_auth_repository.dart';
import 'package:rankup_education/features/authentication/data/repositories/role_aware_auth_repository.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';
import 'package:rankup_education/features/authentication/presentation/controllers/auth_controller.dart';

/// Selects API or mock auth repository based on environment flags.
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final environment = ref.watch(appEnvironmentProvider);
  final tokenStore = ref.watch(tokenStoreProvider);
  final apiRepository = ApiAuthRepository(
    AuthRemoteDataSource(ref.watch(dioProvider)),
    const AuthLocalDataSource(FlutterSecureStorage()),
    tokenStore,
  );

  if (!environment.enableMockRepositories) {
    return apiRepository;
  }

  final mockRepository = MockAuthRepository(tokenStore);

  return RoleAwareAuthRepository(
    apiRepository,
    mockRepository,
    tokenStore,
    environment,
  );
});

/// Global auth session state shared by router and screens.
final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    return AuthController(
      ref.watch(authRepositoryProvider),
      ref.watch(notificationServiceProvider),
    );
  },
);
