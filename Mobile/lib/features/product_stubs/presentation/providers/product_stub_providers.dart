import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/features/product_stubs/data/product_stub_models.dart';
import 'package:rankup_education/features/product_stubs/data/product_stub_remote_datasource.dart';

final productStubRemoteDataSourceProvider =
    Provider<ProductStubRemoteDataSource>((ref) {
  return ProductStubRemoteDataSource(ref.watch(dioProvider));
});

final notificationsProvider =
    FutureProvider.autoDispose<List<NotificationItem>>((ref) {
  return ref.watch(productStubRemoteDataSourceProvider).getNotifications();
});

final attendanceProvider =
    FutureProvider.autoDispose<List<AttendanceRecord>>((ref) {
  return ref.watch(productStubRemoteDataSourceProvider).getMyAttendance();
});

final messageThreadsProvider =
    FutureProvider.autoDispose<List<MessageThread>>((ref) {
  return ref.watch(productStubRemoteDataSourceProvider).getMessageThreads();
});

final rewardsProvider = FutureProvider.autoDispose<RewardSummary>((ref) {
  return ref.watch(productStubRemoteDataSourceProvider).getMyRewards();
});

final competitionsProvider =
    FutureProvider.autoDispose<List<CompetitionItem>>((ref) {
  return ref.watch(productStubRemoteDataSourceProvider).getCompetitions();
});

final worksheetsProvider =
    FutureProvider.autoDispose<List<WorksheetItem>>((ref) {
  return ref.watch(productStubRemoteDataSourceProvider).getWorksheets();
});
