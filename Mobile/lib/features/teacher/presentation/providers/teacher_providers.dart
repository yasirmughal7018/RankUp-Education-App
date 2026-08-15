import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/features/teacher/data/datasources/teacher_remote_datasource.dart';
import 'package:rankup_education/features/teacher/data/models/teacher_roster_models.dart';

final teacherRemoteDataSourceProvider = Provider<TeacherRemoteDataSource>((ref) {
  return TeacherRemoteDataSource(ref.watch(dioProvider));
});

final teacherRosterProvider =
    FutureProvider.autoDispose<TeacherRoster>((ref) async {
  return ref.watch(teacherRemoteDataSourceProvider).getMyRoster();
});

final teacherGroupsProvider =
    FutureProvider.autoDispose<List<TeacherGroup>>((ref) async {
  return ref.watch(teacherRemoteDataSourceProvider).listMyGroups();
});
