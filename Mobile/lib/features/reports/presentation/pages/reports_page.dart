import 'package:flutter/material.dart';

class ReportsPage extends StatelessWidget {
  const ReportsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Card(
            child: ListTile(
              leading: Icon(Icons.assessment_outlined),
              title: Text('Monthly progress report'),
              subtitle: Text('Performance, rank history, and weak topics'),
            ),
          ),
          SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: Icon(Icons.ios_share_outlined),
              title: Text('Share secure report'),
              subtitle: Text('Generate a private link or QR code'),
            ),
          ),
        ],
      ),
    );
  }
}
