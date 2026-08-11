import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/features/parent/data/datasources/parent_remote_datasource.dart';
import 'package:rankup_education/features/parent/data/models/linked_student.dart';
import 'package:rankup_education/features/reports/data/models/student_quiz_history_models.dart';
import 'package:rankup_education/features/reports/presentation/providers/report_providers.dart';

final parentRemoteDataSourceProvider = Provider<ParentRemoteDataSource>((ref) {
  return ParentRemoteDataSource(ref.watch(dioProvider));
});

/// Linked children for the signed-in Parent.
final linkedStudentsProvider =
    FutureProvider.autoDispose<List<LinkedStudent>>((ref) async {
  return ref.watch(parentRemoteDataSourceProvider).listLinkedStudents();
});

/// Quiz history for a linked child (Parent scope).
final childQuizHistoryProvider = FutureProvider.autoDispose
    .family<StudentQuizHistoryModel, int>((ref, studentId) async {
  return ref
      .watch(reportRemoteDataSourceProvider)
      .getStudentQuizHistory(studentId);
});
