import 'package:flutter/material.dart';

class RankingsPage extends StatelessWidget {
  const RankingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final ranks = ['Ayan Khan', 'Sara Ali', 'Hamza Noor'];

    return Scaffold(
      appBar: AppBar(title: const Text('Rankings')),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: ranks.length,
        itemBuilder: (context, index) {
          return Card(
            child: ListTile(
              leading: CircleAvatar(child: Text('#${index + 1}')),
              title: Text(ranks[index]),
              subtitle: const Text('Gold level • Math strength'),
              trailing: const Icon(Icons.workspace_premium_outlined),
            ),
          );
        },
      ),
    );
  }
}
