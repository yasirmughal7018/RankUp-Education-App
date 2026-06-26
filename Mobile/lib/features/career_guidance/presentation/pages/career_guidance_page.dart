import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/feature_placeholder_page.dart';

class CareerGuidancePage extends StatelessWidget {
  const CareerGuidancePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeaturePlaceholderPage(
      title: 'Career Guidance',
      description: 'Interest checks, skill checks, and advisory career paths.',
      icon: Icons.explore_outlined,
    );
  }
}
