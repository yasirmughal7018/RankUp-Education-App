import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/feature_placeholder_page.dart';

class CompetitionsPage extends StatelessWidget {
  const CompetitionsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeaturePlaceholderPage(
      title: 'Competitions',
      description: 'Live contests, registrations, rankings, and certificates.',
      icon: Icons.emoji_events_outlined,
    );
  }
}
