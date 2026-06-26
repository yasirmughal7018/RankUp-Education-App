import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/feature_placeholder_page.dart';

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeaturePlaceholderPage(
      title: 'Notifications',
      description: 'Push, local, and in-app alerts with deep links.',
      icon: Icons.notifications_outlined,
    );
  }
}
