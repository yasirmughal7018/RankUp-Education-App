/// Linked student from GET /parents/me/students.
class LinkedStudent {
  const LinkedStudent({
    required this.studentId,
    required this.fullName,
    required this.username,
    required this.rollNumber,
    required this.grade,
    required this.section,
    required this.relationship,
  });

  factory LinkedStudent.fromJson(Map<String, dynamic> json) {
    return LinkedStudent(
      studentId: (json['studentId'] as num?)?.toInt() ?? 0,
      fullName: (json['fullName'] as String?)?.trim() ?? '',
      username: (json['username'] as String?)?.trim() ?? '',
      rollNumber: (json['rollNumber'] as String?)?.trim() ?? '',
      grade: (json['grade'] as num?)?.toInt() ?? 0,
      section: (json['section'] as String?)?.trim() ?? '',
      relationship: (json['relationship'] as String?)?.trim() ?? 'Guardian',
    );
  }

  final int studentId;
  final String fullName;
  final String username;
  final String rollNumber;
  final int grade;
  final String section;
  final String relationship;

  String get label {
    final gradeSection = [
      if (grade > 0) 'G$grade',
      if (section.isNotEmpty) section,
    ].join(' · ');
    if (gradeSection.isEmpty) {
      return fullName;
    }
    return '$fullName ($gradeSection)';
  }
}
