/// Class placement and assigned people for the signed-in student.
class StudentMeOverviewModel {
  const StudentMeOverviewModel({
    required this.fullName,
    required this.username,
    required this.rollNumber,
    required this.grade,
    required this.section,
    required this.schoolName,
    required this.campusName,
    required this.parentNames,
    required this.coordinatorNames,
    required this.teacherNames,
    required this.tutorNames,
  });

  factory StudentMeOverviewModel.fromJson(Map<String, dynamic> json) {
    return StudentMeOverviewModel(
      fullName: (json['fullName'] as String?)?.trim() ?? '',
      username: (json['username'] as String?)?.trim() ?? '',
      rollNumber: (json['rollNumber'] as String?)?.trim() ?? '',
      grade: _asInt(json['grade']),
      section: (json['section'] as String?)?.trim() ?? '',
      schoolName: (json['schoolName'] as String?)?.trim(),
      campusName: (json['campusName'] as String?)?.trim(),
      parentNames: _asPeopleNames(json['parents'] ?? json['parentNames']),
      coordinatorNames:
          _asPeopleNames(json['coordinators'] ?? json['coordinatorNames']),
      teacherNames: _asPeopleNames(json['teachers'] ?? json['teacherNames']),
      tutorNames: _asPeopleNames(json['tutors'] ?? json['tutorNames']),
    );
  }

  final String fullName;
  final String username;
  final String rollNumber;
  final int grade;
  final String section;
  final String? schoolName;
  final String? campusName;
  final List<String> parentNames;
  final List<String> coordinatorNames;
  final List<String> teacherNames;
  final List<String> tutorNames;

  String get classLabel {
    final trimmedSection = section.trim();
    return trimmedSection.isEmpty
        ? 'Grade $grade'
        : 'Grade $grade · $trimmedSection';
  }

  String get schoolCampusLabel {
    final parts = <String>[
      if (schoolName != null && schoolName!.isNotEmpty) schoolName!,
      if (campusName != null && campusName!.isNotEmpty) campusName!,
    ];
    return parts.isEmpty ? 'School not set' : parts.join(' · ');
  }
}

int _asInt(Object? value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse('$value') ?? 0;
}

List<String> _asPeopleNames(Object? value) {
  if (value is! List) {
    return const [];
  }

  return value
      .map((item) {
        if (item is String) {
          return item.trim();
        }
        if (item is Map) {
          return '${item['fullName'] ?? ''}'.trim();
        }
        return '';
      })
      .where((item) => item.isNotEmpty)
      .toList(growable: false);
}
