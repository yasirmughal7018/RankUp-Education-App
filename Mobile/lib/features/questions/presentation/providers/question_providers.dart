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
final questionsListProvider =
    FutureProvider.autoDispose<List<QuestionSummaryModel>>((ref) {
  return ref.watch(questionRemoteDataSourceProvider).getQuestions();
});

/// Quiz-eligible bank questions only (Public + Active on the server).
final eligibleBankQuestionsProvider =
    FutureProvider.autoDispose<List<QuestionSummaryModel>>((ref) {
  return ref.watch(questionRemoteDataSourceProvider).getQuestions(
        eligibleForQuizOnly: true,
      );
});

/// Pending question approval queue for Campus/School/Portal admins.
final pendingQuestionApprovalsProvider =
    FutureProvider.autoDispose<List<QuestionSummaryModel>>((ref) {
  return ref.watch(questionRemoteDataSourceProvider).listPendingApproval();
});

/// Single bank question detail.
final questionDetailProvider =
    FutureProvider.autoDispose.family<QuestionSummaryModel, String>((ref, id) {
  return ref.watch(questionRemoteDataSourceProvider).getQuestion(id);
});
