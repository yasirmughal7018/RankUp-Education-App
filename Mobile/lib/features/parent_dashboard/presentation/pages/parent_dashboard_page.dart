import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/stat_card.dart';

/// Parent home with child progress summaries and navigation tiles.
class ParentDashboardPage extends StatelessWidget {
  const ParentDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Parent Dashboard')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Child Overview',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 12),
          const StatCard(
            title: 'Ayan Khan',
            value: '87%',
            subtitle: 'Overall progress this month',
            icon: Icons.person_outline,
          ),
          const SizedBox(height: 12),
          const StatCard(
            title: 'Weak Topic Alert',
            value: '3',
            subtitle: 'Fractions, grammar, force',
            icon: Icons.warning_amber_outlined,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () => context.go('/reports'),
            icon: const Icon(Icons.assessment_outlined),
            label: const Text('View Child Report'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => context.go('/messages'),
            icon: const Icon(Icons.chat_bubble_outline),
            label: const Text('Message Teacher'),
          ),
        ],
      ),
    );
  }
}
