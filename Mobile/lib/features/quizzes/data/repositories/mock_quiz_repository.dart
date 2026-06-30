import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';
import 'package:rankup_education/features/quizzes/data/local/quiz_local_memory.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

class MockQuizRepository implements QuizRepository {
  const MockQuizRepository();

  static final List<QuizSummary> _quizzes = [...buildLocalQuizSummaries()];
  static bool _hasLoadedOverrides = false;

  @override
  Future<List<QuizSummary>> getQuizzes({
    String? search,
    String? subject,
    String? grade,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    await _loadPersistedOverrides();

    return _quizzes.where((quiz) {
      final matchesSearch = search == null ||
          search.isEmpty ||
          quiz.title.toLowerCase().contains(search.toLowerCase());
      final matchesSubject = subject == null ||
          subject.isEmpty ||
          quiz.subject.toLowerCase() == subject.toLowerCase();
      final matchesGrade = grade == null ||
          grade.isEmpty ||
          quiz.grade.toLowerCase() == grade.toLowerCase();

      return matchesSearch && matchesSubject && matchesGrade;
    }).toList();
  }

  @override
  Future<void> updateQuiz(QuizSummary quiz) async {
    final index = _quizzes.indexWhere((current) => current.id == quiz.id);
    if (index == -1) {
      return;
    }

    _quizzes[index] = quiz;
    await _savePersistedOverrides();
  }

  static Future<void> _loadPersistedOverrides() async {
    if (_hasLoadedOverrides) {
      return;
    }

    _hasLoadedOverrides = true;

    final file = await _storageFile();
    if (!file.existsSync()) {
      return;
    }

    final content = await file.readAsString();
    if (content.trim().isEmpty) {
      return;
    }

    final decoded = jsonDecode(content);
    if (decoded is! Map<String, dynamic>) {
      return;
    }

    for (final entry in decoded.entries) {
      final value = entry.value;
      if (value is! Map<String, dynamic>) {
        continue;
      }

      final index = _quizzes.indexWhere((quiz) => quiz.id == entry.key);
      if (index == -1) {
        continue;
      }

      _quizzes[index] = _quizzes[index].copyWith(
        status: _readQuizStatus(value['status'], _quizzes[index].status),
        resultStatus: _readString(value['resultStatus']),
        resultPercent: _readInt(value['resultPercent']),
        completedAt: _readDate(value['completedAt']),
        reviewAvailable: value['reviewAvailable'] == true,
      );
    }
  }

  static Future<void> _savePersistedOverrides() async {
    final file = await _storageFile();
    await file.parent.create(recursive: true);

    final payload = <String, Map<String, Object?>>{
      for (final quiz in _quizzes)
        quiz.id: {
          'status': quiz.status.name,
          'resultStatus': quiz.resultStatus,
          'resultPercent': quiz.resultPercent,
          'completedAt': quiz.completedAt?.toIso8601String(),
          'reviewAvailable': quiz.reviewAvailable,
        },
    };

    await file.writeAsString(jsonEncode(payload), flush: true);
  }

  static Future<File> _storageFile() async {
    try {
      final directory = await getApplicationSupportDirectory();
      return File(
        path.join(directory.path, 'rankup_quiz_local_overrides.json'),
      );
    } on Object {
      return File(
        path.join(
          Directory.systemTemp.path,
          'rankup_quiz_local_overrides.json',
        ),
      );
    }
  }

  static QuizStatus _readQuizStatus(Object? value, QuizStatus fallback) {
    if (value is! String || value.isEmpty) {
      return fallback;
    }

    return QuizStatus.values.firstWhere(
      (status) => status.name == value,
      orElse: () => fallback,
    );
  }

  static String _readString(Object? value) {
    return value is String ? value : '';
  }

  static int? _readInt(Object? value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }

    return null;
  }

  static DateTime? _readDate(Object? value) {
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }

    return null;
  }
}
