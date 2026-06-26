class Permission {
  const Permission(this.value);

  final String value;

  static const viewDashboard = Permission('dashboard.view');
  static const attemptQuiz = Permission('quiz.attempt');
  static const createQuiz = Permission('quiz.create');
  static const reviewWorksheet = Permission('worksheet.review');
  static const sendMessage = Permission('message.send');
}
