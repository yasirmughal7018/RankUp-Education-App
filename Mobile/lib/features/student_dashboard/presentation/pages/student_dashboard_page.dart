import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/stat_card.dart';

class StudentDashboardPage extends StatelessWidget {
  const StudentDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Settings',
            onPressed: () => context.go('/settings'),
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _HeroPanel(
            title: 'Keep climbing, Ayan',
            subtitle: 'Your AI plan recommends fractions practice today.',
            actionLabel: 'Start Quiz',
            onPressed: () => context.go('/quizzes'),
          ),
          const SizedBox(height: 16),
          const _ResponsiveStats(
            children: [
              StatCard(
                title: 'Current Level',
                value: 'Gold',
                subtitle: '320 points to Diamond',
                icon: Icons.workspace_premium_outlined,
              ),
              StatCard(
                title: 'Class Rank',
                value: '#3',
                subtitle: '+2 this week',
                icon: Icons.leaderboard_outlined,
              ),
              StatCard(
                title: 'Learning Streak',
                value: '12',
                subtitle: 'days active',
                icon: Icons.local_fire_department_outlined,
              ),
            ],
          ),
          const SizedBox(height: 16),
          _ActivityTile(
            title: 'Pending worksheet',
            subtitle: 'Science: Human body systems',
            icon: Icons.description_outlined,
            onTap: () => context.go('/worksheets'),
          ),
          _ActivityTile(
            title: 'Discussion to review',
            subtitle: 'Best method for solving word problems',
            icon: Icons.forum_outlined,
            onTap: () => context.go('/discussions'),
          ),
        ],
      ),
    );
  }
}

class _HeroPanel extends StatelessWidget {
  const _HeroPanel({
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.onPressed,
  });

  final String title;
  final String subtitle;
  final String actionLabel;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: theme.textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(subtitle),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onPressed,
            icon: const Icon(Icons.play_arrow),
            label: Text(actionLabel),
          ),
        ],
      ),
    );
  }
}

class _ResponsiveStats extends StatelessWidget {
  const _ResponsiveStats({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 720 ? 3 : 1;
        return GridView.count(
          crossAxisCount: columns,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: columns == 1 ? 2.8 : 1.45,
          children: children,
        );
      },
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
