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
    );
  }

  final String id;
  final String text;
  final String questionType;
  final String status;
  final int marks;
  final bool isActive;
  final String createdBy;
  final String? approvedBy;
  final bool isAiApproved;
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
