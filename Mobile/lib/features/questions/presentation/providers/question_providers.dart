import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/features/questions/data/datasources/question_remote_datasource.dart';
import 'package:rankup_education/features/questions/data/models/question_summary_model.dart';

final questionRemoteDataSourceProvider =
    Provider<QuestionRemoteDataSource>((ref) {
  return QuestionRemoteDataSource(ref.watch(dioProvider));
});

final questionsListProvider =
    FutureProvider.autoDispose<List<QuestionSummaryModel>>((ref) {
  return ref.watch(questionRemoteDataSourceProvider).getQuestions();
});
