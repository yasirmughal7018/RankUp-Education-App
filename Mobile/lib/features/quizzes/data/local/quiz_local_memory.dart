import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';

class LookupRow {
  const LookupRow({
    required this.id,
    required this.name,
    required this.type,
  });

  final int id;
  final String name;
  final String type;
}

class LocalQuizRow {
  const LocalQuizRow({
    required this.id,
    required this.schoolId,
    required this.campusId,
    required this.quizTitle,
    required this.description,
    required this.quizTypeId,
    required this.className,
    required this.subject,
    required this.topic,
    required this.difficultyLevel,
    required this.totalQuestions,
    required this.totalMarks,
    required this.timeLimitMinutes,
    required this.numberOfAttempts,
    required this.startDateTime,
    required this.endDateTime,
    required this.shuffleQuestions,
    required this.shuffleOptions,
    required this.instructions,
    required this.isActive,
    required this.createdBy,
    required this.approvedBy,
    required this.approvalStatusId,
    required this.createdDate,
    required this.modifiedDate,
    this.resultStatus = 'Not Started',
    this.resultPercent,
  });

  final String id;
  final String schoolId;
  final String campusId;
  final String quizTitle;
  final String description;
  final int quizTypeId;
  final String className;
  final String subject;
  final String topic;
  final String difficultyLevel;
  final int totalQuestions;
  final int totalMarks;
  final int? timeLimitMinutes;
  final int numberOfAttempts;
  final DateTime? startDateTime;
  final DateTime? endDateTime;
  final bool shuffleQuestions;
  final bool shuffleOptions;
  final List<String> instructions;
  final bool isActive;
  final String createdBy;
  final String approvedBy;
  final int approvalStatusId;
  final DateTime createdDate;
  final DateTime modifiedDate;
  final String resultStatus;
  final int? resultPercent;
}

class LocalQuestionRow {
  const LocalQuestionRow({
    required this.id,
    required this.questionText,
    required this.questionTypeId,
    required this.className,
    required this.subject,
    required this.topic,
    required this.difficultyLevel,
    required this.explanation,
    required this.hint,
    required this.estimatedTimeSeconds,
    required this.marks,
    required this.isActive,
    required this.statusId,
    required this.createdBy,
    required this.approvedBy,
    required this.createdDate,
    required this.modifiedDate,
  });

  final String id;
  final String questionText;
  final int questionTypeId;
  final String className;
  final String subject;
  final String topic;
  final String difficultyLevel;
  final String explanation;
  final String hint;
  final int estimatedTimeSeconds;
  final int marks;
  final bool isActive;
  final int statusId;
  final String createdBy;
  final String approvedBy;
  final DateTime createdDate;
  final DateTime modifiedDate;
}

class LocalQuestionOptionRow {
  const LocalQuestionOptionRow({
    required this.id,
    required this.questionId,
    required this.optionText,
    required this.optionImageUrl,
    required this.isCorrect,
    required this.explanation,
    required this.isActive,
  });

  final String id;
  final String questionId;
  final String optionText;
  final String optionImageUrl;
  final bool isCorrect;
  final String explanation;
  final bool isActive;
}

class LocalQuizQuestionRow {
  const LocalQuizQuestionRow({
    required this.id,
    required this.quizId,
    required this.questionId,
    required this.displayOrder,
    required this.marks,
    required this.shuffleOptions,
    required this.createdAt,
  });

  final String id;
  final String quizId;
  final String questionId;
  final int displayOrder;
  final int marks;
  final bool shuffleOptions;
  final DateTime createdAt;
}

class LocalQuizAttemptRow {
  const LocalQuizAttemptRow({
    required this.id,
    required this.quizId,
    required this.studentId,
    required this.numberOfQuestionAttempt,
    required this.statusId,
    required this.startedAt,
    required this.submittedAt,
    required this.timeSpentSeconds,
    required this.deviceId,
    required this.isOfflineAttempt,
    required this.aiReviewStatus,
    required this.teacherReviewStatus,
    required this.parentReviewStatus,
    required this.aiReviewComment,
    required this.teacherReviewComment,
    required this.parentReviewComment,
    required this.obtainedMarks,
    required this.percentage,
  });

  final String id;
  final String quizId;
  final String studentId;
  final int numberOfQuestionAttempt;
  final int statusId;
  final DateTime startedAt;
  final DateTime? submittedAt;
  final int timeSpentSeconds;
  final String deviceId;
  final bool isOfflineAttempt;
  final String aiReviewStatus;
  final String teacherReviewStatus;
  final String parentReviewStatus;
  final String aiReviewComment;
  final String teacherReviewComment;
  final String parentReviewComment;
  final int obtainedMarks;
  final int percentage;
}

class LocalQuizAttemptQuestionRow {
  const LocalQuizAttemptQuestionRow({
    required this.id,
    required this.quizAttemptId,
    required this.questionId,
    required this.displayOrder,
    required this.aiReviewStatus,
    required this.teacherReviewStatus,
    required this.parentReviewStatus,
    required this.aiReviewComment,
    required this.teacherReviewComment,
    required this.parentReviewComment,
    required this.presentedAt,
  });

  final String id;
  final String quizAttemptId;
  final String questionId;
  final int displayOrder;
  final String aiReviewStatus;
  final String teacherReviewStatus;
  final String parentReviewStatus;
  final String aiReviewComment;
  final String teacherReviewComment;
  final String parentReviewComment;
  final DateTime presentedAt;
}

final localLookupRows = <LookupRow>[
  const LookupRow(id: 1, name: 'Practice', type: 'QuizType'),
  const LookupRow(id: 2, name: 'Assessment', type: 'QuizType'),
  const LookupRow(id: 3, name: 'Competition', type: 'QuizType'),
  const LookupRow(id: 4, name: 'Surprise', type: 'QuizType'),
  const LookupRow(id: 20, name: 'Draft', type: 'ApprovalStatus'),
  const LookupRow(id: 21, name: 'Under Review', type: 'ApprovalStatus'),
  const LookupRow(id: 22, name: 'AI Review', type: 'ApprovalStatus'),
  const LookupRow(id: 23, name: 'Change Request', type: 'ApprovalStatus'),
  const LookupRow(id: 24, name: 'Approved', type: 'ApprovalStatus'),
  const LookupRow(id: 25, name: 'Scheduled', type: 'ApprovalStatus'),
  const LookupRow(id: 26, name: 'Rejected', type: 'ApprovalStatus'),
  const LookupRow(id: 27, name: 'Archived', type: 'ApprovalStatus'),
  const LookupRow(id: 40, name: 'Single Choice', type: 'QuestionType'),
  const LookupRow(id: 41, name: 'MultipleChoice', type: 'QuestionType'),
  const LookupRow(id: 42, name: 'TrueFalse', type: 'QuestionType'),
  const LookupRow(id: 43, name: 'FillBlank', type: 'QuestionType'),
  const LookupRow(id: 44, name: 'Descriptive', type: 'QuestionType'),
  const LookupRow(id: 60, name: 'Draft', type: 'QuestionStatus'),
  const LookupRow(id: 61, name: 'PendingReview', type: 'QuestionStatus'),
  const LookupRow(id: 62, name: 'Approved', type: 'QuestionStatus'),
  const LookupRow(id: 63, name: 'Rejected', type: 'QuestionStatus'),
  const LookupRow(id: 64, name: 'Archived', type: 'QuestionStatus'),
  const LookupRow(id: 80, name: 'Started', type: 'QuizAttemptStatus'),
  const LookupRow(id: 81, name: 'InProgress', type: 'QuizAttemptStatus'),
  const LookupRow(id: 82, name: 'Submitted', type: 'QuizAttemptStatus'),
  const LookupRow(id: 83, name: 'AutoSubmitted', type: 'QuizAttemptStatus'),
  const LookupRow(id: 84, name: 'Expired', type: 'QuizAttemptStatus'),
  const LookupRow(id: 85, name: 'Reviewed', type: 'QuizAttemptStatus'),
];

final _now = DateTime.now();

final localQuizRows = <LocalQuizRow>[
  LocalQuizRow(
    id: 'quiz-1',
    schoolId: 'school-abc',
    campusId: 'campus-main',
    quizTitle: 'Fractions Mastery Check',
    description:
        'Assigned quiz to check fraction addition, subtraction, and word problems.',
    quizTypeId: 2,
    className: 'Grade 5',
    subject: 'Mathematics',
    topic: 'Fractions',
    difficultyLevel: 'Medium',
    totalQuestions: 15,
    totalMarks: 30,
    timeLimitMinutes: 25,
    numberOfAttempts: 1,
    startDateTime: _now.subtract(const Duration(hours: 2)),
    endDateTime: _now.add(const Duration(days: 2)),
    shuffleQuestions: false,
    shuffleOptions: true,
    instructions: const [
      'Read every question carefully before selecting an answer.',
      'You can move freely between questions.',
      'Answers are saved automatically when you move to the next question.',
      'Submit before the timer ends.',
    ],
    isActive: true,
    createdBy: 'Ms. Fatima',
    approvedBy: 'Academic Coordinator',
    approvalStatusId: 24,
    createdDate: _now.subtract(const Duration(days: 4)),
    modifiedDate: _now.subtract(const Duration(days: 1)),
  ),
  LocalQuizRow(
    id: 'quiz-2',
    schoolId: 'school-abc',
    campusId: 'campus-main',
    quizTitle: 'Present and Past Tenses',
    description:
        'AI recommended practice quiz for improving English grammar basics.',
    quizTypeId: 1,
    className: 'Grade 5',
    subject: 'English',
    topic: 'Tenses',
    difficultyLevel: 'Easy',
    totalQuestions: 12,
    totalMarks: 24,
    timeLimitMinutes: null,
    numberOfAttempts: 3,
    startDateTime: _now.subtract(const Duration(days: 1)),
    endDateTime: _now.add(const Duration(days: 5)),
    shuffleQuestions: false,
    shuffleOptions: false,
    instructions: const [
      'Practice quizzes can be attempted more than once.',
      'Hints are available after you try each question.',
      'Correct answers may be reviewed after submission.',
    ],
    isActive: true,
    createdBy: 'AI',
    approvedBy: 'English Teacher',
    approvalStatusId: 24,
    createdDate: _now.subtract(const Duration(days: 3)),
    modifiedDate: _now.subtract(const Duration(days: 1)),
    resultStatus: 'In Progress',
  ),
  LocalQuizRow(
    id: 'quiz-3',
    schoolId: 'school-abc',
    campusId: 'campus-main',
    quizTitle: 'Science Competition Warm-up',
    description:
        'Scheduled quiz for science competition preparation. It opens at the fixed time.',
    quizTypeId: 3,
    className: 'Grade 5',
    subject: 'Science',
    topic: 'Human Digestive System',
    difficultyLevel: 'Hard',
    totalQuestions: 20,
    totalMarks: 40,
    timeLimitMinutes: 30,
    numberOfAttempts: 1,
    startDateTime: _now.add(const Duration(days: 3, hours: 4)),
    endDateTime: _now.add(const Duration(days: 3, hours: 5)),
    shuffleQuestions: true,
    shuffleOptions: true,
    instructions: const [
      'This quiz opens only during the scheduled competition window.',
      'Navigation is locked after moving to the next question.',
      'The attempt will auto-submit when time expires.',
    ],
    isActive: true,
    createdBy: 'School Head',
    approvedBy: 'Principal',
    approvalStatusId: 25,
    createdDate: _now.subtract(const Duration(days: 2)),
    modifiedDate: _now.subtract(const Duration(days: 1)),
  ),
  LocalQuizRow(
    id: 'quiz-4',
    schoolId: 'school-abc',
    campusId: 'campus-main',
    quizTitle: 'Plants and Photosynthesis',
    description:
        'Completed practice quiz. Review is available for explanations.',
    quizTypeId: 1,
    className: 'Grade 5',
    subject: 'Science',
    topic: 'Photosynthesis',
    difficultyLevel: 'Medium',
    totalQuestions: 10,
    totalMarks: 20,
    timeLimitMinutes: null,
    numberOfAttempts: 2,
    startDateTime: _now.subtract(const Duration(days: 45)),
    endDateTime: _now.subtract(const Duration(days: 42)),
    shuffleQuestions: false,
    shuffleOptions: false,
    instructions: const [
      'Review the correct answers and explanations.',
      'Ask your teacher if any explanation is unclear.',
    ],
    isActive: true,
    createdBy: 'Science Teacher',
    approvedBy: 'Academic Coordinator',
    approvalStatusId: 24,
    createdDate: _now.subtract(const Duration(days: 50)),
    modifiedDate: _now.subtract(const Duration(days: 44)),
    resultStatus: 'Reviewed',
    resultPercent: 82,
  ),
  LocalQuizRow(
    id: 'quiz-5',
    schoolId: 'school-abc',
    campusId: 'campus-main',
    quizTitle: 'Decimal Division Check',
    description: 'Expired assessment quiz that is no longer available.',
    quizTypeId: 2,
    className: 'Grade 5',
    subject: 'Mathematics',
    topic: 'Decimal Division',
    difficultyLevel: 'Medium',
    totalQuestions: 10,
    totalMarks: 20,
    timeLimitMinutes: 20,
    numberOfAttempts: 1,
    startDateTime: _now.subtract(const Duration(days: 7)),
    endDateTime: _now.subtract(const Duration(days: 5)),
    shuffleQuestions: false,
    shuffleOptions: true,
    instructions: const [
      'This quiz is expired and cannot be started.',
      'Ask your teacher if the attempt should be reopened.',
    ],
    isActive: true,
    createdBy: 'Math Teacher',
    approvedBy: 'Academic Coordinator',
    approvalStatusId: 24,
    createdDate: _now.subtract(const Duration(days: 10)),
    modifiedDate: _now.subtract(const Duration(days: 8)),
  ),
];

final localQuestionRows = <LocalQuestionRow>[
  LocalQuestionRow(
    id: 'q-001',
    questionText: 'Which fraction is equivalent to 1/2?',
    questionTypeId: 40,
    className: 'Grade 5',
    subject: 'Mathematics',
    topic: 'Fractions',
    difficultyLevel: 'Easy',
    explanation:
        '2/4 simplifies to 1/2 by dividing numerator and denominator by 2.',
    hint: 'Reduce each option to its simplest form.',
    estimatedTimeSeconds: 45,
    marks: 2,
    isActive: true,
    statusId: 62,
    createdBy: 'Ms. Fatima',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 12)),
    modifiedDate: _now.subtract(const Duration(days: 11)),
  ),
  LocalQuestionRow(
    id: 'q-002',
    questionText: 'Select all fractions greater than 1/2.',
    questionTypeId: 41,
    className: 'Grade 5',
    subject: 'Mathematics',
    topic: 'Fractions',
    difficultyLevel: 'Medium',
    explanation: '3/4 and 5/8 are both greater than 1/2.',
    hint: 'Compare every option with 0.5.',
    estimatedTimeSeconds: 60,
    marks: 3,
    isActive: true,
    statusId: 62,
    createdBy: 'Ms. Fatima',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 12)),
    modifiedDate: _now.subtract(const Duration(days: 11)),
  ),
  LocalQuestionRow(
    id: 'q-003',
    questionText: 'A proper fraction is always less than 1.',
    questionTypeId: 42,
    className: 'Grade 5',
    subject: 'Mathematics',
    topic: 'Fractions',
    difficultyLevel: 'Easy',
    explanation:
        'In a proper fraction, the numerator is smaller than the denominator.',
    hint: 'Think about numerator and denominator size.',
    estimatedTimeSeconds: 30,
    marks: 1,
    isActive: true,
    statusId: 62,
    createdBy: 'Ms. Fatima',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 12)),
    modifiedDate: _now.subtract(const Duration(days: 11)),
  ),
  LocalQuestionRow(
    id: 'q-004',
    questionText: 'Fill in the blank: The past tense of "go" is ____.',
    questionTypeId: 43,
    className: 'Grade 5',
    subject: 'English',
    topic: 'Tenses',
    difficultyLevel: 'Easy',
    explanation: 'The past tense of go is went.',
    hint: 'It is an irregular verb.',
    estimatedTimeSeconds: 35,
    marks: 2,
    isActive: true,
    statusId: 62,
    createdBy: 'English Teacher',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 8)),
    modifiedDate: _now.subtract(const Duration(days: 7)),
  ),
  LocalQuestionRow(
    id: 'q-005',
    questionText: 'Write two sentences using present tense and past tense.',
    questionTypeId: 44,
    className: 'Grade 5',
    subject: 'English',
    topic: 'Tenses',
    difficultyLevel: 'Medium',
    explanation:
        'A complete answer should show one current action and one past action.',
    hint: 'Use words like today and yesterday.',
    estimatedTimeSeconds: 120,
    marks: 5,
    isActive: true,
    statusId: 62,
    createdBy: 'English Teacher',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 8)),
    modifiedDate: _now.subtract(const Duration(days: 7)),
  ),
  LocalQuestionRow(
    id: 'q-006',
    questionText: 'Which organ starts digestion in the mouth?',
    questionTypeId: 40,
    className: 'Grade 5',
    subject: 'Science',
    topic: 'Human Digestive System',
    difficultyLevel: 'Medium',
    explanation: 'The teeth chew food and saliva begins chemical digestion.',
    hint: 'It is present inside the mouth.',
    estimatedTimeSeconds: 45,
    marks: 2,
    isActive: true,
    statusId: 62,
    createdBy: 'Science Teacher',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 6)),
    modifiedDate: _now.subtract(const Duration(days: 5)),
  ),
  LocalQuestionRow(
    id: 'q-007',
    questionText: 'Plants make food through photosynthesis.',
    questionTypeId: 42,
    className: 'Grade 5',
    subject: 'Science',
    topic: 'Photosynthesis',
    difficultyLevel: 'Easy',
    explanation:
        'Photosynthesis is the process plants use to make food using sunlight.',
    hint: 'Think about sunlight and leaves.',
    estimatedTimeSeconds: 30,
    marks: 1,
    isActive: true,
    statusId: 62,
    createdBy: 'Science Teacher',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 55)),
    modifiedDate: _now.subtract(const Duration(days: 54)),
  ),
  LocalQuestionRow(
    id: 'q-008',
    questionText: 'What is 12.6 divided by 3?',
    questionTypeId: 40,
    className: 'Grade 5',
    subject: 'Mathematics',
    topic: 'Decimal Division',
    difficultyLevel: 'Medium',
    explanation: '12.6 divided by 3 equals 4.2.',
    hint: 'Divide 126 by 3 first, then place the decimal.',
    estimatedTimeSeconds: 50,
    marks: 2,
    isActive: true,
    statusId: 62,
    createdBy: 'Math Teacher',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 14)),
    modifiedDate: _now.subtract(const Duration(days: 13)),
  ),
  LocalQuestionRow(
    id: 'q-009',
    questionText: 'What is 1/4 + 1/4?',
    questionTypeId: 40,
    className: 'Grade 5',
    subject: 'Mathematics',
    topic: 'Fractions',
    difficultyLevel: 'Easy',
    explanation: 'One fourth plus one fourth equals two fourths, or one half.',
    hint: 'Add the numerators when denominators are same.',
    estimatedTimeSeconds: 45,
    marks: 2,
    isActive: true,
    statusId: 62,
    createdBy: 'Ms. Fatima',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 11)),
    modifiedDate: _now.subtract(const Duration(days: 10)),
  ),
  LocalQuestionRow(
    id: 'q-010',
    questionText: 'Explain why 3/6 and 1/2 are equivalent fractions.',
    questionTypeId: 44,
    className: 'Grade 5',
    subject: 'Mathematics',
    topic: 'Fractions',
    difficultyLevel: 'Medium',
    explanation: '3/6 simplifies to 1/2 when both parts are divided by 3.',
    hint: 'Think about simplifying numerator and denominator.',
    estimatedTimeSeconds: 120,
    marks: 4,
    isActive: true,
    statusId: 62,
    createdBy: 'Ms. Fatima',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 11)),
    modifiedDate: _now.subtract(const Duration(days: 10)),
  ),
  LocalQuestionRow(
    id: 'q-011',
    questionText: 'Choose the sentence written in past tense.',
    questionTypeId: 40,
    className: 'Grade 5',
    subject: 'English',
    topic: 'Tenses',
    difficultyLevel: 'Easy',
    explanation: '“She played yesterday” describes an action in the past.',
    hint: 'Look for a completed action.',
    estimatedTimeSeconds: 40,
    marks: 2,
    isActive: true,
    statusId: 62,
    createdBy: 'English Teacher',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 7)),
    modifiedDate: _now.subtract(const Duration(days: 6)),
  ),
  LocalQuestionRow(
    id: 'q-012',
    questionText: 'Fill in the blank: I ____ my homework yesterday.',
    questionTypeId: 43,
    className: 'Grade 5',
    subject: 'English',
    topic: 'Tenses',
    difficultyLevel: 'Easy',
    explanation: 'The correct past-tense verb is did.',
    hint: 'Use the past form of do.',
    estimatedTimeSeconds: 35,
    marks: 2,
    isActive: true,
    statusId: 62,
    createdBy: 'English Teacher',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 7)),
    modifiedDate: _now.subtract(const Duration(days: 6)),
  ),
  LocalQuestionRow(
    id: 'q-013',
    questionText: 'Select all organs that are part of digestion.',
    questionTypeId: 41,
    className: 'Grade 5',
    subject: 'Science',
    topic: 'Human Digestive System',
    difficultyLevel: 'Medium',
    explanation: 'The stomach and intestines are part of the digestive system.',
    hint: 'Choose organs that process food.',
    estimatedTimeSeconds: 70,
    marks: 3,
    isActive: true,
    statusId: 62,
    createdBy: 'Science Teacher',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 6)),
    modifiedDate: _now.subtract(const Duration(days: 5)),
  ),
  LocalQuestionRow(
    id: 'q-014',
    questionText: 'Fill in the blank: Plants need sunlight, water, and ____.',
    questionTypeId: 43,
    className: 'Grade 5',
    subject: 'Science',
    topic: 'Photosynthesis',
    difficultyLevel: 'Medium',
    explanation: 'Plants use carbon dioxide during photosynthesis.',
    hint: 'It is a gas in air.',
    estimatedTimeSeconds: 45,
    marks: 2,
    isActive: true,
    statusId: 62,
    createdBy: 'Science Teacher',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 55)),
    modifiedDate: _now.subtract(const Duration(days: 54)),
  ),
  LocalQuestionRow(
    id: 'q-015',
    questionText: 'What is 9.6 divided by 4?',
    questionTypeId: 40,
    className: 'Grade 5',
    subject: 'Mathematics',
    topic: 'Decimal Division',
    difficultyLevel: 'Medium',
    explanation: '9.6 divided by 4 equals 2.4.',
    hint: 'Divide 96 by 4 first.',
    estimatedTimeSeconds: 50,
    marks: 2,
    isActive: true,
    statusId: 62,
    createdBy: 'Math Teacher',
    approvedBy: 'Academic Coordinator',
    createdDate: _now.subtract(const Duration(days: 14)),
    modifiedDate: _now.subtract(const Duration(days: 13)),
  ),
];

final localQuestionOptionRows = <LocalQuestionOptionRow>[
  const LocalQuestionOptionRow(
    id: 'qo-001-a',
    questionId: 'q-001',
    optionText: '2/4',
    optionImageUrl: '',
    isCorrect: true,
    explanation: '2/4 reduces to 1/2.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-001-b',
    questionId: 'q-001',
    optionText: '1/3',
    optionImageUrl: '',
    isCorrect: false,
    explanation: '1/3 is less than 1/2.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-001-c',
    questionId: 'q-001',
    optionText: '3/5',
    optionImageUrl: '',
    isCorrect: false,
    explanation: '3/5 is greater than 1/2.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-001-d',
    questionId: 'q-001',
    optionText: '1/4',
    optionImageUrl: '',
    isCorrect: false,
    explanation: '1/4 is less than 1/2.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-002-a',
    questionId: 'q-002',
    optionText: '3/4',
    optionImageUrl: '',
    isCorrect: true,
    explanation: '3/4 is greater than 1/2.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-002-b',
    questionId: 'q-002',
    optionText: '5/8',
    optionImageUrl: '',
    isCorrect: true,
    explanation: '5/8 is greater than 1/2.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-002-c',
    questionId: 'q-002',
    optionText: '2/5',
    optionImageUrl: '',
    isCorrect: false,
    explanation: '2/5 is less than 1/2.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-002-d',
    questionId: 'q-002',
    optionText: '1/3',
    optionImageUrl: '',
    isCorrect: false,
    explanation: '1/3 is less than 1/2.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-003-a',
    questionId: 'q-003',
    optionText: 'True',
    optionImageUrl: '',
    isCorrect: true,
    explanation: 'A proper fraction is less than 1.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-003-b',
    questionId: 'q-003',
    optionText: 'False',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'This statement is true.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-006-a',
    questionId: 'q-006',
    optionText: 'Teeth and saliva',
    optionImageUrl: '',
    isCorrect: true,
    explanation: 'Teeth break food and saliva starts chemical digestion.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-006-b',
    questionId: 'q-006',
    optionText: 'Lungs',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'Lungs are part of the respiratory system.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-006-c',
    questionId: 'q-006',
    optionText: 'Kidneys',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'Kidneys filter blood, not food.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-006-d',
    questionId: 'q-006',
    optionText: 'Bones',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'Bones support the body.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-007-a',
    questionId: 'q-007',
    optionText: 'True',
    optionImageUrl: '',
    isCorrect: true,
    explanation: 'Plants make food through photosynthesis.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-007-b',
    questionId: 'q-007',
    optionText: 'False',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'The statement is true.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-008-a',
    questionId: 'q-008',
    optionText: '4.2',
    optionImageUrl: '',
    isCorrect: true,
    explanation: '12.6 / 3 = 4.2.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-008-b',
    questionId: 'q-008',
    optionText: '3.2',
    optionImageUrl: '',
    isCorrect: false,
    explanation: '3.2 is too small.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-008-c',
    questionId: 'q-008',
    optionText: '42',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'The decimal point is missing.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-008-d',
    questionId: 'q-008',
    optionText: '4.02',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'The decimal place is incorrect.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-009-a',
    questionId: 'q-009',
    optionText: '1/2',
    optionImageUrl: '',
    isCorrect: true,
    explanation: '1/4 + 1/4 = 2/4 = 1/2.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-009-b',
    questionId: 'q-009',
    optionText: '1/8',
    optionImageUrl: '',
    isCorrect: false,
    explanation: '1/8 is smaller than 1/4.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-009-c',
    questionId: 'q-009',
    optionText: '2/8',
    optionImageUrl: '',
    isCorrect: false,
    explanation: '2/8 simplifies to 1/4.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-009-d',
    questionId: 'q-009',
    optionText: '3/4',
    optionImageUrl: '',
    isCorrect: false,
    explanation: '3/4 is too large.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-011-a',
    questionId: 'q-011',
    optionText: 'She played yesterday.',
    optionImageUrl: '',
    isCorrect: true,
    explanation: 'Played is past tense.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-011-b',
    questionId: 'q-011',
    optionText: 'She plays today.',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'Plays is present tense.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-011-c',
    questionId: 'q-011',
    optionText: 'She will play tomorrow.',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'Will play is future tense.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-011-d',
    questionId: 'q-011',
    optionText: 'She is playing now.',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'Is playing is present continuous tense.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-013-a',
    questionId: 'q-013',
    optionText: 'Stomach',
    optionImageUrl: '',
    isCorrect: true,
    explanation: 'The stomach digests food.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-013-b',
    questionId: 'q-013',
    optionText: 'Small intestine',
    optionImageUrl: '',
    isCorrect: true,
    explanation: 'The small intestine absorbs nutrients.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-013-c',
    questionId: 'q-013',
    optionText: 'Heart',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'The heart belongs to the circulatory system.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-013-d',
    questionId: 'q-013',
    optionText: 'Lungs',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'The lungs belong to the respiratory system.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-015-a',
    questionId: 'q-015',
    optionText: '2.4',
    optionImageUrl: '',
    isCorrect: true,
    explanation: '9.6 / 4 = 2.4.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-015-b',
    questionId: 'q-015',
    optionText: '24',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'The decimal point is missing.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-015-c',
    questionId: 'q-015',
    optionText: '2.04',
    optionImageUrl: '',
    isCorrect: false,
    explanation: 'The decimal place is incorrect.',
    isActive: true,
  ),
  const LocalQuestionOptionRow(
    id: 'qo-015-d',
    questionId: 'q-015',
    optionText: '3.4',
    optionImageUrl: '',
    isCorrect: false,
    explanation: '3.4 is too high.',
    isActive: true,
  ),
];

final localQuizQuestionRows = <LocalQuizQuestionRow>[
  LocalQuizQuestionRow(
    id: 'qq-001',
    quizId: 'quiz-1',
    questionId: 'q-001',
    displayOrder: 1,
    marks: 2,
    shuffleOptions: true,
    createdAt: _now.subtract(const Duration(days: 4)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-002',
    quizId: 'quiz-1',
    questionId: 'q-002',
    displayOrder: 2,
    marks: 3,
    shuffleOptions: true,
    createdAt: _now.subtract(const Duration(days: 4)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-003',
    quizId: 'quiz-1',
    questionId: 'q-003',
    displayOrder: 3,
    marks: 1,
    shuffleOptions: true,
    createdAt: _now.subtract(const Duration(days: 4)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-009',
    quizId: 'quiz-1',
    questionId: 'q-009',
    displayOrder: 4,
    marks: 2,
    shuffleOptions: true,
    createdAt: _now.subtract(const Duration(days: 4)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-010',
    quizId: 'quiz-1',
    questionId: 'q-010',
    displayOrder: 5,
    marks: 4,
    shuffleOptions: false,
    createdAt: _now.subtract(const Duration(days: 4)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-004',
    quizId: 'quiz-2',
    questionId: 'q-004',
    displayOrder: 1,
    marks: 2,
    shuffleOptions: false,
    createdAt: _now.subtract(const Duration(days: 3)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-005',
    quizId: 'quiz-2',
    questionId: 'q-005',
    displayOrder: 2,
    marks: 5,
    shuffleOptions: false,
    createdAt: _now.subtract(const Duration(days: 3)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-011',
    quizId: 'quiz-2',
    questionId: 'q-011',
    displayOrder: 3,
    marks: 2,
    shuffleOptions: false,
    createdAt: _now.subtract(const Duration(days: 3)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-012',
    quizId: 'quiz-2',
    questionId: 'q-012',
    displayOrder: 4,
    marks: 2,
    shuffleOptions: false,
    createdAt: _now.subtract(const Duration(days: 3)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-006',
    quizId: 'quiz-3',
    questionId: 'q-006',
    displayOrder: 1,
    marks: 2,
    shuffleOptions: true,
    createdAt: _now.subtract(const Duration(days: 2)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-013',
    quizId: 'quiz-3',
    questionId: 'q-013',
    displayOrder: 2,
    marks: 3,
    shuffleOptions: true,
    createdAt: _now.subtract(const Duration(days: 2)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-007',
    quizId: 'quiz-4',
    questionId: 'q-007',
    displayOrder: 1,
    marks: 1,
    shuffleOptions: false,
    createdAt: _now.subtract(const Duration(days: 50)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-014',
    quizId: 'quiz-4',
    questionId: 'q-014',
    displayOrder: 2,
    marks: 2,
    shuffleOptions: false,
    createdAt: _now.subtract(const Duration(days: 50)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-008',
    quizId: 'quiz-5',
    questionId: 'q-008',
    displayOrder: 1,
    marks: 2,
    shuffleOptions: true,
    createdAt: _now.subtract(const Duration(days: 10)),
  ),
  LocalQuizQuestionRow(
    id: 'qq-015',
    quizId: 'quiz-5',
    questionId: 'q-015',
    displayOrder: 2,
    marks: 2,
    shuffleOptions: true,
    createdAt: _now.subtract(const Duration(days: 10)),
  ),
];

final localQuizAttemptRows = <LocalQuizAttemptRow>[
  LocalQuizAttemptRow(
    id: 'attempt-001',
    quizId: 'quiz-4',
    studentId: 'student-demo',
    numberOfQuestionAttempt: 1,
    statusId: 85,
    startedAt: _now.subtract(const Duration(days: 42, minutes: 18)),
    submittedAt: _now.subtract(const Duration(days: 42)),
    timeSpentSeconds: 1080,
    deviceId: 'emulator-5554',
    isOfflineAttempt: false,
    aiReviewStatus: 'Reviewed',
    teacherReviewStatus: 'Reviewed',
    parentReviewStatus: 'Available',
    aiReviewComment: 'Good understanding of photosynthesis basics.',
    teacherReviewComment: 'Revise oxygen and carbon dioxide exchange.',
    parentReviewComment: 'Shared with parent dashboard.',
    obtainedMarks: 16,
    percentage: 82,
  ),
  LocalQuizAttemptRow(
    id: 'attempt-002',
    quizId: 'quiz-2',
    studentId: 'student-demo',
    numberOfQuestionAttempt: 1,
    statusId: 81,
    startedAt: _now.subtract(const Duration(hours: 3)),
    submittedAt: null,
    timeSpentSeconds: 360,
    deviceId: 'emulator-5554',
    isOfflineAttempt: false,
    aiReviewStatus: 'Pending',
    teacherReviewStatus: 'NotRequired',
    parentReviewStatus: 'NotShared',
    aiReviewComment: '',
    teacherReviewComment: '',
    parentReviewComment: '',
    obtainedMarks: 0,
    percentage: 0,
  ),
];

final localQuizAttemptQuestionRows = <LocalQuizAttemptQuestionRow>[
  LocalQuizAttemptQuestionRow(
    id: 'attempt-question-001',
    quizAttemptId: 'attempt-001',
    questionId: 'q-007',
    displayOrder: 1,
    aiReviewStatus: 'Reviewed',
    teacherReviewStatus: 'Reviewed',
    parentReviewStatus: 'Available',
    aiReviewComment: 'Correct true/false response.',
    teacherReviewComment: 'Good work.',
    parentReviewComment: 'Visible to parent.',
    presentedAt: _now.subtract(const Duration(days: 42, minutes: 17)),
  ),
  LocalQuizAttemptQuestionRow(
    id: 'attempt-question-002',
    quizAttemptId: 'attempt-002',
    questionId: 'q-004',
    displayOrder: 1,
    aiReviewStatus: 'Pending',
    teacherReviewStatus: 'NotRequired',
    parentReviewStatus: 'NotShared',
    aiReviewComment: '',
    teacherReviewComment: '',
    parentReviewComment: '',
    presentedAt: _now.subtract(const Duration(hours: 3)),
  ),
];

List<QuizSummary> buildLocalQuizSummaries() {
  return localQuizRows.map(_toQuizSummary).toList(growable: false);
}

List<LocalQuestionRow> questionsForQuiz(String quizId) {
  final mappings = localQuizQuestionRows
      .where((mapping) => mapping.quizId == quizId)
      .toList()
    ..sort(
      (first, second) => first.displayOrder.compareTo(second.displayOrder),
    );

  return [
    for (final mapping in mappings)
      localQuestionRows
          .firstWhere((question) => question.id == mapping.questionId),
  ];
}

List<LocalQuestionOptionRow> optionsForQuestion(String questionId) {
  return localQuestionOptionRows
      .where((option) => option.questionId == questionId && option.isActive)
      .toList(growable: false);
}

String lookupName(int id, String fallback) {
  for (final row in localLookupRows) {
    if (row.id == id) {
      return row.name;
    }
  }

  return fallback;
}

QuizSummary _toQuizSummary(LocalQuizRow row) {
  return QuizSummary(
    id: row.id,
    title: row.quizTitle,
    description: row.description,
    quizType: '${lookupName(row.quizTypeId, 'Practice')} Quiz',
    subject: row.subject,
    grade: row.className,
    topic: row.topic,
    curriculum: 'National Curriculum',
    learningObjective: row.topic,
    difficulty: row.difficultyLevel,
    questionCount: _mappedQuestionCount(row.id, row.totalQuestions),
    points: row.totalMarks * 4,
    totalMarks: row.totalMarks,
    timeLimitMinutes: row.timeLimitMinutes,
    attemptLimit: row.numberOfAttempts,
    status: _quizStatus(row),
    resultStatus: row.resultStatus,
    resultPercent: row.resultPercent,
    startAt: row.startDateTime,
    dueAt: row.endDateTime,
    instructions: row.instructions,
    navigationMode:
        row.shuffleQuestions ? 'Locked Navigation' : 'Free Navigation',
    answersCanBeChanged: !row.shuffleQuestions,
    hintsAllowed: row.quizTypeId == 1,
    reviewAvailable: row.resultStatus == 'Reviewed' || row.quizTypeId == 1,
    createdBy: row.createdBy,
    schoolName: 'ABC School',
  );
}

int _mappedQuestionCount(String quizId, int fallback) {
  final mappedCount =
      localQuizQuestionRows.where((mapping) => mapping.quizId == quizId).length;

  return mappedCount == 0 ? fallback : mappedCount;
}

QuizStatus _quizStatus(LocalQuizRow row) {
  if (row.resultStatus == 'Reviewed') {
    return QuizStatus.completed;
  }
  if (row.approvalStatusId == 25) {
    return QuizStatus.upcoming;
  }
  if (row.endDateTime != null && row.endDateTime!.isBefore(_now)) {
    return QuizStatus.available;
  }
  if (row.quizTypeId == 2) {
    return QuizStatus.assigned;
  }

  return QuizStatus.available;
}
