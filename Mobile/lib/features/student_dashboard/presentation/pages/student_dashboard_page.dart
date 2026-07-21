import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';
import 'package:rankup_education/features/student_dashboard/presentation/providers/student_dashboard_provider.dart';
import 'package:rankup_education/features/student_dashboard/presentation/widgets/student_dashboard_widgets.dart';

/// Student home dashboard with learning stats and quick actions.
class StudentDashboardPage extends ConsumerStatefulWidget {
  const StudentDashboardPage({super.key});

  @override
  ConsumerState<StudentDashboardPage> createState() {
    return _StudentDashboardPageState();
  }
}

class _StudentDashboardPageState extends ConsumerState<StudentDashboardPage> {
  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() {
      return ref.read(studentDashboardControllerProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(studentDashboardControllerProvider);
    final dashboard = state.dashboard;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            tooltip: 'Messages',
            onPressed: () => context.go('/messages'),
            icon: const Icon(Icons.chat_bubble_outline),
          ),
          IconButton(
            tooltip: 'Settings',
            onPressed: () => context.go('/settings'),
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
      body: switch ((state.isLoading, dashboard, state.errorMessage)) {
        (true, _, _) => const DashboardSkeleton(),
        (_, null, final error?) => DashboardErrorState(
            message: error,
            onRetry: () {
              ref.read(studentDashboardControllerProvider.notifier).load();
            },
          ),
        (_, final dashboard?, _) => RefreshIndicator(
            onRefresh: () {
              return ref
                  .read(studentDashboardControllerProvider.notifier)
                  .refresh();
            },
            child: _StudentDashboardContent(dashboard: dashboard),
          ),
        _ => const DashboardSkeleton(),
      },
    );
  }
}

class _StudentDashboardContent extends StatelessWidget {
  const _StudentDashboardContent({required this.dashboard});

  final StudentDashboardModel dashboard;

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 700;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        OfflineIndicator(dashboard: dashboard),
        StudentHeaderCard(
          dashboard: dashboard,
          greeting: _greetingFor(DateTime.now()),
        ),
        const SizedBox(height: 14),
        LevelRankCard(level: dashboard.level),
        const SizedBox(height: 18),
        _StudentDashboardTiles(dashboard: dashboard),
        const SizedBox(height: 18),
        DashboardSectionHeader(
          title: 'Quick Statistics',
          actionLabel: 'View all',
          onAction: () {},
        ),
        QuickStatStrip(stats: dashboard.quickStats),
        const SizedBox(height: 18),
        const DashboardSectionHeader(title: "Today's Learning Plan"),
        if (dashboard.todayActivities.isEmpty)
          const _InlineEmptyState(
            icon: Icons.task_alt_outlined,
            title: 'You have no pending activities.',
            message: 'Great job. Explore a practice quiz when ready.',
          )
        else
          for (final activity in dashboard.todayActivities) ...[
            LearningActivityCard(
              activity: activity,
              onPressed: () => _openActivity(context, activity),
            ),
            const SizedBox(height: 12),
          ],
        DashboardSectionHeader(
          title: 'AI Recommendation',
          actionLabel: 'AI Assistant',
          onAction: () => context.go('/ai-assistant'),
        ),
        AiRecommendationCard(
          recommendation: dashboard.aiRecommendation,
          onStart: () => context.go('/worksheets'),
        ),
        const SizedBox(height: 18),
        const DashboardSectionHeader(title: 'Subject Performance'),
        _ResponsiveGrid(
          wide: wide,
          children: [
            for (final subject in dashboard.subjectPerformance)
              SubjectPerformanceCard(
                subject: subject,
                onTap: () => context.go('/reports'),
              ),
          ],
        ),
        const SizedBox(height: 18),
        const DashboardSectionHeader(title: 'Strong Topics'),
        _ResponsiveGrid(
          wide: wide,
          compact: true,
          children: [
            for (final topic in dashboard.strongTopics)
              TopicCard(topic: topic, weak: false),
          ],
        ),
        const SizedBox(height: 18),
        const DashboardSectionHeader(title: 'Topics Needing Improvement'),
        if (dashboard.weakTopics.isEmpty)
          const _InlineEmptyState(
            icon: Icons.check_circle_outline,
            title: 'No major weak topics detected.',
            message: 'Keep completing activities to maintain your progress.',
          )
        else
          _ResponsiveGrid(
            wide: wide,
            children: [
              for (final topic in dashboard.weakTopics)
                TopicCard(topic: topic, weak: true),
            ],
          ),
        const SizedBox(height: 18),
        _TwoColumnSection(
          wide: wide,
          leftTitle: 'Your Rankings',
          left: RankingCard(rankings: dashboard.rankings),
          rightTitle: 'Learning Streak',
          right: StreakCalendarCard(streak: dashboard.streak),
        ),
        const SizedBox(height: 18),
        const DashboardSectionHeader(title: 'Recent Results'),
        for (final result in dashboard.recentResults) ...[
          ResultCard(result: result),
          const SizedBox(height: 12),
        ],
        const DashboardSectionHeader(title: 'Learning Goals'),
        _ResponsiveGrid(
          wide: wide,
          children: [
            for (final goal in dashboard.learningGoals)
              GoalProgressCard(goal: goal),
          ],
        ),
        const SizedBox(height: 18),
        DashboardSectionHeader(
          title: 'Recent Achievements',
          actionLabel: 'View all',
          onAction: () => context.go('/rankings'),
        ),
        for (final achievement in dashboard.achievements) ...[
          AchievementCard(achievement: achievement),
          const SizedBox(height: 12),
        ],
        _TwoColumnSection(
          wide: wide,
          leftTitle: 'Upcoming',
          left: UpcomingListCard(items: dashboard.upcomingActivities),
          rightTitle: 'Teacher Feedback',
          right: TeacherFeedbackCard(feedback: dashboard.teacherFeedback),
        ),
        const SizedBox(height: 18),
        const DashboardSectionHeader(title: 'Discussion Activity'),
        DiscussionActivityCard(items: dashboard.discussionActivity),
      ],
    );
  }

  String _greetingFor(DateTime now) {
    if (now.hour < 12) {
      return 'Good Morning';
    }

    if (now.hour < 17) {
      return 'Good Afternoon';
    }

    return 'Good Evening';
  }

  void _openActivity(BuildContext context, LearningActivityModel activity) {
    if (activity.activityType.toLowerCase().contains('worksheet')) {
      context.go('/worksheets');
      return;
    }

    context.go('/quizzes');
  }
}

class _ResponsiveGrid extends StatelessWidget {
  const _ResponsiveGrid({
    required this.children,
    required this.wide,
    this.compact = false,
  });

  final List<Widget> children;
  final bool wide;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final columns = wide ? 2 : 1;

    return GridView.count(
      crossAxisCount: columns,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: wide ? (compact ? 3.1 : 2.0) : (compact ? 3.6 : 2.55),
      children: children,
    );
  }
}

class _StudentDashboardTiles extends StatelessWidget {
  const _StudentDashboardTiles({required this.dashboard});

  final StudentDashboardModel dashboard;

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 700;
    final nextUpcoming = dashboard.upcomingActivities.isEmpty
        ? null
        : dashboard.upcomingActivities.first;

    final children = [
      _DashboardActionTile(
        icon: Icons.quiz_outlined,
        title: 'Quizzes',
        subtitle: 'Assigned, upcoming and practice quizzes',
        meta: 'Start or continue',
        onTap: () => context.go('/quizzes'),
      ),
      _DashboardActionTile(
        icon: Icons.event_outlined,
        title: 'Upcoming',
        subtitle: nextUpcoming == null
            ? 'No upcoming activities'
            : '${nextUpcoming.day}: ${nextUpcoming.title}',
        meta: 'View schedule',
        onTap: () => context.go('/quizzes'),
      ),
    ];

    if (wide) {
      return Row(
        children: [
          Expanded(child: children.first),
          const SizedBox(width: 12),
          Expanded(child: children.last),
        ],
      );
    }

    return Column(
      children: [
        children.first,
        const SizedBox(height: 12),
        children.last,
      ],
    );
  }
}

class _DashboardActionTile extends StatelessWidget {
  const _DashboardActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.meta,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String meta;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: theme.colorScheme.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      subtitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      meta,
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}

class _TwoColumnSection extends StatelessWidget {
  const _TwoColumnSection({
    required this.wide,
    required this.leftTitle,
    required this.left,
    required this.rightTitle,
    required this.right,
  });

  final bool wide;
  final String leftTitle;
  final Widget left;
  final String rightTitle;
  final Widget right;

  @override
  Widget build(BuildContext context) {
    final sections = [
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DashboardSectionHeader(title: leftTitle),
          left,
        ],
      ),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DashboardSectionHeader(title: rightTitle),
          right,
        ],
      ),
    ];

    if (!wide) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          sections.first,
          const SizedBox(height: 18),
          sections.last,
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: sections.first),
        const SizedBox(width: 12),
        Expanded(child: sections.last),
      ],
    );
  }
}

class _InlineEmptyState extends StatelessWidget {
  const _InlineEmptyState({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: theme.colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(message),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
