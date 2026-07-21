import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/feature_placeholder_page.dart';

/// AI-guided learning path placeholder screen.
class LearningPathPage extends StatelessWidget {
  const LearningPathPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeaturePlaceholderPage(
      title: 'Learning Path',
      description: 'AI-guided topic sequence, checkpoints, and progress.',
      icon: Icons.route_outlined,
    );
  }
}
