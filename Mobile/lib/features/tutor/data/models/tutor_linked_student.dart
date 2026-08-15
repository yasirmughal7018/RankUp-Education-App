/// Linked student from GET /tutors/me/students.
class TutorLinkedStudent {
  const TutorLinkedStudent({
    required this.studentId,
    required this.fullName,
    required this.username,
    required this.rollNumber,
    required this.grade,
    required this.section,
    this.schoolName,
  });

  factory TutorLinkedStudent.fromJson(Map<String, dynamic> json) {
    return TutorLinkedStudent(
      studentId: (json['studentId'] as num?)?.toInt() ?? 0,
      fullName: (json['fullName'] as String?)?.trim() ?? '',
      username: (json['username'] as String?)?.trim() ?? '',
      rollNumber: (json['rollNumber'] as String?)?.trim() ?? '',
      grade: (json['grade'] as num?)?.toInt() ?? 0,
      section: (json['section'] as String?)?.trim() ?? '',
      schoolName: (json['schoolName'] as String?)?.trim(),
    );
  }

  final int studentId;
  final String fullName;
  final String username;
  final String rollNumber;
  final int grade;
  final String section;
  final String? schoolName;

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

/// Result of POST /tutors/me/students.
class LinkTutorStudentResult extends TutorLinkedStudent {
  const LinkTutorStudentResult({
    required super.studentId,
    required super.fullName,
    required super.username,
    required super.rollNumber,
    required super.grade,
    required super.section,
    required this.alreadyLinked,
    super.schoolName,
  });

  factory LinkTutorStudentResult.fromJson(Map<String, dynamic> json) {
    return LinkTutorStudentResult(
      studentId: (json['studentId'] as num?)?.toInt() ?? 0,
      fullName: (json['fullName'] as String?)?.trim() ?? '',
      username: (json['username'] as String?)?.trim() ?? '',
      rollNumber: (json['rollNumber'] as String?)?.trim() ?? '',
      grade: (json['grade'] as num?)?.toInt() ?? 0,
      section: (json['section'] as String?)?.trim() ?? '',
      schoolName: (json['schoolName'] as String?)?.trim(),
      alreadyLinked: json['alreadyLinked'] as bool? ?? false,
    );
  }

  final bool alreadyLinked;
}
