import 'package:flutter/material.dart';

class AiAssistantPage extends StatelessWidget {
  const AiAssistantPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('AI Assistant')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Expanded(
              child: ListView(
                children: const [
                  Card(
                    child: ListTile(
                      leading: Icon(Icons.auto_awesome),
                      title: Text('AI learning recommendation'),
                      subtitle: Text(
                        'Practice fractions for 15 minutes, then try a short quiz.',
                      ),
                    ),
                  ),
                ],
              ),
            ),
            TextField(
              decoration: InputDecoration(
                hintText: 'Ask for an explanation, quiz, or worksheet',
                suffixIcon: IconButton(
                  tooltip: 'Send',
                  onPressed: () {},
                  icon: const Icon(Icons.send),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
