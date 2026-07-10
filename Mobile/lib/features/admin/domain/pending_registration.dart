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
    this.adminTarget,
    this.rollNumberTeacherCode,
  });

  factory PendingRegistration.fromJson(Map<String, dynamic> json) {
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
      adminTarget: json['adminTarget'] as String?,
      rollNumberTeacherCode: json['rollNumberTeacherCode'] as String?,
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
  final String? adminTarget;
  final String? rollNumberTeacherCode;
}
