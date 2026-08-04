import 'package:flutter/material.dart';
import 'package:rankup_education/features/authentication/data/models/app_user_model.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_summary_model.dart';
import 'package:rankup_education/features/quizzes/presentation/controllers/quizzes_controller.dart';
import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';

/// Maps API JSON into [StudentDashboardModel] domain shapes.
class StudentDashboardMapper {
  const StudentDashboardMapper._();

  static StudentDashboardModel fromApi({
    required AppUserModel user,
    required List<QuizSummaryModel> quizzes,
  }) {
    final now = DateTime.now();
    final completed = quizzes
        .where((quiz) => studentQuizStatus(quiz, now) == 'Completed')
        .toList(growable: false);
    final pending = quizzes.where((quiz) {
      final status = studentQuizStatus(quiz, now);
      return status == 'Not Attempted' ||
          status == 'InProgress' ||
          status == 'Up Coming';
    }).toList(growable: false);

    final averageScore = completed
        .map((quiz) => quiz.resultPercent)
        .whereType<int>()
        .toList(growable: false);
    final averagePercent = averageScore.isEmpty
        ? 0
        : (averageScore.reduce((a, b) => a + b) / averageScore.length).round();

    return StudentDashboardModel(
      student: StudentSummaryModel(
        name: user.name.isEmpty ? user.id : user.name,
        schoolName: user.schoolId.isEmpty ? 'Your School' : 'School #${user.schoolId}',
        grade: 'Student',
        section: user.campusId.isEmpty ? 'Campus' : 'Campus #${user.campusId}',
        avatarInitials: _initials(user.name),
      ),
      level: StudentLevelModel(
        currentLevel: 'Learner',
        nextLevel: 'Achiever',
        totalPoints: completed.length * 100,
        overallRank: 0,
        progressPercent: averagePercent / 100,
        pointsToNextLevel: 0,
        weeklyRankChange: 0,
      ),
      rankings: const RankingSummaryModel(
        classRank: 0,
        schoolRank: 0,
        subjectRank: 0,
        improvementRank: 0,
        weeklyMove: 0,
      ),
      streak: const LearningStreakModel(
        currentDays: 0,
        longestDays: 0,
        completedWeekdays: [false, false, false, false, false, false, false],
        dailyTarget: 'Complete one assigned quiz today.',
        reward: '',
      ),
      quickStats: [
        QuickStatModel(
          title: 'Assigned Quizzes',
          value: quizzes.length.toString(),
          subtitle: '${pending.length} active',
          icon: Icons.quiz_outlined,
          tone: DashboardTone.blue,
        ),
        QuickStatModel(
          title: 'Completed',
          value: completed.length.toString(),
          subtitle: averageScore.isEmpty ? 'No scores yet' : 'Average: $averagePercent%',
          icon: Icons.task_alt_outlined,
          tone: DashboardTone.green,
        ),
        QuickStatModel(
          title: 'In Progress',
          value: quizzes
              .where((quiz) => studentQuizStatus(quiz, now) == 'InProgress')
              .length
              .toString(),
          subtitle: 'Continue attempts',
          icon: Icons.pending_actions_outlined,
          tone: DashboardTone.amber,
        ),
        QuickStatModel(
          title: 'Under Review',
          value: quizzes
              .where((quiz) => studentQuizStatus(quiz, now) == 'Under Review')
              .length
              .toString(),
          subtitle: 'Awaiting feedback',
          icon: Icons.rate_review_outlined,
          tone: DashboardTone.purple,
        ),
      ],
      todayActivities: [
        for (final quiz in pending.take(5)) _activityFromQuiz(quiz, now),
      ],
      subjectPerformance: _subjectPerformance(quizzes, now),
      strongTopics: const [],
      weakTopics: const [],
      aiRecommendation: AiRecommendationModel(
        reason: pending.isEmpty
            ? 'No pending quizzes right now.'
            : 'You have ${pending.length} quiz assignment(s) waiting.',
        activityTitle: pending.isEmpty ? 'Check back later' : pending.first.title,
        estimatedTime: pending.isEmpty
            ? '-'
            : '${pending.first.timeLimitMinutes ?? 15} minutes',
        expectedImprovement: 'Keep your learning streak going.',
      ),
      recentResults: [
        for (final quiz in completed.take(5)) _resultFromQuiz(quiz),
      ],
      learningGoals: const [],
      achievements: const [],
      upcomingActivities: [
        for (final quiz in quizzes
            .where((quiz) => studentQuizStatus(quiz, now) == 'Up Coming')
            .take(4))
          UpcomingActivityModel(
            day: _dueLabel(quiz.startAt ?? quiz.dueAt, now),
            title: quiz.title,
          ),
      ],
      teacherFeedback: const TeacherFeedbackModel(
        teacherName: 'Teacher',
        subject: 'Feedback',
        dateLabel: 'Pending',
        feedback: 'Teacher feedback will appear after quiz reviews are completed.',
      ),
      discussionActivity: const [],
      messageCount: 0,
      notificationCount: pending.length,
      offline: false,
      lastSyncedAt: now,
    );
  }

  static LearningActivityModel _activityFromQuiz(
    QuizSummaryModel quiz,
    DateTime now,
  ) {
    final status = studentQuizStatus(quiz, now);
    final actionLabel = switch (status) {
      'InProgress' => 'Continue',
      'Up Coming' => 'Scheduled',
      _ => 'Start',
    };

    return LearningActivityModel(
      id: quiz.id,
      title: quiz.title,
      subject: quiz.subject,
      topic: quiz.topic,
      activityType: 'Quiz',
      dueLabel: _dueLabel(quiz.dueAt, now),
      progressPercent: status == 'InProgress' ? 0.35 : 0,
      actionLabel: actionLabel,
      tone: DashboardTone.blue,
      icon: Icons.quiz_outlined,
    );
  }

  static ResultModel _resultFromQuiz(QuizSummaryModel quiz) {
    return ResultModel(
      title: quiz.title,
      subject: quiz.subject,
      topic: quiz.topic,
      scorePercent: quiz.resultPercent ?? 0,
      points: quiz.points,
      date: quiz.completedAt ?? DateTime.now(),
      statusLabel: quiz.resultPercent == null ? 'Submitted' : 'Completed',
    );
  }

  static List<SubjectPerformanceModel> _subjectPerformance(
    List<QuizSummaryModel> quizzes,
    DateTime now,
  ) {
    final grouped = <String, List<QuizSummaryModel>>{};
    for (final quiz in quizzes) {
      if (quiz.subject.trim().isEmpty) {
        continue;
      }
      grouped.putIfAbsent(quiz.subject, () => []).add(quiz);
    }

    return grouped.entries.take(4).map((entry) {
      final completed = entry.value
          .where((quiz) => studentQuizStatus(quiz, now) == 'Completed')
          .map((quiz) => quiz.resultPercent)
          .whereType<int>()
          .toList(growable: false);
      final percent = completed.isEmpty
          ? 0
          : (completed.reduce((a, b) => a + b) / completed.length).round();

      return SubjectPerformanceModel(
        subject: entry.key,
        percent: percent,
        trendLabel: completed.isEmpty ? 'No completed quizzes yet' : 'Latest results synced',
        status: percent >= 75 ? 'Strong' : percent >= 50 ? 'Good' : 'Needs Practice',
        lastResult: completed.isEmpty ? 'No result yet' : 'Average: $percent%',
        tone: percent >= 75
            ? DashboardTone.green
            : percent >= 50
                ? DashboardTone.blue
                : DashboardTone.amber,
        icon: Icons.menu_book_outlined,
      );
    }).toList(growable: false);
  }

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) {
      return 'ST';
    }
    if (parts.length == 1) {
      return parts.first.substring(0, 1).toUpperCase();
    }

    return '${parts.first[0]}${parts[1][0]}'.toUpperCase();
  }

  static String _dueLabel(DateTime? dueAt, DateTime now) {
    if (dueAt == null) {
      return 'No due date';
    }

    final today = DateTime(now.year, now.month, now.day);
    final dueDay = DateTime(dueAt.year, dueAt.month, dueAt.day);
    final difference = dueDay.difference(today).inDays;

    if (difference == 0) {
      return 'Due Today';
    }
    if (difference == 1) {
      return 'Due Tomorrow';
    }
    if (difference < 0) {
      return 'Overdue';
    }

    return 'Due in $difference days';
  }
}
