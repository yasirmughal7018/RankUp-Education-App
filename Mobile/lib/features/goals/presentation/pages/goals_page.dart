import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/feature_placeholder_page.dart';

/// Learning goals placeholder screen.
class GoalsPage extends StatelessWidget {
  const GoalsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeaturePlaceholderPage(
      title: 'Goals',
      description: 'Daily, weekly, subject, topic, and exam preparation goals.',
      icon: Icons.flag_outlined,
    );
  }
}
