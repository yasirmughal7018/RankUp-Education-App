import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:path_provider/path_provider.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

/// Creates a sync idempotency key (max 64 chars on the API).
String createClientSyncId() {
  final random = Random.secure();
  final suffix = List.generate(8, (_) => random.nextInt(36).toRadixString(36)).join();
  return 'sync-${DateTime.now().millisecondsSinceEpoch}-$suffix';
}

/// One queued offline draft or submit for a quiz attempt.
class OfflineQuizSyncItem {
  const OfflineQuizSyncItem({
    required this.id,
    required this.quizId,
    required this.attemptId,
    required this.clientSyncId,
    required this.answers,
    required this.timeSpentSeconds,
    required this.deviceId,
    required this.submit,
    required this.isAutoSubmit,
    required this.queuedAt,
    this.focusLossDelta,
    this.clipboardPasteDelta,
  });

  factory OfflineQuizSyncItem.fromJson(Map<String, dynamic> json) {
    final rawAnswers = json['answers'];
    return OfflineQuizSyncItem(
      id: json['id']?.toString() ?? '',
      quizId: json['quizId']?.toString() ?? '',
      attemptId: json['attemptId']?.toString() ?? '',
      clientSyncId: json['clientSyncId']?.toString() ?? '',
      answers: rawAnswers is List
          ? [
              for (final entry in rawAnswers)
                if (entry is Map<String, dynamic>) _answerFromJson(entry),
            ]
          : const [],
      timeSpentSeconds: (json['timeSpentSeconds'] as num?)?.toInt() ?? 0,
      deviceId: json['deviceId']?.toString() ?? '',
      submit: json['submit'] == true,
      isAutoSubmit: json['isAutoSubmit'] == true,
      focusLossDelta: (json['focusLossDelta'] as num?)?.toInt(),
      clipboardPasteDelta: (json['clipboardPasteDelta'] as num?)?.toInt(),
      queuedAt: DateTime.tryParse(json['queuedAt']?.toString() ?? '')?.toUtc() ??
          DateTime.now().toUtc(),
    );
  }

  final String id;
  final String quizId;
  final String attemptId;
  final String clientSyncId;
  final List<QuizAnswerSubmission> answers;
  final int timeSpentSeconds;
  final String deviceId;
  final bool submit;
  final bool isAutoSubmit;
  final int? focusLossDelta;
  final int? clipboardPasteDelta;
  final DateTime queuedAt;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'quizId': quizId,
      'attemptId': attemptId,
      'clientSyncId': clientSyncId,
      'answers': [
        for (final answer in answers) _answerToJson(answer),
      ],
      'timeSpentSeconds': timeSpentSeconds,
      'deviceId': deviceId,
      'submit': submit,
      'isAutoSubmit': isAutoSubmit,
      if (focusLossDelta != null) 'focusLossDelta': focusLossDelta,
      if (clipboardPasteDelta != null) 'clipboardPasteDelta': clipboardPasteDelta,
      'queuedAt': queuedAt.toUtc().toIso8601String(),
    };
  }
}

Map<String, dynamic> _answerToJson(QuizAnswerSubmission answer) {
  return {
    'questionId': answer.questionId,
    if (answer.selectedOptionId != null) 'selectedOptionId': answer.selectedOptionId,
    if (answer.selectedOptionIds != null) 'selectedOptionIds': answer.selectedOptionIds,
    if (answer.submittedText != null) 'submittedText': answer.submittedText,
    if (answer.isMarkedForReview != null)
      'isMarkedForReview': answer.isMarkedForReview,
    if (answer.timeSpentSeconds != null) 'timeSpentSeconds': answer.timeSpentSeconds,
  };
}

QuizAnswerSubmission _answerFromJson(Map<String, dynamic> json) {
  final selectedIds = json['selectedOptionIds'];
  return QuizAnswerSubmission(
    questionId: json['questionId']?.toString() ?? '',
    selectedOptionId: json['selectedOptionId']?.toString(),
    selectedOptionIds: selectedIds is List
        ? [
            for (final id in selectedIds) id.toString(),
          ]
        : null,
    submittedText: json['submittedText']?.toString(),
    isMarkedForReview: json['isMarkedForReview'] as bool?,
    timeSpentSeconds: (json['timeSpentSeconds'] as num?)?.toInt(),
  );
}

/// Persists at most one draft + one submit per attempt (mirrors web localStorage queue).
class OfflineQuizSyncStore {
  Future<File> _fileFor(String attemptId) async {
    final directory = await getApplicationDocumentsDirectory();
    return File('${directory.path}/rankup-quiz-offline-queue-$attemptId.json');
  }

  Future<List<OfflineQuizSyncItem>> list(String attemptId) async {
    if (attemptId.isEmpty) {
      return const [];
    }

    final file = await _fileFor(attemptId);
    if (!await file.exists()) {
      return const [];
    }

    try {
      final decoded = jsonDecode(await file.readAsString());
      if (decoded is! List) {
        return const [];
      }
      return [
        for (final entry in decoded)
          if (entry is Map<String, dynamic>) OfflineQuizSyncItem.fromJson(entry),
      ];
    } on Object {
      return const [];
    }
  }

  Future<void> _write(String attemptId, List<OfflineQuizSyncItem> items) async {
    final file = await _fileFor(attemptId);
    if (items.isEmpty) {
      if (await file.exists()) {
        await file.delete();
      }
      return;
    }

    await file.writeAsString(
      jsonEncode([for (final item in items) item.toJson()]),
    );
  }

  Future<int> count(String attemptId) async => (await list(attemptId)).length;

  /// Enqueues or replaces the latest draft/submit payload.
  /// Reuses one [clientSyncId] per attempt so the API MarkOfflineAttempt rule is satisfied.
  Future<OfflineQuizSyncItem> enqueue({
    required String quizId,
    required String attemptId,
    required List<QuizAnswerSubmission> answers,
    required int timeSpentSeconds,
    required String deviceId,
    required bool submit,
    bool isAutoSubmit = false,
    int? focusLossDelta,
    int? clipboardPasteDelta,
    String? clientSyncId,
  }) async {
    final existing = await list(attemptId);
    final reusedId = clientSyncId ??
        existing
            .map((item) => item.clientSyncId)
            .firstWhere((id) => id.isNotEmpty, orElse: createClientSyncId);

    final next = OfflineQuizSyncItem(
      id: '$attemptId-$reusedId-${submit ? 'submit' : 'draft'}',
      quizId: quizId,
      attemptId: attemptId,
      clientSyncId: reusedId,
      answers: answers,
      timeSpentSeconds: timeSpentSeconds,
      deviceId: deviceId,
      submit: submit,
      isAutoSubmit: isAutoSubmit,
      focusLossDelta: focusLossDelta,
      clipboardPasteDelta: clipboardPasteDelta,
      queuedAt: DateTime.now().toUtc(),
    );

    final filtered = existing.where((item) => item.submit != submit).toList();
    await _write(attemptId, [...filtered, next]);
    return next;
  }

  Future<void> remove(String attemptId, String id) async {
    final remaining =
        (await list(attemptId)).where((item) => item.id != id).toList();
    await _write(attemptId, remaining);
  }

  Future<void> clear(String attemptId) async {
    await _write(attemptId, const []);
  }
}
