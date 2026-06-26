enum QuizStatus { assigned, available, upcoming, completed }

extension QuizStatusLabel on QuizStatus {
  String get label {
    return switch (this) {
      QuizStatus.assigned => 'Assigned',
      QuizStatus.available => 'Available',
      QuizStatus.upcoming => 'Upcoming',
      QuizStatus.completed => 'Completed',
    };
  }
}

QuizStatus parseQuizStatus(String value) {
  return QuizStatus.values.firstWhere(
    (status) => status.name.toLowerCase() == value.toLowerCase(),
    orElse: () => QuizStatus.available,
  );
}
