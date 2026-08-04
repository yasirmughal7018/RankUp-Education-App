/// One active lookup option for create/edit dropdowns.
class LookupItem {
  const LookupItem({
    required this.id,
    required this.name,
    required this.type,
    this.parentId,
  });

  factory LookupItem.fromJson(Map<String, dynamic> json) {
    return LookupItem(
      id: _asInt(json['id']),
      name: json['name']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      parentId: json['parentId'] == null ? null : _asInt(json['parentId']),
    );
  }

  final int id;
  final String name;
  final String type;
  final int? parentId;
}

int _asInt(Object? value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

/// Lookup type names used by quiz/question authoring.
abstract final class LookupTypes {
  static const classType = 'Class';
  static const subject = 'Subject';
  static const topic = 'Topic';
  static const difficulty = 'DifficultyLevel';
  static const quizType = 'QuizType';
  static const questionType = 'QuestionType';
}
