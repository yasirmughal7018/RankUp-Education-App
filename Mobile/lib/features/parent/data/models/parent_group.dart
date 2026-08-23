/// Parent-owned child group from GET /parents/me/groups.
class ParentGroupMember {
  const ParentGroupMember({
    required this.studentId,
    required this.fullName,
    required this.username,
    required this.rollNumber,
    required this.grade,
    required this.section,
  });

  factory ParentGroupMember.fromJson(Map<String, dynamic> json) {
    return ParentGroupMember(
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

  String get label {
    final gradeSection = [
      if (grade > 0) 'Grade $grade',
      if (section.isNotEmpty) section,
    ].join(' · ');
    if (gradeSection.isEmpty) {
      return fullName;
    }
    return '$fullName ($gradeSection)';
  }
}

class ParentGroup {
  const ParentGroup({
    required this.groupId,
    required this.groupName,
    required this.description,
    required this.isActive,
    required this.memberCount,
    required this.members,
  });

  factory ParentGroup.fromJson(Map<String, dynamic> json) {
    final members = json['members'];
    return ParentGroup(
      groupId: (json['groupId'] as num?)?.toInt() ?? 0,
      groupName: (json['groupName'] as String?)?.trim() ?? '',
      description: (json['description'] as String?)?.trim() ?? '',
      isActive: json['isActive'] as bool? ?? true,
      memberCount: (json['memberCount'] as num?)?.toInt() ?? 0,
      members: members is List
          ? members
                .whereType<Map<dynamic, dynamic>>()
                .map(
                  (item) => ParentGroupMember.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .where((member) => member.studentId > 0)
                .toList()
          : const [],
    );
  }

  final int groupId;
  final String groupName;
  final String description;
  final bool isActive;
  final int memberCount;
  final List<ParentGroupMember> members;
}
