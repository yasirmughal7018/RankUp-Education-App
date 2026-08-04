import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';
import 'package:rankup_education/features/reports/data/datasources/report_remote_datasource.dart';
import 'package:rankup_education/features/reports/data/models/student_quiz_history_models.dart';

final reportRemoteDataSourceProvider = Provider<ReportRemoteDataSource>((ref) {
  return ReportRemoteDataSource(ref.watch(dioProvider));
});

/// Current student's quiz history (permissions: History self only).
final studentQuizHistoryProvider =
    FutureProvider.autoDispose<StudentQuizHistoryModel>((ref) async {
  final user = ref.watch(authControllerProvider).user;
  final profileId = int.tryParse(user?.profileId ?? '') ?? 0;
  if (profileId <= 0) {
    throw const UnknownAppException(
      'Student profile was not found on this account.',
    );
  }

  return ref
      .watch(reportRemoteDataSourceProvider)
      .getStudentQuizHistory(profileId);
});
