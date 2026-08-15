/// Application roles mapped from API role names.
enum UserRole {
  student,
  parent,
  teacher,
  coordinator,
  tutor,
  schoolAdmin,
  campusAdmin,
  portalAdmin,
}

/// Parses API/legacy role strings into [UserRole], defaulting to student.
UserRole parseUserRole(String value) {
  return switch (value.trim().toLowerCase()) {
    'student' => UserRole.student,
    'parent' => UserRole.parent,
    'teacher' => UserRole.teacher,
    'coordinator' => UserRole.coordinator,
    'tutor' => UserRole.tutor,
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
      role == UserRole.coordinator ||
      role == UserRole.parent ||
      role == UserRole.tutor;
}

/// SchoolAdmin / PortalAdmin may approve teacher quizzes (not CampusAdmin).
bool canApproveQuizzes(UserRole role) {
  return role == UserRole.schoolAdmin || role == UserRole.portalAdmin;
}

/// Roles that may endorse or publish bank questions.
bool canApproveQuestions(UserRole role) {
  return role == UserRole.portalAdmin ||
      role == UserRole.schoolAdmin ||
      role == UserRole.campusAdmin;
}

/// PortalAdmin alone publishes (Public + Active) and runs bank lifecycle.
bool canPublishQuestions(UserRole role) {
  return role == UserRole.portalAdmin;
}

/// Assign mode options for the signed-in role (mirrors web assignModesForRole).
List<({String value, String label})> assignModesForRole(UserRole role) {
  const studentModes = [
    (value: 'one', label: 'One student'),
    (value: 'selected', label: 'Selected students'),
  ];

  return switch (role) {
    UserRole.parent => [
        ...studentModes,
        (value: 'group', label: 'Group'),
        (value: 'alllinked', label: 'All linked children'),
      ],
    UserRole.tutor => [
        ...studentModes,
        (value: 'alllinked', label: 'All linked students'),
      ],
    UserRole.schoolAdmin => [
        ...studentModes,
        (value: 'allinschool', label: 'All in school'),
      ],
    UserRole.portalAdmin => [
        ...studentModes,
        (value: 'allinschool', label: 'All in school'),
        (value: 'multischool', label: 'Multiple schools'),
        (value: 'public', label: 'Public (catalog)'),
      ],
    _ => [
        ...studentModes,
        (value: 'group', label: 'Group'),
        (value: 'allingrade', label: 'All in grade'),
        (value: 'allinsection', label: 'All in section'),
      ],
  };
}

extension UserRoleLabel on UserRole {
  String get label {
    return switch (this) {
      UserRole.student => 'Student',
      UserRole.parent => 'Parent',
      UserRole.teacher => 'Teacher',
      UserRole.coordinator => 'Coordinator',
      UserRole.tutor => 'Tutor',
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
      UserRole.coordinator => 'Coordinator',
      UserRole.tutor => 'Tutor',
      UserRole.schoolAdmin => 'SchoolAdmin',
      UserRole.campusAdmin => 'CampusAdmin',
      UserRole.portalAdmin => 'PortalAdmin',
    };
  }
}
