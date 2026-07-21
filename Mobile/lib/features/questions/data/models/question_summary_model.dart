/// Lightweight question-bank row returned by `GET /questions`.
///
/// Matches [QuestionSummaryResponse] from WebApi. Approval is still reflected
/// mainly via [status] / [approvedBy]; WebApi also returns 3-tier visibility
/// ([visibility], [schoolId], [campusId]) so Mobile can scope display when those
/// fields are present. Older payloads without those keys remain compatible.
class QuestionSummaryModel {
  const QuestionSummaryModel({
    required this.id,
    required this.text,
    required this.questionType,
    required this.status,
    required this.marks,
    required this.isActive,
    required this.createdBy,
    this.approvedBy,
    this.isAiApproved = false,
    this.schoolId,
    this.campusId,
    this.visibility,
  });

  factory QuestionSummaryModel.fromJson(Map<String, dynamic> json) {
    return QuestionSummaryModel(
      id: _readString(json, ['questionId', 'id']),
      text: _readString(json, ['questionText', 'text']),
      questionType: _readString(json, ['questionType', 'type'], fallback: 'MCQ'),
      status: _readString(json, ['status'], fallback: 'Pending'),
      marks: _readInt(json, ['marks']),
      isActive: _readBool(json, ['isActive'], defaultValue: true),
      createdBy: _readString(json, ['createdBy']),
      approvedBy: _readNullableString(json, ['approvedBy']),
      isAiApproved: _readBool(json, ['isAiApproved']),
      // Optional: omitted on older API responses — defaults keep list parsing safe.
      schoolId: _readNullableInt(json, ['schoolId']),
      campusId: _readNullableInt(json, ['campusId']),
      visibility: _readNullableString(json, ['visibility']),
    );
  }

  /// Stable bank question id (`questionId` or `id` in JSON).
  final String id;

  /// Prompt / stem text shown in list cards.
  final String text;

  /// Bank type label (e.g. MCQ); defaults to `MCQ` when missing.
  final String questionType;

  /// Workflow status: Pending, Approved, Rejected, etc.
  final String status;

  /// Points awarded when used in a quiz.
  final int marks;

  /// When false, the question is hidden from quiz selection (soft deactivate).
  final bool isActive;

  /// Author user id / display key from the API.
  final String createdBy;

  /// Approver identity when bank-approved; null/empty means not yet approved.
  ///
  /// Mobile currently treats non-empty [approvedBy] as “approved” for quiz-ready
  /// UI. WebApi approval is role-scoped (Campus / School / Portal) and sets
  /// [visibility] accordingly — prefer combining these fields when present.
  final String? approvedBy;

  /// Legacy flag kept for API compatibility. Prefer [approvedBy] + Approved
  /// [status] for quiz eligibility; historically true for PortalAdmin AI approve.
  final bool isAiApproved;

  /// Owning school when the question is school/campus-scoped; null if absent.
  final int? schoolId;

  /// Owning campus when visibility is Campus-level; null if absent.
  final int? campusId;

  /// Audience after approval: `None` | `Campus` | `School` | `Public`.
  ///
  /// Set by WebApi from who approved (3-tier). Mobile list UI does not yet
  /// filter or label by this; consumers should respect it when present.
  final String? visibility;
}

String _readString(
  Map<String, dynamic> json,
  List<String> keys, {
  String fallback = '',
}) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.isNotEmpty) {
      return value;
    }
    if (value is num) {
      return value.toString();
    }
  }
  return fallback;
}

String? _readNullableString(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.isNotEmpty) {
      return value;
    }
  }
  return null;
}

int _readInt(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
  }
  return 0;
}

int? _readNullableInt(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
  }
  return null;
}

bool _readBool(
  Map<String, dynamic> json,
  List<String> keys, {
  bool defaultValue = false,
}) {
  for (final key in keys) {
    final value = json[key];
    if (value is bool) {
      return value;
    }
  }
  return defaultValue;
}
