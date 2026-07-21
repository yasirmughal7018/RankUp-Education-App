/// Application roles mapped from API role names.
enum UserRole { student, parent, teacher, schoolAdmin, campusAdmin, portalAdmin }

/// Parses API/legacy role strings into [UserRole], defaulting to student.
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

/// Returns true for school, campus, or portal administrator roles.
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
