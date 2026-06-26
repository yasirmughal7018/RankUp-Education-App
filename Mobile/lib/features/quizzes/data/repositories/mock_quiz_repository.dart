import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

class MockQuizRepository implements QuizRepository {
  const MockQuizRepository();

  static final _quizzes = [
    QuizSummary(
      id: 'quiz-1',
      title: 'Fractions Practice',
      subject: 'Math',
      grade: 'Grade 7',
      questionCount: 15,
      points: 120,
      status: QuizStatus.assigned,
      dueAt: DateTime.now().add(const Duration(days: 2)),
    ),
    const QuizSummary(
      id: 'quiz-2',
      title: 'Grammar Builder',
      subject: 'English',
      grade: 'Grade 7',
      questionCount: 12,
      points: 90,
      status: QuizStatus.available,
    ),
    const QuizSummary(
      id: 'quiz-3',
      title: 'Forces and Motion',
      subject: 'Science',
      grade: 'Grade 7',
      questionCount: 20,
      points: 150,
      status: QuizStatus.upcoming,
    ),
  ];

  @override
  Future<List<QuizSummary>> getQuizzes({
    String? search,
    String? subject,
    String? grade,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 300));

    return _quizzes.where((quiz) {
      final matchesSearch =
          search == null ||
          search.isEmpty ||
          quiz.title.toLowerCase().contains(search.toLowerCase());
      final matchesSubject =
          subject == null ||
          subject.isEmpty ||
          quiz.subject.toLowerCase() == subject.toLowerCase();
      final matchesGrade =
          grade == null ||
          grade.isEmpty ||
          quiz.grade.toLowerCase() == grade.toLowerCase();

      return matchesSearch && matchesSubject && matchesGrade;
    }).toList();
  }
}
