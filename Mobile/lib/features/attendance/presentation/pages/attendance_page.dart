import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/feature_placeholder_page.dart';

class AttendancePage extends StatelessWidget {
  const AttendancePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeaturePlaceholderPage(
      title: 'Attendance',
      description: 'Teacher attendance marking and parent visibility.',
      icon: Icons.fact_check_outlined,
    );
  }
}
