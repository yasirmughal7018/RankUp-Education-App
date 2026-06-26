import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/feature_placeholder_page.dart';

class RewardsPage extends StatelessWidget {
  const RewardsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeaturePlaceholderPage(
      title: 'Rewards',
      description: 'Badges, certificates, points, levels, and rank history.',
      icon: Icons.workspace_premium_outlined,
    );
  }
}
