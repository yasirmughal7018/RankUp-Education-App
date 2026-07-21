import 'package:flutter/material.dart';
import 'package:rankup_education/core/widgets/feature_placeholder_page.dart';

/// Content sharing placeholder screen.
class SharingPage extends StatelessWidget {
  const SharingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeaturePlaceholderPage(
      title: 'Sharing',
      description: 'Secure links, QR codes, PDFs, and native sharing.',
      icon: Icons.ios_share_outlined,
    );
  }
}
