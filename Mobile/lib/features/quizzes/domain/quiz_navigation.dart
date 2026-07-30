/// Canonical quiz navigation modes — matches WebApi / React (`Free` | `Sequential` | `Locked`).
library;

const String quizNavigationFree = 'Free';
const String quizNavigationSequential = 'Sequential';
const String quizNavigationLocked = 'Locked';

/// Normalizes API or legacy display labels to Free / Sequential / Locked.
String normalizeQuizNavigationMode(String? value) {
  final normalized = (value ?? '').trim().toLowerCase().replaceAll(' ', '');
  if (normalized == 'sequential' || normalized == 'sequentialnavigation') {
    return quizNavigationSequential;
  }
  if (normalized == 'locked' || normalized == 'lockednavigation') {
    return quizNavigationLocked;
  }
  return quizNavigationFree;
}

String quizNavigationDisplayLabel(String mode) {
  return switch (normalizeQuizNavigationMode(mode)) {
    quizNavigationSequential => 'Sequential',
    quizNavigationLocked => 'Locked',
    _ => 'Free',
  };
}

/// Sequential and Locked require the current question answered before Next.
bool quizNavigationRequiresAnswerBeforeNext(String? mode) {
  final normalized = normalizeQuizNavigationMode(mode);
  return normalized == quizNavigationSequential ||
      normalized == quizNavigationLocked;
}

String quizNavigationMessage(String mode) {
  return switch (normalizeQuizNavigationMode(mode)) {
    quizNavigationSequential =>
      'Answer with previous/next only — jump by number is disabled.',
    quizNavigationLocked =>
      'Forward only after answering — you cannot go back.',
    _ => 'Move freely between all questions.',
  };
}
