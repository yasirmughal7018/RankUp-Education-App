import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/feature_placeholder_page.dart';

class SearchPage extends StatelessWidget {
  const SearchPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeaturePlaceholderPage(
      title: 'Search',
      description: 'Find quizzes, worksheets, discussions, topics, and people.',
      icon: Icons.search,
    );
  }
}
