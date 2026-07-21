import 'package:flutter/material.dart';

/// Aggregated student dashboard payload from the API.
class StudentDashboardModel {
  const StudentDashboardModel({
    required this.student,
    required this.level,
    required this.rankings,
    required this.streak,
    required this.quickStats,
    required this.todayActivities,
    required this.subjectPerformance,
    required this.strongTopics,
    required this.weakTopics,
    required this.aiRecommendation,
    required this.recentResults,
    required this.learningGoals,
    required this.achievements,
    required this.upcomingActivities,
    required this.teacherFeedback,
    required this.discussionActivity,
    required this.messageCount,
    required this.notificationCount,
    required this.offline,
    required this.lastSyncedAt,
  });

  factory StudentDashboardModel.mock() {
    final now = DateTime.now();

    return StudentDashboardModel(
      student: const StudentSummaryModel(
        name: 'Ayan Khan',
        schoolName: 'RankUp Public School',
        grade: 'Grade 5',
        section: 'Section A',
        avatarInitials: 'AK',
      ),
      level: const StudentLevelModel(
        currentLevel: 'Gold II',
        nextLevel: 'Gold III',
        totalPoints: 4850,
        overallRank: 125,
        progressPercent: 0.78,
        pointsToNextLevel: 750,
        weeklyRankChange: 12,
      ),
      rankings: const RankingSummaryModel(
        classRank: 3,
        schoolRank: 18,
        subjectRank: 5,
        improvementRank: 2,
        weeklyMove: 6,
      ),
      streak: const LearningStreakModel(
        currentDays: 7,
        longestDays: 14,
        completedWeekdays: [true, true, true, true, true, false, false],
        dailyTarget: 'Complete one activity today to continue your streak.',
        reward: '+50 points streak reward',
      ),
      quickStats: const [
        QuickStatModel(
          title: 'Quizzes',
          value: '24',
          subtitle: 'Average: 82%',
          icon: Icons.quiz_outlined,
          tone: DashboardTone.blue,
        ),
        QuickStatModel(
          title: 'Worksheets',
          value: '18',
          subtitle: '3 pending',
          icon: Icons.description_outlined,
          tone: DashboardTone.amber,
        ),
        QuickStatModel(
          title: 'Discussions',
          value: '12',
          subtitle: 'Helpful answers',
          icon: Icons.forum_outlined,
          tone: DashboardTone.green,
        ),
        QuickStatModel(
          title: 'Achievements',
          value: '8',
          subtitle: '2 certificates',
          icon: Icons.workspace_premium_outlined,
          tone: DashboardTone.gold,
        ),
      ],
      todayActivities: [
        const LearningActivityModel(
          id: 'activity-1',
          title: 'Mathematics Quiz',
          subject: 'Mathematics',
          topic: 'Fractions',
          activityType: 'Quiz',
          dueLabel: 'Due Today',
          progressPercent: 0,
          actionLabel: 'Start',
          tone: DashboardTone.blue,
          icon: Icons.calculate_outlined,
        ),
        const LearningActivityModel(
          id: 'activity-2',
          title: 'Science Worksheet',
          subject: 'Science',
          topic: 'Human Digestive System',
          activityType: 'Worksheet',
          dueLabel: 'Due Tomorrow',
          progressPercent: 0.45,
          actionLabel: 'Continue',
          tone: DashboardTone.amber,
          icon: Icons.science_outlined,
        ),
        const LearningActivityModel(
          id: 'activity-3',
          title: 'English Practice',
          subject: 'English',
          topic: 'Grammar Revision',
          activityType: 'AI Recommended',
          dueLabel: '15 minutes',
          progressPercent: 0,
          actionLabel: 'Start Practice',
          tone: DashboardTone.purple,
          icon: Icons.auto_awesome_outlined,
        ),
      ],
      subjectPerformance: const [
        SubjectPerformanceModel(
          subject: 'Mathematics',
          percent: 88,
          trendLabel: '+6% this month',
          status: 'Strong',
          lastResult: 'Last quiz: 90%',
          tone: DashboardTone.green,
          icon: Icons.calculate_outlined,
        ),
        SubjectPerformanceModel(
          subject: 'Science',
          percent: 81,
          trendLabel: '+2% this month',
          status: 'Strong',
          lastResult: 'Last worksheet: 78%',
          tone: DashboardTone.green,
          icon: Icons.science_outlined,
        ),
        SubjectPerformanceModel(
          subject: 'English',
          percent: 67,
          trendLabel: '-4% this month',
          status: 'Needs Practice',
          lastResult: 'Last quiz: 62%',
          tone: DashboardTone.amber,
          icon: Icons.menu_book_outlined,
        ),
        SubjectPerformanceModel(
          subject: 'Computer',
          percent: 76,
          trendLabel: '+1% this month',
          status: 'Good',
          lastResult: 'Last activity: 80%',
          tone: DashboardTone.blue,
          icon: Icons.computer_outlined,
        ),
      ],
      strongTopics: const [
        TopicModel(title: 'Addition of Fractions', masteryPercent: 91),
        TopicModel(title: 'Plants and Photosynthesis', masteryPercent: 87),
        TopicModel(title: 'Computer Basics', masteryPercent: 84),
      ],
      weakTopics: const [
        TopicModel(
          title: 'English Tenses',
          masteryPercent: 52,
          recommendation: 'Complete one worksheet',
        ),
        TopicModel(
          title: 'Decimal Division',
          masteryPercent: 58,
          recommendation: 'Try a 10-question practice quiz',
        ),
        TopicModel(
          title: 'Human Digestive System',
          masteryPercent: 61,
          recommendation: 'Review teacher notes',
        ),
      ],
      aiRecommendation: const AiRecommendationModel(
        reason:
            'You are performing well in Mathematics, but English grammar has decreased.',
        activityTitle: 'Present and Past Tenses worksheet',
        estimatedTime: '15 minutes',
        expectedImprovement: '+8% grammar mastery',
      ),
      recentResults: [
        ResultModel(
          title: 'Mathematics Quiz',
          subject: 'Mathematics',
          topic: 'Fractions',
          scorePercent: 90,
          points: 120,
          date: now.subtract(const Duration(days: 1)),
          statusLabel: 'Excellent',
        ),
        ResultModel(
          title: 'Science Worksheet',
          subject: 'Science',
          topic: 'Plants',
          scorePercent: 78,
          points: 80,
          date: now.subtract(const Duration(days: 2)),
          statusLabel: 'Good',
        ),
        ResultModel(
          title: 'English Quiz',
          subject: 'English',
          topic: 'Tenses',
          scorePercent: 62,
          points: 45,
          date: now.subtract(const Duration(days: 3)),
          statusLabel: 'Needs Improvement',
        ),
      ],
      learningGoals: const [
        LearningGoalModel(
          title: 'Complete 5 Math Quizzes',
          progressLabel: '4 of 5 completed',
          progressPercent: 0.8,
          assignedBy: 'Assigned by Teacher',
        ),
        LearningGoalModel(
          title: 'Improve English Score to 75%',
          progressLabel: 'Current score: 67%',
          progressPercent: 0.67,
          assignedBy: 'Suggested by AI',
        ),
        LearningGoalModel(
          title: 'Read for 20 Minutes Daily',
          progressLabel: '5 of 7 days completed',
          progressPercent: 0.71,
          assignedBy: 'Created by Student',
        ),
      ],
      achievements: const [
        AchievementModel(
          title: 'Math Star',
          description: 'Completed 10 Mathematics quizzes',
          icon: Icons.emoji_events_outlined,
          tone: DashboardTone.gold,
        ),
        AchievementModel(
          title: '7-Day Streak',
          description: 'Learned for 7 consecutive days',
          icon: Icons.local_fire_department_outlined,
          tone: DashboardTone.amber,
        ),
        AchievementModel(
          title: 'Helpful Student',
          description: 'Received 5 helpful-answer votes',
          icon: Icons.volunteer_activism_outlined,
          tone: DashboardTone.green,
        ),
      ],
      upcomingActivities: const [
        UpcomingActivityModel(day: 'Today', title: 'Math Quiz - 5:00 PM'),
        UpcomingActivityModel(day: 'Tomorrow', title: 'Science Worksheet Due'),
        UpcomingActivityModel(
          day: 'Friday',
          title: 'Class Discussion: Climate Change',
        ),
        UpcomingActivityModel(
          day: 'Monday',
          title: 'Inter-School Quiz Competition',
        ),
      ],
      teacherFeedback: const TeacherFeedbackModel(
        teacherName: 'Ms. Fatima',
        subject: 'English Teacher',
        dateLabel: 'Today',
        feedback:
            'You have improved significantly in Mathematics. Continue practising English grammar.',
      ),
      discussionActivity: const [
        DiscussionActivityModel(
          title: 'New Reply',
          description: 'How do plants make food?',
          actionLabel: 'View Discussion',
        ),
        DiscussionActivityModel(
          title: 'Helpful Votes',
          description: 'Your answer received 3 helpful votes.',
          actionLabel: 'View Best Answer',
        ),
        DiscussionActivityModel(
          title: 'New Topic',
          description: 'Should homework be reduced?',
          actionLabel: 'Reply',
        ),
      ],
      messageCount: 2,
      notificationCount: 3,
      offline: false,
      lastSyncedAt: now,
    );
  }

  final StudentSummaryModel student;
  final StudentLevelModel level;
  final RankingSummaryModel rankings;
  final LearningStreakModel streak;
  final List<QuickStatModel> quickStats;
  final List<LearningActivityModel> todayActivities;
  final List<SubjectPerformanceModel> subjectPerformance;
  final List<TopicModel> strongTopics;
  final List<TopicModel> weakTopics;
  final AiRecommendationModel aiRecommendation;
  final List<ResultModel> recentResults;
  final List<LearningGoalModel> learningGoals;
  final List<AchievementModel> achievements;
  final List<UpcomingActivityModel> upcomingActivities;
  final TeacherFeedbackModel teacherFeedback;
  final List<DiscussionActivityModel> discussionActivity;
  final int messageCount;
  final int notificationCount;
  final bool offline;
  final DateTime lastSyncedAt;
}

/// Student identity and greeting header data.
class StudentSummaryModel {
  const StudentSummaryModel({
    required this.name,
    required this.schoolName,
    required this.grade,
    required this.section,
    required this.avatarInitials,
  });

  final String name;
  final String schoolName;
  final String grade;
  final String section;
  final String avatarInitials;
}

/// XP level and progress ring for the dashboard hero.
class StudentLevelModel {
  const StudentLevelModel({
    required this.currentLevel,
    required this.nextLevel,
    required this.totalPoints,
    required this.overallRank,
    required this.progressPercent,
    required this.pointsToNextLevel,
    required this.weeklyRankChange,
  });

  final String currentLevel;
  final String nextLevel;
  final int totalPoints;
  final int overallRank;
  final double progressPercent;
  final int pointsToNextLevel;
  final int weeklyRankChange;
}

/// Class or school ranking snapshot.
class RankingSummaryModel {
  const RankingSummaryModel({
    required this.classRank,
    required this.schoolRank,
    required this.subjectRank,
    required this.improvementRank,
    required this.weeklyMove,
  });

  final int classRank;
  final int schoolRank;
  final int subjectRank;
  final int improvementRank;
  final int weeklyMove;
}

/// Daily learning streak calendar data.
class LearningStreakModel {
  const LearningStreakModel({
    required this.currentDays,
    required this.longestDays,
    required this.completedWeekdays,
    required this.dailyTarget,
    required this.reward,
  });

  final int currentDays;
  final int longestDays;
  final List<bool> completedWeekdays;
  final String dailyTarget;
  final String reward;
}

/// Compact numeric stat shown in the quick strip.
class QuickStatModel {
  const QuickStatModel({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.tone,
  });

  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final DashboardTone tone;
}

/// Recent quiz, worksheet, or lesson activity row.
class LearningActivityModel {
  const LearningActivityModel({
    required this.id,
    required this.title,
    required this.subject,
    required this.topic,
    required this.activityType,
    required this.dueLabel,
    required this.progressPercent,
    required this.actionLabel,
    required this.tone,
    required this.icon,
  });

  final String id;
  final String title;
  final String subject;
  final String topic;
  final String activityType;
  final String dueLabel;
  final double progressPercent;
  final String actionLabel;
  final DashboardTone tone;
  final IconData icon;
}

/// Subject mastery percentage for performance cards.
class SubjectPerformanceModel {
  const SubjectPerformanceModel({
    required this.subject,
    required this.percent,
    required this.trendLabel,
    required this.status,
    required this.lastResult,
    required this.tone,
    required this.icon,
  });

  final String subject;
  final int percent;
  final String trendLabel;
  final String status;
  final String lastResult;
  final DashboardTone tone;
  final IconData icon;
}

/// Topic chip within a subject performance card.
class TopicModel {
  const TopicModel({
    required this.title,
    required this.masteryPercent,
    this.recommendation,
  });

  final String title;
  final int masteryPercent;
  final String? recommendation;
}

/// AI-generated study recommendation card payload.
class AiRecommendationModel {
  const AiRecommendationModel({
    required this.reason,
    required this.activityTitle,
    required this.estimatedTime,
    required this.expectedImprovement,
  });

  final String reason;
  final String activityTitle;
  final String estimatedTime;
  final String expectedImprovement;
}

/// Recent quiz or exam result summary.
class ResultModel {
  const ResultModel({
    required this.title,
    required this.subject,
    required this.topic,
    required this.scorePercent,
    required this.points,
    required this.date,
    required this.statusLabel,
  });

  final String title;
  final String subject;
  final String topic;
  final int scorePercent;
  final int points;
  final DateTime date;
  final String statusLabel;
}

/// Active learning goal with progress percentage.
class LearningGoalModel {
  const LearningGoalModel({
    required this.title,
    required this.progressLabel,
    required this.progressPercent,
    required this.assignedBy,
  });

  final String title;
  final String progressLabel;
  final double progressPercent;
  final String assignedBy;
}

/// Badge or milestone achievement entry.
class AchievementModel {
  const AchievementModel({
    required this.title,
    required this.description,
    required this.icon,
    required this.tone,
  });

  final String title;
  final String description;
  final IconData icon;
  final DashboardTone tone;
}

/// Scheduled quiz, class, or event on the upcoming list.
class UpcomingActivityModel {
  const UpcomingActivityModel({required this.day, required this.title});

  final String day;
  final String title;
}

/// Teacher comment surfaced on the student dashboard.
class TeacherFeedbackModel {
  const TeacherFeedbackModel({
    required this.teacherName,
    required this.subject,
    required this.dateLabel,
    required this.feedback,
  });

  final String teacherName;
  final String subject;
  final String dateLabel;
  final String feedback;
}

/// Recent discussion thread activity snippet.
class DiscussionActivityModel {
  const DiscussionActivityModel({
    required this.title,
    required this.description,
    required this.actionLabel,
  });

  final String title;
  final String description;
  final String actionLabel;
}

/// Semantic color tones used by dashboard cards.
enum DashboardTone { blue, green, amber, red, purple, gold }
