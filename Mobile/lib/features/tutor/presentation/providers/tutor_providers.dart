import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/features/reports/data/models/student_quiz_history_models.dart';
import 'package:rankup_education/features/reports/presentation/providers/report_providers.dart';
import 'package:rankup_education/features/tutor/data/datasources/tutor_remote_datasource.dart';
import 'package:rankup_education/features/tutor/data/models/tutor_linked_student.dart';

final tutorRemoteDataSourceProvider = Provider<TutorRemoteDataSource>((ref) {
  return TutorRemoteDataSource(ref.watch(dioProvider));
});

final tutorLinkedStudentsProvider =
    FutureProvider.autoDispose<List<TutorLinkedStudent>>((ref) async {
  return ref.watch(tutorRemoteDataSourceProvider).listLinkedStudents();
});

final tutorStudentHistoryProvider = FutureProvider.autoDispose
    .family<StudentQuizHistoryModel, int>((ref, studentId) async {
  return ref
      .watch(reportRemoteDataSourceProvider)
      .getStudentQuizHistory(studentId);
});
