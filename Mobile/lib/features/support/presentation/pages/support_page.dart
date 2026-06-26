import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/feature_placeholder_page.dart';

class SupportPage extends StatelessWidget {
  const SupportPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeaturePlaceholderPage(
      title: 'Support',
      description: 'Help, complaints, abuse reports, and safety escalation.',
      icon: Icons.support_agent_outlined,
    );
  }
}
