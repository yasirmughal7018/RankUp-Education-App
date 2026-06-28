import 'package:flutter/material.dart';
import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';

class DashboardSectionHeader extends StatelessWidget {
  const DashboardSectionHeader({
    required this.title,
    this.actionLabel,
    this.onAction,
    super.key,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        if (actionLabel != null)
          TextButton(onPressed: onAction, child: Text(actionLabel!)),
      ],
    );
  }
}

class StudentHeaderCard extends StatelessWidget {
  const StudentHeaderCard({
    required this.dashboard,
    required this.greeting,
    super.key,
  });

  final StudentDashboardModel dashboard;
  final String greeting;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return _DashboardCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: theme.colorScheme.primaryContainer,
            child: Text(
              dashboard.student.avatarInitials,
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$greeting, ${dashboard.student.name}',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${dashboard.student.grade} - ${dashboard.student.section}',
                  style: theme.textTheme.bodyMedium,
                ),
                Text(
                  dashboard.student.schoolName,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 10),
                _StatusPill(
                  icon: Icons.local_fire_department_outlined,
                  label: '${dashboard.streak.currentDays} Day Learning Streak',
                  tone: DashboardTone.amber,
                ),
              ],
            ),
          ),
          _IconCounter(
            icon: Icons.notifications_outlined,
            count: dashboard.notificationCount,
          ),
          const SizedBox(width: 6),
          _IconCounter(
            icon: Icons.chat_bubble_outline,
            count: dashboard.messageCount,
          ),
        ],
      ),
    );
  }
}

class LevelRankCard extends StatelessWidget {
  const LevelRankCard({required this.level, super.key});

  final StudentLevelModel level;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percent = (level.progressPercent * 100).round();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _toneColor(context, DashboardTone.gold).withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color:
              _toneColor(context, DashboardTone.gold).withValues(alpha: 0.28),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const _ToneIcon(
                icon: Icons.emoji_events_outlined,
                tone: DashboardTone.gold,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Current Level: ${level.currentLevel}',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      '+${level.weeklyRankChange} positions this week',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: _toneColor(context, DashboardTone.green),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: 58,
                width: 58,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: level.progressPercent,
                      strokeWidth: 7,
                      backgroundColor:
                          theme.colorScheme.surfaceContainerHighest,
                    ),
                    Text(
                      '$percent%',
                      style: theme.textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _MetricBlock(
                  label: 'Total Points',
                  value: _formatNumber(level.totalPoints),
                ),
              ),
              Expanded(
                child: _MetricBlock(
                  label: 'Overall Rank',
                  value: '#${level.overallRank}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            '${level.pointsToNextLevel} points required for ${level.nextLevel}',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(value: level.progressPercent),
        ],
      ),
    );
  }
}

class QuickStatStrip extends StatelessWidget {
  const QuickStatStrip({required this.stats, super.key});

  final List<QuickStatModel> stats;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 128,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: stats.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final stat = stats[index];
          return SizedBox(
            width: 162,
            child: _DashboardCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _ToneIcon(
                        icon: stat.icon,
                        tone: stat.tone,
                        compact: true,
                      ),
                      const Spacer(),
                      Text(
                        stat.value,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    stat.title,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  Text(
                    stat.subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class LearningActivityCard extends StatelessWidget {
  const LearningActivityCard({
    required this.activity,
    required this.onPressed,
    super.key,
  });

  final LearningActivityModel activity;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return _DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _ToneIcon(icon: activity.icon, tone: activity.tone),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      activity.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text('${activity.subject} - ${activity.topic}'),
                  ],
                ),
              ),
              _StatusPill(label: activity.dueLabel, tone: activity.tone),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: LinearProgressIndicator(
                  value: activity.progressPercent == 0
                      ? null
                      : activity.progressPercent,
                ),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: onPressed,
                child: Text(activity.actionLabel),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class AiRecommendationCard extends StatelessWidget {
  const AiRecommendationCard({
    required this.recommendation,
    required this.onStart,
    super.key,
  });

  final AiRecommendationModel recommendation;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _toneColor(context, DashboardTone.purple);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const _ToneIcon(
                icon: Icons.auto_awesome_outlined,
                tone: DashboardTone.purple,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'AI Learning Recommendation',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const _StatusPill(
                label: 'AI Generated',
                tone: DashboardTone.purple,
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(recommendation.reason),
          const SizedBox(height: 10),
          Text(
            recommendation.activityTitle,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _StatusPill(
                icon: Icons.schedule_outlined,
                label: recommendation.estimatedTime,
                tone: DashboardTone.blue,
              ),
              _StatusPill(
                icon: Icons.trending_up_outlined,
                label: recommendation.expectedImprovement,
                tone: DashboardTone.green,
              ),
            ],
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: onStart,
            icon: const Icon(Icons.play_arrow),
            label: const Text('Start Recommended Activity'),
          ),
        ],
      ),
    );
  }
}

class SubjectPerformanceCard extends StatelessWidget {
  const SubjectPerformanceCard({
    required this.subject,
    required this.onTap,
    super.key,
  });

  final SubjectPerformanceModel subject;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return _DashboardCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _ToneIcon(icon: subject.icon, tone: subject.tone, compact: true),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  subject.subject,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                '${subject.percent}%',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          LinearProgressIndicator(value: subject.percent / 100),
          const SizedBox(height: 10),
          _StatusPill(label: subject.status, tone: subject.tone),
          const SizedBox(height: 8),
          Text(subject.trendLabel, style: theme.textTheme.bodySmall),
          Text(
            subject.lastResult,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class TopicCard extends StatelessWidget {
  const TopicCard({required this.topic, required this.weak, super.key});

  final TopicModel topic;
  final bool weak;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tone = weak ? DashboardTone.amber : DashboardTone.green;

    return _DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _ToneIcon(
                icon: weak
                    ? Icons.psychology_alt_outlined
                    : Icons.check_circle_outline,
                tone: tone,
                compact: true,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  topic.title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text('${topic.masteryPercent}%'),
            ],
          ),
          const SizedBox(height: 10),
          LinearProgressIndicator(value: topic.masteryPercent / 100),
          if (topic.recommendation != null) ...[
            const SizedBox(height: 10),
            Text('Recommended: ${topic.recommendation}'),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () {},
              child: const Text('Practice Now'),
            ),
          ],
        ],
      ),
    );
  }
}

class RankingCard extends StatelessWidget {
  const RankingCard({required this.rankings, super.key});

  final RankingSummaryModel rankings;

  @override
  Widget build(BuildContext context) {
    return _DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _RankRow(label: 'Class Rank', value: '#${rankings.classRank}'),
          _RankRow(label: 'School Rank', value: '#${rankings.schoolRank}'),
          _RankRow(label: 'Math Rank', value: '#${rankings.subjectRank}'),
          _RankRow(
            label: 'Improvement Rank',
            value: '#${rankings.improvementRank}',
          ),
          const SizedBox(height: 10),
          _StatusPill(
            icon: Icons.trending_up_outlined,
            label: 'Moved up ${rankings.weeklyMove} positions this week',
            tone: DashboardTone.green,
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () {},
            child: const Text('View Full Leaderboard'),
          ),
        ],
      ),
    );
  }
}

class StreakCalendarCard extends StatelessWidget {
  const StreakCalendarCard({required this.streak, super.key});

  final LearningStreakModel streak;

  @override
  Widget build(BuildContext context) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return _DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(days.length, (index) {
              final complete = streak.completedWeekdays[index];
              return Column(
                children: [
                  Text(
                    days[index],
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                  const SizedBox(height: 6),
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: complete
                        ? _toneColor(context, DashboardTone.green)
                        : Theme.of(context).colorScheme.surfaceContainerHighest,
                    child: Icon(
                      complete ? Icons.check : Icons.circle_outlined,
                      size: 14,
                      color: complete
                          ? Colors.white
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              );
            }),
          ),
          const SizedBox(height: 14),
          Text('Current Streak: ${streak.currentDays} Days'),
          Text('Longest Streak: ${streak.longestDays} Days'),
          const SizedBox(height: 8),
          Text(streak.dailyTarget),
        ],
      ),
    );
  }
}

class ResultCard extends StatelessWidget {
  const ResultCard({required this.result, super.key});

  final ResultModel result;

  @override
  Widget build(BuildContext context) {
    return _DashboardCard(
      child: Row(
        children: [
          _ToneIcon(
            icon: Icons.fact_check_outlined,
            tone: result.scorePercent >= 75
                ? DashboardTone.green
                : DashboardTone.amber,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  result.title,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Text('${result.topic} - Score: ${result.scorePercent}%'),
                Text('+${result.points} points - ${result.statusLabel}'),
              ],
            ),
          ),
          TextButton(onPressed: () {}, child: const Text('Review')),
        ],
      ),
    );
  }
}

class GoalProgressCard extends StatelessWidget {
  const GoalProgressCard({required this.goal, super.key});

  final LearningGoalModel goal;

  @override
  Widget build(BuildContext context) {
    return _DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            goal.title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 4),
          Text(goal.progressLabel),
          const SizedBox(height: 10),
          LinearProgressIndicator(value: goal.progressPercent),
          const SizedBox(height: 8),
          Text(
            goal.assignedBy,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class AchievementCard extends StatelessWidget {
  const AchievementCard({required this.achievement, super.key});

  final AchievementModel achievement;

  @override
  Widget build(BuildContext context) {
    return _DashboardCard(
      child: Row(
        children: [
          _ToneIcon(icon: achievement.icon, tone: achievement.tone),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  achievement.title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                Text(achievement.description),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class TeacherFeedbackCard extends StatelessWidget {
  const TeacherFeedbackCard({required this.feedback, super.key});

  final TeacherFeedbackModel feedback;

  @override
  Widget build(BuildContext context) {
    return _DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('"${feedback.feedback}"'),
          const SizedBox(height: 12),
          Text(
            '- ${feedback.teacherName}',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          Text('${feedback.subject} - ${feedback.dateLabel}'),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () {},
            child: const Text('View All Feedback'),
          ),
        ],
      ),
    );
  }
}

class UpcomingListCard extends StatelessWidget {
  const UpcomingListCard({required this.items, super.key});

  final List<UpcomingActivityModel> items;

  @override
  Widget build(BuildContext context) {
    return _DashboardCard(
      child: Column(
        children: [
          for (final item in items)
            ListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              leading: const Icon(Icons.event_outlined),
              title: Text(item.day),
              subtitle: Text(item.title),
            ),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: OutlinedButton(
              onPressed: () {},
              child: const Text('View Calendar'),
            ),
          ),
        ],
      ),
    );
  }
}

class DiscussionActivityCard extends StatelessWidget {
  const DiscussionActivityCard({required this.items, super.key});

  final List<DiscussionActivityModel> items;

  @override
  Widget build(BuildContext context) {
    return _DashboardCard(
      child: Column(
        children: [
          for (final item in items)
            ListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              leading: const Icon(Icons.forum_outlined),
              title: Text(item.title),
              subtitle: Text(item.description),
              trailing: TextButton(
                onPressed: () {},
                child: Text(item.actionLabel),
              ),
            ),
        ],
      ),
    );
  }
}

class OfflineIndicator extends StatelessWidget {
  const OfflineIndicator({required this.dashboard, super.key});

  final StudentDashboardModel dashboard;

  @override
  Widget build(BuildContext context) {
    if (!dashboard.offline) {
      return const SizedBox.shrink();
    }

    return _DashboardCard(
      child: Row(
        children: [
          const Icon(Icons.cloud_off_outlined),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'You are offline. Showing data last updated at '
              '${TimeOfDay.fromDateTime(dashboard.lastSyncedAt).format(context)}.',
            ),
          ),
        ],
      ),
    );
  }
}

class DashboardErrorState extends StatelessWidget {
  const DashboardErrorState({
    required this.message,
    required this.onRetry,
    super.key,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: _DashboardCard(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.error_outline,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DashboardSkeleton extends StatelessWidget {
  const DashboardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: 8,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        return _DashboardCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _SkeletonBox(width: 180, height: 18),
              const SizedBox(height: 12),
              _SkeletonBox(
                width: double.infinity,
                height: index == 0 ? 88 : 48,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SkeletonBox extends StatelessWidget {
  const _SkeletonBox({required this.width, required this.height});

  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
    );
  }
}

class _DashboardCard extends StatelessWidget {
  const _DashboardCard({required this.child, this.onTap});

  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: const EdgeInsets.all(14), child: child),
      ),
    );
  }
}

class _ToneIcon extends StatelessWidget {
  const _ToneIcon({
    required this.icon,
    required this.tone,
    this.compact = false,
  });

  final IconData icon;
  final DashboardTone tone;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final color = _toneColor(context, tone);
    final size = compact ? 34.0 : 42.0;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color, size: compact ? 18 : 22),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.tone, this.icon});

  final String label;
  final DashboardTone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final color = _toneColor(context, tone);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

class _IconCounter extends StatelessWidget {
  const _IconCounter({required this.icon, required this.count});

  final IconData icon;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(onPressed: () {}, icon: Icon(icon)),
        if (count > 0)
          PositionedDirectional(
            end: 2,
            top: 4,
            child: CircleAvatar(
              radius: 9,
              backgroundColor: Theme.of(context).colorScheme.error,
              child: Text(
                count.toString(),
                style: const TextStyle(color: Colors.white, fontSize: 10),
              ),
            ),
          ),
      ],
    );
  }
}

class _MetricBlock extends StatelessWidget {
  const _MetricBlock({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.bodySmall),
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w900,
              ),
        ),
      ],
    );
  }
}

class _RankRow extends StatelessWidget {
  const _RankRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
        ],
      ),
    );
  }
}

Color _toneColor(BuildContext context, DashboardTone tone) {
  final scheme = Theme.of(context).colorScheme;

  return switch (tone) {
    DashboardTone.blue => scheme.primary,
    DashboardTone.green => const Color(0xFF16A34A),
    DashboardTone.amber => const Color(0xFFD97706),
    DashboardTone.red => scheme.error,
    DashboardTone.purple => const Color(0xFF7C3AED),
    DashboardTone.gold => const Color(0xFFB45309),
  };
}

String _formatNumber(int value) {
  final text = value.toString();
  final buffer = StringBuffer();

  for (var i = 0; i < text.length; i++) {
    final positionFromEnd = text.length - i;
    buffer.write(text[i]);
    if (positionFromEnd > 1 && positionFromEnd % 3 == 1) {
      buffer.write(',');
    }
  }

  return buffer.toString();
}
