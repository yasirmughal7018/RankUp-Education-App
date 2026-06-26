import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/stat_card.dart';

class TeacherDashboardPage extends StatelessWidget {
  const TeacherDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Teacher Dashboard')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const StatCard(
            title: 'Class 7-A',
            value: '34',
            subtitle: 'students active today',
            icon: Icons.groups_outlined,
          ),
          const SizedBox(height: 12),
          const StatCard(
            title: 'Pending Reviews',
            value: '18',
            subtitle: 'worksheets and descriptive answers',
            icon: Icons.rate_review_outlined,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () => context.go('/quizzes'),
            icon: const Icon(Icons.add_task),
            label: const Text('Create Quiz'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => context.go('/worksheets'),
            icon: const Icon(Icons.description_outlined),
            label: const Text('Assign Worksheet'),
          ),
        ],
      ),
    );
  }
}
