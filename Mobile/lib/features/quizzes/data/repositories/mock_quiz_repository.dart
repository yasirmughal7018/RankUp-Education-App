import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

class MockQuizRepository implements QuizRepository {
  const MockQuizRepository();

  static final _quizzes = [
    QuizSummary(
      id: 'quiz-1',
      title: 'Fractions Mastery Check',
      description:
          'Assigned quiz to check fraction addition, subtraction, and word problems.',
      quizType: 'Assessment Quiz',
      subject: 'Mathematics',
      grade: 'Grade 5',
      topic: 'Fractions',
      curriculum: 'National Curriculum',
      book: 'Mathematics Book 5',
      chapter: 'Chapter 4',
      learningObjective: 'Solve fraction problems with unlike denominators.',
      difficulty: 'Medium',
      questionCount: 15,
      points: 120,
      totalMarks: 30,
      timeLimitMinutes: 25,
      attemptLimit: 1,
      status: QuizStatus.assigned,
      resultStatus: 'Not Started',
      startAt: DateTime.now().subtract(const Duration(hours: 2)),
      dueAt: DateTime.now().add(const Duration(days: 2)),
      instructions: const [
        'Read every question carefully before selecting an answer.',
        'You can move freely between questions.',
        'Answers are saved automatically when you move to the next question.',
        'Submit before the timer ends.',
      ],
      navigationMode: 'Free Navigation',
      answersCanBeChanged: true,
      hintsAllowed: false,
      reviewAvailable: true,
      createdBy: 'Ms. Fatima',
      schoolName: 'ABC School',
    ),
    QuizSummary(
      id: 'quiz-2',
      title: 'Present and Past Tenses',
      description:
          'AI recommended practice quiz for improving English grammar basics.',
      quizType: 'Practice Quiz',
      subject: 'English',
      grade: 'Grade 5',
      topic: 'Tenses',
      curriculum: 'School Curriculum',
      book: 'English Grammar 5',
      chapter: 'Chapter 6',
      learningObjective: 'Identify present and past tense usage in sentences.',
      difficulty: 'Easy',
      questionCount: 12,
      points: 90,
      totalMarks: 24,
      attemptLimit: 3,
      status: QuizStatus.available,
      resultStatus: 'In Progress',
      instructions: const [
        'Practice quizzes can be attempted more than once.',
        'Hints are available after you try each question.',
        'Correct answers may be reviewed after submission.',
      ],
      navigationMode: 'Free Navigation',
      answersCanBeChanged: true,
      hintsAllowed: true,
      reviewAvailable: true,
      createdBy: 'AI',
      schoolName: 'ABC School',
    ),
    QuizSummary(
      id: 'quiz-3',
      title: 'Science Competition Warm-up',
      description:
          'Scheduled quiz for science competition preparation. It opens at the fixed time.',
      quizType: 'Competition Quiz',
      subject: 'Science',
      grade: 'Grade 5',
      topic: 'Human Digestive System',
      curriculum: 'National Curriculum',
      book: 'General Science 5',
      chapter: 'Chapter 3',
      learningObjective: 'Recall organs and functions of the digestive system.',
      difficulty: 'Hard',
      questionCount: 20,
      points: 150,
      totalMarks: 40,
      timeLimitMinutes: 30,
      attemptLimit: 1,
      status: QuizStatus.upcoming,
      resultStatus: 'Not Started',
      startAt: DateTime.now().add(const Duration(days: 3, hours: 4)),
      dueAt: DateTime.now().add(const Duration(days: 3, hours: 5)),
      instructions: const [
        'This quiz opens only during the scheduled competition window.',
        'Navigation is locked after moving to the next question.',
        'The attempt will auto-submit when time expires.',
      ],
      navigationMode: 'Locked Navigation',
      answersCanBeChanged: false,
      hintsAllowed: false,
      reviewAvailable: false,
      createdBy: 'School Head',
      schoolName: 'ABC School',
    ),
    QuizSummary(
      id: 'quiz-4',
      title: 'Plants and Photosynthesis',
      description:
          'Completed practice quiz. Review is available for explanations.',
      quizType: 'Practice Quiz',
      subject: 'Science',
      grade: 'Grade 5',
      topic: 'Photosynthesis',
      curriculum: 'National Curriculum',
      book: 'General Science 5',
      chapter: 'Chapter 2',
      learningObjective: 'Explain how plants make food.',
      difficulty: 'Medium',
      questionCount: 10,
      points: 80,
      totalMarks: 20,
      attemptLimit: 2,
      status: QuizStatus.completed,
      resultStatus: 'Reviewed',
      resultPercent: 82,
      dueAt: DateTime.now().subtract(const Duration(days: 42)),
      instructions: const [
        'Review the correct answers and explanations.',
        'Ask your teacher if any explanation is unclear.',
      ],
      navigationMode: 'Free Navigation',
      reviewAvailable: true,
      createdBy: 'Science Teacher',
      schoolName: 'ABC School',
    ),
    QuizSummary(
      id: 'quiz-5',
      title: 'Decimal Division Check',
      description: 'Expired assessment quiz that is no longer available.',
      quizType: 'Assessment Quiz',
      subject: 'Mathematics',
      grade: 'Grade 5',
      topic: 'Decimal Division',
      curriculum: 'National Curriculum',
      book: 'Mathematics Book 5',
      chapter: 'Chapter 5',
      learningObjective: 'Divide decimal numbers in short word problems.',
      questionCount: 10,
      points: 75,
      totalMarks: 20,
      timeLimitMinutes: 20,
      attemptLimit: 1,
      status: QuizStatus.available,
      resultStatus: 'Not Started',
      startAt: DateTime.now().subtract(const Duration(days: 7)),
      dueAt: DateTime.now().subtract(const Duration(days: 5)),
      instructions: const [
        'This quiz is expired and cannot be started.',
        'Ask your teacher if the attempt should be reopened.',
      ],
      navigationMode: 'Sequential Navigation',
      answersCanBeChanged: true,
      reviewAvailable: false,
      createdBy: 'Math Teacher',
      schoolName: 'ABC School',
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
}
