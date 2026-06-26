import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/feature_placeholder_page.dart';

class PortfolioPage extends StatelessWidget {
  const PortfolioPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeaturePlaceholderPage(
      title: 'Portfolio',
      description: 'Achievements, certificates, projects, skills, and sharing.',
      icon: Icons.badge_outlined,
    );
  }
}
