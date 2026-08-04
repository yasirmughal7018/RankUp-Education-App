import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_attempt_models.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_attempt.dart';

/// Persists the last InProgress attempt session so students can resume offline.
///
/// New attempts still require an online [POST /quizzes/{id}/attempts] — only
/// resume of a previously started attempt works without the network.
class OfflineAttemptSessionStore {
  Future<File> _fileForQuiz(String quizId) async {
    final directory = await getApplicationDocumentsDirectory();
    return File('${directory.path}/rankup-quiz-attempt-session-$quizId.json');
  }

  Future<void> save(QuizAttemptSession session) async {
    final model = QuizAttemptSessionModel.fromSession(session);
    final file = await _fileForQuiz(session.quizId);
    await file.writeAsString(jsonEncode(model.toJson()));
  }

  Future<QuizAttemptSession?> load(String quizId) async {
    final file = await _fileForQuiz(quizId);
    if (!await file.exists()) {
      return null;
    }

    try {
      final raw = await file.readAsString();
      final json = jsonDecode(raw);
      if (json is! Map<String, dynamic>) {
        return null;
      }
      return QuizAttemptSessionModel.fromJson(json).copyWithResumed();
    } catch (_) {
      return null;
    }
  }

  Future<void> clear(String quizId) async {
    final file = await _fileForQuiz(quizId);
    if (await file.exists()) {
      await file.delete();
    }
  }

  Future<void> clearByAttempt({
    required String quizId,
    required String attemptId,
  }) async {
    final cached = await load(quizId);
    if (cached == null || cached.attemptId != attemptId) {
      return;
    }
    await clear(quizId);
  }
}
