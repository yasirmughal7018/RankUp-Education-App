class PendingApprover {
  const PendingApprover({
    required this.userId,
    required this.fullName,
    required this.username,
    required this.role,
  });

  factory PendingApprover.fromJson(Map<String, dynamic> json) {
    return PendingApprover(
      userId: (json['userId'] as num?)?.toInt() ?? 0,
      fullName: json['fullName'] as String? ?? '',
      username: json['username'] as String? ?? '',
      role: json['role'] as String? ?? '',
    );
  }

  final int userId;
  final String fullName;
  final String username;
  final String role;

  String get roleLabel {
    return switch (role) {
      'PortalAdmin' => 'Portal Admin',
      'SchoolAdmin' => 'School Admin',
      'CampusAdmin' => 'Campus Admin',
      _ => role,
    };
  }
}

class PendingRegistration {
  const PendingRegistration({
    required this.id,
    required this.username,
    required this.fullName,
    required this.role,
    this.requestedAt,
    this.mobileNumber,
    this.emailAddress,
    this.cnic,
    this.schoolId,
    this.campusId,
    this.createdDate,
    this.reasonMessage,
    this.rollNumberTeacherCode,
    this.pendingApprovers = const [],
    this.currentUserHasApproved = false,
  });

  factory PendingRegistration.fromJson(Map<String, dynamic> json) {
    final approversJson = json['pendingApprovers'];
    final approvers = approversJson is List
        ? approversJson
            .whereType<Map<String, dynamic>>()
            .map(PendingApprover.fromJson)
            .toList()
        : const <PendingApprover>[];

    return PendingRegistration(
      id: (json['id'] as num).toInt(),
      username: json['username'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '',
      role: json['role'] as String? ?? '',
      requestedAt: json['requestedAt'] as String?,
      mobileNumber: json['mobileNumber'] as String?,
      emailAddress: json['emailAddress'] as String?,
      cnic: json['cnic'] as String?,
      schoolId: (json['schoolId'] as num?)?.toInt(),
      campusId: (json['campusId'] as num?)?.toInt(),
      createdDate: json['createdDate'] as String?,
      reasonMessage: json['reasonMessage'] as String?,
      rollNumberTeacherCode: json['rollNumberTeacherCode'] as String?,
      pendingApprovers: approvers,
      currentUserHasApproved: json['currentUserHasApproved'] as bool? ?? false,
    );
  }

  final int id;
  final String username;
  final String fullName;
  final String role;
  final String? requestedAt;
  final String? mobileNumber;
  final String? emailAddress;
  final String? cnic;
  final int? schoolId;
  final int? campusId;
  final String? createdDate;
  final String? reasonMessage;
  final String? rollNumberTeacherCode;
  final List<PendingApprover> pendingApprovers;
  final bool currentUserHasApproved;

  String get pendingWithLabel {
    if (pendingApprovers.isEmpty) {
      return '—';
    }

    return pendingApprovers
        .map((approver) => '${approver.fullName} (${approver.roleLabel})')
        .join(', ');
  }
}
