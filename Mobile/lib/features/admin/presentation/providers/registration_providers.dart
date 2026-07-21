import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/features/admin/data/registration_remote_datasource.dart';
import 'package:rankup_education/features/admin/domain/pending_registration.dart';

/// Riverpod wiring for registration approval API calls.
final registrationRemoteDataSourceProvider =
    Provider<RegistrationRemoteDataSource>((ref) {
  return RegistrationRemoteDataSource(ref.watch(dioProvider));
});

/// Cached pending registration list for admin approval screen.
final pendingRegistrationsProvider =
    FutureProvider.autoDispose<List<PendingRegistration>>((ref) async {
  final dataSource = ref.watch(registrationRemoteDataSourceProvider);
  return dataSource.listPending();
});
