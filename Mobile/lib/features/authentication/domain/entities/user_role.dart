enum UserRole { student, parent, teacher }

UserRole parseUserRole(String value) {
  return UserRole.values.firstWhere(
    (role) => role.name.toLowerCase() == value.toLowerCase(),
    orElse: () => UserRole.student,
  );
}

extension UserRoleLabel on UserRole {
  String get label {
    return switch (this) {
      UserRole.student => 'Student',
      UserRole.parent => 'Parent',
      UserRole.teacher => 'Teacher',
    };
  }
}
