export const queryKeys = {
  lookups: (type?: string, parentId?: number | null) =>
    ["lookups", type ?? "all", parentId ?? null] as const,
  lookupTypes: () => ["lookup-types"] as const,
  quizzes: (search?: string) => ["quizzes", search ?? ""] as const,
  manageQuiz: (quizId: number) => ["quizzes", "manage", quizId] as const,
  quizAssignments: (quizId: number) => ["quizzes", quizId, "assignments"] as const,
  assignmentBoard: (studentId?: number | null) =>
    ["quizzes", "assignment-board", studentId ?? null] as const,
  pendingReviews: () => ["quizzes", "reviews", "pending"] as const,
  quizMonitoring: (quizId: number) => ["quizzes", quizId, "monitoring"] as const,
  attemptReview: (quizId: number, attemptId: number) =>
    ["quizzes", quizId, "attempts", attemptId, "review"] as const,
  questions: (filters: Record<string, unknown>) =>
    ["questions", filters] as const,
  question: (questionId: number) => ["questions", questionId] as const,
  pendingRegistrations: () => ["admin", "registrations", "pending"] as const,
  studentQuizDetail: (quizId: number) => ["student", "quizzes", quizId] as const,
  studentQuizResult: (quizId: number, attemptId: number) =>
    ["student", "quizzes", quizId, "attempts", attemptId, "result"] as const,
  linkedStudents: () => ["parents", "me", "students"] as const,
  studentQuizHistory: (studentId: number) =>
    ["reports", "students", studentId, "quiz-history"] as const,
  directorySchools: () => ["directory", "schools"] as const,
  directoryCampuses: (schoolId: number) =>
    ["directory", "schools", schoolId, "campuses"] as const,
  directoryStudents: (filters: {
    schoolId?: number | null;
    campusId?: number | null;
    grade?: number | null;
    search?: string;
  }) => ["directory", "students", filters] as const,
  directoryTeachers: (filters: {
    schoolId?: number | null;
    campusId?: number | null;
    search?: string;
  }) => ["directory", "teachers", filters] as const,
  directoryParents: (search?: string) =>
    ["directory", "parents", search ?? ""] as const,
  reportQuizSummary: () => ["reports", "quiz-summary"] as const,
  reportQuizPerformance: (quizId: number) =>
    ["reports", "quizzes", quizId, "performance"] as const,
  reportRankings: (quizId?: number | null) =>
    ["reports", "rankings", quizId ?? null] as const,
};
