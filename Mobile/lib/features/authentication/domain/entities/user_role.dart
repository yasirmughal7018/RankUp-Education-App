enum UserRole { student, parent, teacher, schoolAdmin, superAdmin }

UserRole parseUserRole(String value) {
  final normalized = value.trim().toLowerCase().replaceAll('_', '');
  return switch (normalized) {
    'student' => UserRole.student,
    'parent' => UserRole.parent,
    'teacher' => UserRole.teacher,
    'schooladmin' => UserRole.schoolAdmin,
    'superadmin' => UserRole.superAdmin,
    _ => UserRole.student,
  };
}

bool isAdminRole(UserRole role) {
  return role == UserRole.schoolAdmin || role == UserRole.superAdmin;
}

extension UserRoleLabel on UserRole {
  String get label {
    return switch (this) {
      UserRole.student => 'Student',
      UserRole.parent => 'Parent',
      UserRole.teacher => 'Teacher',
      UserRole.schoolAdmin => 'School Admin',
      UserRole.superAdmin => 'Portal Admin',
    };
  }

  String get apiName {
    return switch (this) {
      UserRole.student => 'Student',
      UserRole.parent => 'Parent',
      UserRole.teacher => 'Teacher',
      UserRole.schoolAdmin => 'SchoolAdmin',
      UserRole.superAdmin => 'SuperAdmin',
    };
  }
}
