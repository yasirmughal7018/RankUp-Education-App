import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/features/questions/data/datasources/question_remote_datasource.dart';
import 'package:rankup_education/features/questions/data/models/question_summary_model.dart';

/// Provides [QuestionRemoteDataSource] wired to the shared authenticated [Dio].
final questionRemoteDataSourceProvider =
    Provider<QuestionRemoteDataSource>((ref) {
  return QuestionRemoteDataSource(ref.watch(dioProvider));
});

/// Loads the question-bank list for the current session (auto-disposed).
///
/// Calls [QuestionRemoteDataSource.getQuestions] with no filters. Server-side
/// scope already applies role + (when present) Campus/School/Public visibility;
/// Mobile UI should eventually surface [QuestionSummaryModel.visibility],
/// [QuestionSummaryModel.schoolId], and [QuestionSummaryModel.campusId] rather
/// than treating approval as PortalAdmin-only / binary.
final questionsListProvider =
    FutureProvider.autoDispose<List<QuestionSummaryModel>>((ref) {
  return ref.watch(questionRemoteDataSourceProvider).getQuestions();
});
