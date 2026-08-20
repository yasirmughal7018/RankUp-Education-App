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
    this.schoolName,
    this.campusName,
    required this.isActive,
    this.accountStatus,
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
      schoolName: (json['schoolName'] as String?)?.trim(),
      campusName: (json['campusName'] as String?)?.trim(),
      isActive: json['isActive'] as bool? ?? true,
      accountStatus: (json['accountStatus'] as String?)?.trim(),
    );
  }

  final int studentId;
  final String fullName;
  final String username;
  final String rollNumber;
  final int grade;
  final String section;
  final String relationship;
  final String? schoolName;
  final String? campusName;
  final bool isActive;
  final String? accountStatus;

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

  String get placementLabel {
    final parts = [
      if (schoolName != null && schoolName!.isNotEmpty) schoolName,
      if (campusName != null && campusName!.isNotEmpty) campusName,
    ];
    return parts.isEmpty ? 'School not assigned' : parts.join(' · ');
  }

  String get statusLabel {
    final status = accountStatus?.trim();
    if (status != null && status.isNotEmpty) {
      switch (status) {
        case 'Active':
          return 'Active';
        case 'ApprovedInactive':
          return 'Approved';
        case 'PendingApproval':
          return 'Pending';
        case 'Locked':
          return 'Locked';
        case 'Deactivated':
          return 'Inactive';
        case 'Rejected':
          return 'Rejected';
      }
    }
    return isActive ? 'Active' : 'Inactive';
  }
}

/// Result of POST /parents/me/students (parent self-link).
class LinkMyChildResult {
  const LinkMyChildResult({
    required this.studentId,
    required this.fullName,
    required this.username,
    required this.rollNumber,
    required this.grade,
    required this.section,
    required this.relationship,
    this.schoolName,
    this.campusName,
    required this.isActive,
    this.accountStatus,
    required this.alreadyLinked,
  });

  factory LinkMyChildResult.fromJson(Map<String, dynamic> json) {
    return LinkMyChildResult(
      studentId: (json['studentId'] as num?)?.toInt() ?? 0,
      fullName: (json['fullName'] as String?)?.trim() ?? '',
      username: (json['username'] as String?)?.trim() ?? '',
      rollNumber: (json['rollNumber'] as String?)?.trim() ?? '',
      grade: (json['grade'] as num?)?.toInt() ?? 0,
      section: (json['section'] as String?)?.trim() ?? '',
      relationship: (json['relationship'] as String?)?.trim() ?? 'Guardian',
      schoolName: (json['schoolName'] as String?)?.trim(),
      campusName: (json['campusName'] as String?)?.trim(),
      isActive: json['isActive'] as bool? ?? true,
      accountStatus: (json['accountStatus'] as String?)?.trim(),
      alreadyLinked: json['alreadyLinked'] as bool? ?? false,
    );
  }

  final int studentId;
  final String fullName;
  final String username;
  final String rollNumber;
  final int grade;
  final String section;
  final String relationship;
  final String? schoolName;
  final String? campusName;
  final bool isActive;
  final String? accountStatus;
  final bool alreadyLinked;
}
