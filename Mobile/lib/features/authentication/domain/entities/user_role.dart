enum UserRole { student, parent, teacher, schoolAdmin, campusAdmin, portalAdmin }

UserRole parseUserRole(String value) {
  return switch (value.trim().toLowerCase()) {
    'student' => UserRole.student,
    'parent' => UserRole.parent,
    'teacher' => UserRole.teacher,
    'schooladmin' => UserRole.schoolAdmin,
    'campusadmin' => UserRole.campusAdmin,
    // PortalAdmin is the current API/DB name; superadmin is legacy.
    'portaladmin' || 'superadmin' => UserRole.portalAdmin,
    _ => UserRole.student,
  };
}

bool isAdminRole(UserRole role) {
  return role == UserRole.schoolAdmin ||
      role == UserRole.campusAdmin ||
      role == UserRole.portalAdmin;
}

/// Question-bank manage roles (Students use quizzes only).
bool canManageQuestions(UserRole role) {
  return role == UserRole.portalAdmin ||
      role == UserRole.schoolAdmin ||
      role == UserRole.campusAdmin ||
      role == UserRole.teacher ||
      role == UserRole.parent;
}

extension UserRoleLabel on UserRole {
  String get label {
    return switch (this) {
      UserRole.student => 'Student',
      UserRole.parent => 'Parent',
      UserRole.teacher => 'Teacher',
      UserRole.schoolAdmin => 'School Admin',
      UserRole.campusAdmin => 'Campus Admin',
      UserRole.portalAdmin => 'Portal Admin',
    };
  }

  String get apiName {
    return switch (this) {
      UserRole.student => 'Student',
      UserRole.parent => 'Parent',
      UserRole.teacher => 'Teacher',
      UserRole.schoolAdmin => 'SchoolAdmin',
      UserRole.campusAdmin => 'CampusAdmin',
      UserRole.portalAdmin => 'PortalAdmin',
    };
  }
}
