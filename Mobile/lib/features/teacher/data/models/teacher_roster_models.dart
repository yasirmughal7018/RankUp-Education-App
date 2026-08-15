class TeacherRosterStudent {
  const TeacherRosterStudent({
    required this.studentId,
    required this.fullName,
    required this.username,
    required this.rollNumber,
    required this.grade,
    required this.section,
  });

  factory TeacherRosterStudent.fromJson(Map<String, dynamic> json) {
    return TeacherRosterStudent(
      studentId: (json['studentId'] as num?)?.toInt() ?? 0,
      fullName: (json['fullName'] as String?)?.trim() ?? '',
      username: (json['username'] as String?)?.trim() ?? '',
      rollNumber: (json['rollNumber'] as String?)?.trim() ?? '',
      grade: (json['grade'] as num?)?.toInt() ?? 0,
      section: (json['section'] as String?)?.trim() ?? '',
    );
  }

  final int studentId;
  final String fullName;
  final String username;
  final String rollNumber;
  final int grade;
  final String section;

  String get label => '$fullName (Grade $grade$section)';
}

class TeacherClassSection {
  const TeacherClassSection({required this.grade, required this.section});

  factory TeacherClassSection.fromJson(Map<String, dynamic> json) {
    return TeacherClassSection(
      grade: (json['grade'] as num?)?.toInt() ?? 0,
      section: (json['section'] as String?)?.trim() ?? '',
    );
  }

  final int grade;
  final String section;

  String get label => 'Grade $grade$section';
}

class TeacherRoster {
  const TeacherRoster({
    required this.classSections,
    required this.students,
  });

  factory TeacherRoster.fromJson(Map<String, dynamic> json) {
    final sections = json['classSections'];
    final students = json['students'];
    return TeacherRoster(
      classSections: sections is List
          ? sections
              .whereType<Map<dynamic, dynamic>>()
              .map(
                (item) => TeacherClassSection.fromJson(
                  Map<String, dynamic>.from(item),
                ),
              )
              .toList()
          : const [],
      students: students is List
          ? students
              .whereType<Map<dynamic, dynamic>>()
              .map(
                (item) => TeacherRosterStudent.fromJson(
                  Map<String, dynamic>.from(item),
                ),
              )
              .where((student) => student.studentId > 0)
              .toList()
          : const [],
    );
  }

  final List<TeacherClassSection> classSections;
  final List<TeacherRosterStudent> students;
}

class AddMyStudentResult {
  const AddMyStudentResult({
    required this.student,
    required this.alreadyOnRoster,
  });

  factory AddMyStudentResult.fromJson(Map<String, dynamic> json) {
    return AddMyStudentResult(
      student: TeacherRosterStudent.fromJson(json),
      alreadyOnRoster: json['alreadyOnRoster'] as bool? ?? false,
    );
  }

  final TeacherRosterStudent student;
  final bool alreadyOnRoster;
}

class TeacherGroup {
  const TeacherGroup({
    required this.groupId,
    required this.groupName,
    required this.description,
    required this.memberCount,
    required this.members,
  });

  factory TeacherGroup.fromJson(Map<String, dynamic> json) {
    final members = json['members'];
    return TeacherGroup(
      groupId: (json['groupId'] as num?)?.toInt() ?? 0,
      groupName: (json['groupName'] as String?)?.trim() ?? '',
      description: (json['description'] as String?)?.trim() ?? '',
      memberCount: (json['memberCount'] as num?)?.toInt() ?? 0,
      members: members is List
          ? members
              .whereType<Map<dynamic, dynamic>>()
              .map(
                (item) => TeacherRosterStudent.fromJson(
                  Map<String, dynamic>.from(item),
                ),
              )
              .toList()
          : const [],
    );
  }

  final int groupId;
  final String groupName;
  final String description;
  final int memberCount;
  final List<TeacherRosterStudent> members;
}
