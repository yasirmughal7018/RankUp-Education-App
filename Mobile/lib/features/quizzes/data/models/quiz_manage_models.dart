/// Teacher/parent manage DTOs for create, assign, and subjective review.
class ManageQuiz {
  const ManageQuiz({
    required this.id,
    required this.title,
    required this.description,
    required this.subject,
    required this.grade,
    required this.topic,
    required this.quizType,
    required this.difficulty,
    required this.lifecycleStatus,
    required this.approvalStatus,
    required this.classId,
    required this.subjectId,
    required this.topicId,
    required this.difficultyLevelId,
    required this.questionCount,
    required this.totalMarks,
    required this.instructions,
    required this.shuffleQuestions,
    required this.shuffleOptions,
    required this.isReviewRequired,
    required this.navigationMode,
    required this.reviewDisplayMode,
    required this.createdBy,
    required this.schoolName,
    required this.questions,
    this.rejectionReason,
    this.timeLimitMinutes,
    this.allowedAttempts,
  });

  factory ManageQuiz.fromJson(Map<String, dynamic> json) {
    final questionsJson = json['questions'];
    return ManageQuiz(
      id: _asString(json['id']),
      title: _asString(json['title']),
      description: _asString(json['description']),
      subject: _asString(json['subject']),
      grade: _asString(json['grade']),
      topic: _asString(json['topic']),
      quizType: _asString(json['quizType']),
      difficulty: _asString(json['difficulty']),
      lifecycleStatus: _asString(json['lifecycleStatus']),
      approvalStatus: _asString(json['approvalStatus']),
      rejectionReason: json['rejectionReason']?.toString(),
      classId: _asInt(json['classId']),
      subjectId: _asInt(json['subjectId']),
      topicId: _asInt(json['topicId']),
      difficultyLevelId: _asInt(json['difficultyLevelId']),
      questionCount: _asInt(json['questionCount']),
      totalMarks: _asInt(json['totalMarks']),
      timeLimitMinutes: _asNullableInt(json['timeLimitMinutes']),
      allowedAttempts: _asNullableInt(json['allowedAttempts']),
      instructions: _asStringList(json['instructions']),
      shuffleQuestions: json['shuffleQuestions'] == true,
      shuffleOptions: json['shuffleOptions'] == true,
      isReviewRequired: json['isReviewRequired'] == true,
      navigationMode: _asString(json['navigationMode'], fallback: 'Free'),
      reviewDisplayMode:
          _asString(json['reviewDisplayMode'], fallback: 'ScoreOnly'),
      createdBy: _asString(json['createdBy']),
      schoolName: _asString(json['schoolName']),
      questions: questionsJson is List
          ? questionsJson
              .whereType<Map<String, dynamic>>()
              .map(ManageQuizQuestion.fromJson)
              .toList()
          : const [],
    );
  }

  final String id;
  final String title;
  final String description;
  final String subject;
  final String grade;
  final String topic;
  final String quizType;
  final String difficulty;
  final String lifecycleStatus;
  final String approvalStatus;
  final String? rejectionReason;
  final int classId;
  final int subjectId;
  final int topicId;
  final int difficultyLevelId;
  final int questionCount;
  final int totalMarks;
  final int? timeLimitMinutes;
  final int? allowedAttempts;
  final List<String> instructions;
  final bool shuffleQuestions;
  final bool shuffleOptions;
  final bool isReviewRequired;
  final String navigationMode;
  final String reviewDisplayMode;
  final String createdBy;
  final String schoolName;
  final List<ManageQuizQuestion> questions;

  bool get isDraft {
    final normalized = lifecycleStatus.trim().toLowerCase();
    return normalized == 'not assigned' || normalized == 'draft';
  }

  bool get isPublished {
    return lifecycleStatus.trim().toLowerCase() == 'published';
  }

  bool get isAssigned {
    return lifecycleStatus.trim().toLowerCase() == 'assigned';
  }

  bool get isApproved {
    return approvalStatus.trim().toLowerCase() == 'approved';
  }
}

class ManageQuizQuestion {
  const ManageQuizQuestion({
    required this.questionId,
    required this.questionText,
    required this.questionType,
    required this.marks,
    required this.displayOrder,
    required this.estimatedTimeSeconds,
    required this.options,
    this.hint,
    this.acceptedAnswers = const [],
  });

  factory ManageQuizQuestion.fromJson(Map<String, dynamic> json) {
    final optionsJson = json['options'];
    final acceptedJson = json['acceptedAnswers'];
    return ManageQuizQuestion(
      questionId: _asString(json['questionId']),
      questionText: _asString(json['questionText']),
      questionType: _asString(json['questionType']),
      marks: _asInt(json['marks']),
      displayOrder: _asInt(json['displayOrder']),
      hint: json['hint']?.toString(),
      estimatedTimeSeconds: _asInt(json['estimatedTimeSeconds'], fallback: 60),
      options: optionsJson is List
          ? optionsJson
              .whereType<Map<String, dynamic>>()
              .map(ManageQuizOption.fromJson)
              .toList()
          : const [],
      acceptedAnswers: acceptedJson is List
          ? acceptedJson
              .whereType<Map<String, dynamic>>()
              .map(ManageAcceptedAnswer.fromJson)
              .toList()
          : const [],
    );
  }

  final String questionId;
  final String questionText;
  final String questionType;
  final int marks;
  final int displayOrder;
  final String? hint;
  final int estimatedTimeSeconds;
  final List<ManageQuizOption> options;
  final List<ManageAcceptedAnswer> acceptedAnswers;
}

class ManageQuizOption {
  const ManageQuizOption({
    required this.optionId,
    required this.optionText,
    required this.isCorrect,
    this.optionImageUrl,
  });

  factory ManageQuizOption.fromJson(Map<String, dynamic> json) {
    return ManageQuizOption(
      optionId: _asString(json['optionId']),
      optionText: _asString(json['optionText']),
      isCorrect: json['isCorrect'] == true,
      optionImageUrl: json['optionImageUrl']?.toString(),
    );
  }

  final String optionId;
  final String optionText;
  final bool isCorrect;
  final String? optionImageUrl;
}

class ManageAcceptedAnswer {
  const ManageAcceptedAnswer({
    required this.acceptedAnswerId,
    required this.answerText,
    required this.isCaseSensitive,
    required this.allowPartialMatch,
    required this.minimumLength,
    required this.maximumLength,
    required this.allowAiReview,
    required this.allowTeacherReview,
  });

  factory ManageAcceptedAnswer.fromJson(Map<String, dynamic> json) {
    return ManageAcceptedAnswer(
      acceptedAnswerId: _asString(json['acceptedAnswerId']),
      answerText: _asString(json['answerText']),
      isCaseSensitive: json['isCaseSensitive'] == true,
      allowPartialMatch: json['allowPartialMatch'] == true,
      minimumLength: _asInt(json['minimumLength']),
      maximumLength: _asInt(json['maximumLength'], fallback: 1000),
      allowAiReview: json['allowAiReview'] == true,
      allowTeacherReview: json['allowTeacherReview'] == true,
    );
  }

  final String acceptedAnswerId;
  final String answerText;
  final bool isCaseSensitive;
  final bool allowPartialMatch;
  final int minimumLength;
  final int maximumLength;
  final bool allowAiReview;
  final bool allowTeacherReview;
}

class CreateQuizInput {
  const CreateQuizInput({
    required this.title,
    required this.description,
    required this.classId,
    required this.subjectId,
    required this.topicId,
    required this.difficultyLevelId,
    required this.quizTypeId,
    required this.instructions,
    this.timeLimitMinutes,
    this.allowedAttempts = 1,
    this.shuffleQuestions = false,
    this.shuffleOptions = true,
    this.isReviewRequired = true,
    this.navigationMode = 'Free',
    this.reviewDisplayMode = 'Full',
  });

  final String title;
  final String description;
  final int classId;
  final int subjectId;
  final int topicId;
  final int difficultyLevelId;
  final int quizTypeId;
  final String instructions;
  final int? timeLimitMinutes;
  final int? allowedAttempts;
  final bool shuffleQuestions;
  final bool shuffleOptions;
  final bool isReviewRequired;
  final String navigationMode;
  final String reviewDisplayMode;

  Map<String, dynamic> toJson() => {
        'title': title.trim(),
        'description': description.trim(),
        'classId': classId,
        'subjectId': subjectId,
        'topicId': topicId,
        'difficultyLevelId': difficultyLevelId,
        'quizTypeId': quizTypeId > 0 ? quizTypeId : null,
        'instructions': instructions.trim(),
        'timeLimitMinutes': timeLimitMinutes,
        'allowedAttempts': allowedAttempts,
        'shuffleQuestions': shuffleQuestions,
        'shuffleOptions': shuffleOptions,
        'isReviewRequired': isReviewRequired,
        'navigationMode': navigationMode,
        'reviewDisplayMode': 'Full',
      };
}

class AddInlineQuestionInput {
  const AddInlineQuestionInput({
    required this.questionText,
    required this.questionType,
    required this.marks,
    required this.estimatedTimeSeconds,
    this.hint,
    this.explanation,
    this.options = const [],
    this.acceptedAnswers = const [],
  });

  final String questionText;
  final String questionType;
  final int marks;
  final int estimatedTimeSeconds;
  final String? hint;
  final String? explanation;
  final List<InlineQuestionOptionInput> options;
  final List<InlineAcceptedAnswerInput> acceptedAnswers;

  Map<String, dynamic> toJson() => {
        'questionText': questionText.trim(),
        'questionType': questionType,
        'marks': marks,
        'estimatedTimeSeconds': estimatedTimeSeconds,
        'hint': hint?.trim().isEmpty == true ? null : hint?.trim(),
        'explanation':
            explanation?.trim().isEmpty == true ? null : explanation?.trim(),
        'options': [for (final option in options) option.toJson()],
        'acceptedAnswers': [
          for (final answer in acceptedAnswers) answer.toJson(),
        ],
      };
}

class InlineQuestionOptionInput {
  const InlineQuestionOptionInput({
    required this.optionText,
    required this.isCorrect,
    this.optionImageUrl,
  });

  final String optionText;
  final bool isCorrect;
  final String? optionImageUrl;

  Map<String, dynamic> toJson() => {
        'optionText': optionText.trim(),
        'isCorrect': isCorrect,
        'optionImageUrl': optionImageUrl,
      };
}

class InlineAcceptedAnswerInput {
  const InlineAcceptedAnswerInput({
    required this.answerText,
    this.isCaseSensitive = false,
    this.allowPartialMatch = false,
    this.minimumLength = 0,
    this.maximumLength = 1000,
    this.allowAiReview = false,
    this.allowTeacherReview = false,
  });

  final String answerText;
  final bool isCaseSensitive;
  final bool allowPartialMatch;
  final int minimumLength;
  final int maximumLength;
  final bool allowAiReview;
  final bool allowTeacherReview;

  Map<String, dynamic> toJson() => {
        'answerText': answerText.trim(),
        'isCaseSensitive': isCaseSensitive,
        'allowPartialMatch': allowPartialMatch,
        'minimumLength': minimumLength,
        'maximumLength': maximumLength,
        'allowAiReview': allowAiReview,
        'allowTeacherReview': allowTeacherReview,
      };
}

class AssignQuizInput {
  const AssignQuizInput({
    required this.mode,
    required this.startAt,
    required this.endAt,
    required this.allowedAttempts,
    this.studentIds = const [],
    this.groupId,
    this.gradeId,
    this.section,
    this.schoolIds = const [],
  });

  final String mode;
  final DateTime startAt;
  final DateTime endAt;
  final int allowedAttempts;
  final List<String> studentIds;
  final int? groupId;
  final int? gradeId;
  final String? section;
  final List<int> schoolIds;

  Map<String, dynamic> toJson() => {
        'mode': mode,
        'studentIds': studentIds.isEmpty
            ? null
            : [
                for (final id in studentIds) int.tryParse(id) ?? id,
              ],
        'groupId': groupId,
        'startAt': startAt.toUtc().toIso8601String(),
        'endAt': endAt.toUtc().toIso8601String(),
        'allowedAttempts': allowedAttempts,
        'gradeId': gradeId,
        'section': section,
        'schoolIds': schoolIds.isEmpty ? null : schoolIds,
      };
}

class QuizAssignmentItem {
  const QuizAssignmentItem({
    required this.assignmentId,
    required this.studentId,
    required this.studentName,
    required this.startAt,
    required this.endAt,
    required this.allowedAttempts,
    required this.attemptCount,
    required this.isReviewDone,
    required this.resultStatus,
    this.groupId,
  });

  factory QuizAssignmentItem.fromJson(Map<String, dynamic> json) {
    return QuizAssignmentItem(
      assignmentId: _asString(json['assignmentId']),
      studentId: _asString(json['studentId']),
      studentName: _asString(json['studentName']),
      groupId: _asNullableInt(json['groupId']),
      startAt: DateTime.tryParse(json['startAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      endAt: DateTime.tryParse(json['endAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      allowedAttempts: _asInt(json['allowedAttempts'], fallback: 1),
      attemptCount: _asInt(json['attemptCount']),
      isReviewDone: json['isReviewDone'] == true,
      resultStatus: _asString(json['resultStatus']),
    );
  }

  final String assignmentId;
  final String studentId;
  final String studentName;
  final int? groupId;
  final DateTime startAt;
  final DateTime endAt;
  final int allowedAttempts;
  final int attemptCount;
  final bool isReviewDone;
  final String resultStatus;
}

class PendingReviewItem {
  const PendingReviewItem({
    required this.quizId,
    required this.quizTitle,
    required this.attemptId,
    required this.studentId,
    required this.studentName,
    required this.attemptNumber,
    required this.submittedAt,
    required this.totalMarks,
    required this.obtainedMarks,
  });

  factory PendingReviewItem.fromJson(Map<String, dynamic> json) {
    return PendingReviewItem(
      quizId: _asString(json['quizId']),
      quizTitle: _asString(json['quizTitle']),
      attemptId: _asString(json['attemptId']),
      studentId: _asString(json['studentId']),
      studentName: _asString(json['studentName']),
      attemptNumber: _asInt(json['attemptNumber'], fallback: 1),
      submittedAt: DateTime.tryParse(json['submittedAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      totalMarks: _asInt(json['totalMarks']),
      obtainedMarks: _asInt(json['obtainedMarks']),
    );
  }

  final String quizId;
  final String quizTitle;
  final String attemptId;
  final String studentId;
  final String studentName;
  final int attemptNumber;
  final DateTime submittedAt;
  final int totalMarks;
  final int obtainedMarks;
}

class AttemptReview {
  const AttemptReview({
    required this.attemptId,
    required this.quizId,
    required this.quizTitle,
    required this.studentId,
    required this.studentName,
    required this.attemptNumber,
    required this.totalMarks,
    required this.obtainedMarks,
    required this.percentage,
    required this.status,
    required this.isReviewDone,
    required this.submittedAt,
    required this.questions,
    this.focusLossCount = 0,
    this.clipboardPasteCount = 0,
  });

  factory AttemptReview.fromJson(Map<String, dynamic> json) {
    final questionsJson = json['questions'];
    return AttemptReview(
      attemptId: _asString(json['attemptId']),
      quizId: _asString(json['quizId']),
      quizTitle: _asString(json['quizTitle']),
      studentId: _asString(json['studentId']),
      studentName: _asString(json['studentName']),
      attemptNumber: _asInt(json['attemptNumber'], fallback: 1),
      totalMarks: _asInt(json['totalMarks']),
      obtainedMarks: _asInt(json['obtainedMarks']),
      percentage: _asInt(json['percentage']),
      status: _asString(json['status']),
      isReviewDone: json['isReviewDone'] == true,
      submittedAt: DateTime.tryParse(json['submittedAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      questions: questionsJson is List
          ? questionsJson
              .whereType<Map<String, dynamic>>()
              .map(AttemptReviewQuestion.fromJson)
              .toList()
          : const [],
      focusLossCount: _asInt(json['focusLossCount']),
      clipboardPasteCount: _asInt(json['clipboardPasteCount']),
    );
  }

  final String attemptId;
  final String quizId;
  final String quizTitle;
  final String studentId;
  final String studentName;
  final int attemptNumber;
  final int totalMarks;
  final int obtainedMarks;
  final int percentage;
  final String status;
  final bool isReviewDone;
  final DateTime submittedAt;
  final List<AttemptReviewQuestion> questions;
  final int focusLossCount;
  final int clipboardPasteCount;
}

class AttemptReviewQuestion {
  const AttemptReviewQuestion({
    required this.questionId,
    required this.questionText,
    required this.questionType,
    required this.maxMarks,
    required this.awardedMarks,
    required this.isCorrect,
    required this.requiresReview,
    this.selectedOptionId,
    this.submittedText,
    this.parentFeedback,
    this.aiFeedback,
  });

  factory AttemptReviewQuestion.fromJson(Map<String, dynamic> json) {
    return AttemptReviewQuestion(
      questionId: _asString(json['questionId']),
      questionText: _asString(json['questionText']),
      questionType: _asString(json['questionType']),
      maxMarks: _asInt(json['maxMarks']),
      awardedMarks: _asInt(json['awardedMarks']),
      isCorrect: json['isCorrect'] == true,
      selectedOptionId: json['selectedOptionId']?.toString(),
      submittedText: json['submittedText']?.toString(),
      parentFeedback: json['parentFeedback']?.toString(),
      requiresReview: json['requiresReview'] == true,
      aiFeedback: json['aiFeedback']?.toString(),
    );
  }

  final String questionId;
  final String questionText;
  final String questionType;
  final int maxMarks;
  final int awardedMarks;
  final bool isCorrect;
  final String? selectedOptionId;
  final String? submittedText;
  final String? parentFeedback;
  final bool requiresReview;
  final String? aiFeedback;

  AttemptReviewQuestion copyWith({
    int? awardedMarks,
    String? parentFeedback,
  }) {
    return AttemptReviewQuestion(
      questionId: questionId,
      questionText: questionText,
      questionType: questionType,
      maxMarks: maxMarks,
      awardedMarks: awardedMarks ?? this.awardedMarks,
      isCorrect: isCorrect,
      selectedOptionId: selectedOptionId,
      submittedText: submittedText,
      parentFeedback: parentFeedback ?? this.parentFeedback,
      requiresReview: requiresReview,
      aiFeedback: aiFeedback,
    );
  }
}

class MarkAttemptAnswerInput {
  const MarkAttemptAnswerInput({
    required this.questionId,
    required this.awardedMarks,
    this.feedback,
  });

  final String questionId;
  final int awardedMarks;
  final String? feedback;

  Map<String, dynamic> toJson() => {
        'questionId': int.tryParse(questionId) ?? questionId,
        'awardedMarks': awardedMarks,
        'feedback': feedback,
      };
}

class DirectoryStudentOption {
  const DirectoryStudentOption({
    required this.studentId,
    required this.fullName,
    required this.grade,
    required this.section,
  });

  factory DirectoryStudentOption.fromJson(Map<String, dynamic> json) {
    return DirectoryStudentOption(
      studentId: _asString(json['studentId']),
      fullName: _asString(json['fullName']),
      grade: _asInt(json['grade']),
      section: _asString(json['section']),
    );
  }

  final String studentId;
  final String fullName;
  final int grade;
  final String section;
}

class QuizMonitoringSnapshot {
  const QuizMonitoringSnapshot({
    required this.quizId,
    required this.quizTitle,
    required this.totalStudents,
    required this.submittedCount,
    required this.pendingReviewCount,
    required this.reviewedCount,
    required this.students,
  });

  factory QuizMonitoringSnapshot.fromJson(Map<String, dynamic> json) {
    final studentsJson = json['students'];
    return QuizMonitoringSnapshot(
      quizId: _asString(json['quizId']),
      quizTitle: _asString(json['quizTitle']),
      totalStudents: _asInt(json['totalStudents']),
      submittedCount: _asInt(json['submittedCount']),
      pendingReviewCount: _asInt(json['pendingReviewCount']),
      reviewedCount: _asInt(json['reviewedCount']),
      students: studentsJson is List
          ? studentsJson
              .whereType<Map<String, dynamic>>()
              .map(QuizMonitoringStudent.fromJson)
              .toList()
          : const [],
    );
  }

  final String quizId;
  final String quizTitle;
  final int totalStudents;
  final int submittedCount;
  final int pendingReviewCount;
  final int reviewedCount;
  final List<QuizMonitoringStudent> students;
}

class QuizMonitoringStudent {
  const QuizMonitoringStudent({
    required this.studentId,
    required this.studentName,
    required this.assignmentId,
    required this.attemptCount,
    required this.isReviewDone,
    required this.status,
    this.bestPercentage,
    this.lastSubmittedAt,
  });

  factory QuizMonitoringStudent.fromJson(Map<String, dynamic> json) {
    return QuizMonitoringStudent(
      studentId: _asString(json['studentId']),
      studentName: _asString(json['studentName']),
      assignmentId: _asString(json['assignmentId']),
      attemptCount: _asInt(json['attemptCount']),
      bestPercentage: _asNullableInt(json['bestPercentage']),
      isReviewDone: json['isReviewDone'] == true,
      status: _asString(json['status'] ?? json['resultStatus']),
      lastSubmittedAt:
          DateTime.tryParse(json['lastSubmittedAt']?.toString() ?? ''),
    );
  }

  final String studentId;
  final String studentName;
  final String assignmentId;
  final int attemptCount;
  final int? bestPercentage;
  final bool isReviewDone;
  final String status;
  final DateTime? lastSubmittedAt;
}

class PendingQuizApprovalItem {
  const PendingQuizApprovalItem({
    required this.quizId,
    required this.title,
    required this.quizType,
    required this.createdBy,
    required this.approvalStatus,
    this.createdAt,
  });

  factory PendingQuizApprovalItem.fromJson(Map<String, dynamic> json) {
    return PendingQuizApprovalItem(
      quizId: _asString(json['quizId'] ?? json['id']),
      title: _asString(json['title'] ?? json['quizTitle']),
      quizType: _asString(json['quizType']),
      createdBy: _asString(json['createdBy'] ?? json['createdByName']),
      approvalStatus: _asString(json['approvalStatus'] ?? json['status']),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
    );
  }

  final String quizId;
  final String title;
  final String quizType;
  final String createdBy;
  final String approvalStatus;
  final DateTime? createdAt;
}

String _asString(Object? value, {String fallback = ''}) {
  if (value == null) {
    return fallback;
  }
  final text = value.toString();
  return text.isEmpty ? fallback : text;
}

int _asInt(Object? value, {int fallback = 0}) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

int? _asNullableInt(Object? value) {
  if (value == null) {
    return null;
  }
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse(value.toString());
}

List<String> _asStringList(Object? value) {
  if (value is List) {
    return value.map((item) => item.toString()).where((s) => s.isNotEmpty).toList();
  }
  if (value is String && value.trim().isNotEmpty) {
    return value
        .split(RegExp(r'[\n\r]+'))
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();
  }
  return const [];
}
