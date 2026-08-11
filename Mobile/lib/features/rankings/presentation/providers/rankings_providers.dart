import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/rankings/data/models/student_ranking_models.dart';
import 'package:rankup_education/features/reports/presentation/providers/report_providers.dart';

/// Class or school peer rankings for the signed-in student.
final studentRankingsProvider = FutureProvider.autoDispose
    .family<StudentRankingReportModel, String>((ref, scope) async {
  return ref.watch(reportRemoteDataSourceProvider).getMyRankings(scope: scope);
});
