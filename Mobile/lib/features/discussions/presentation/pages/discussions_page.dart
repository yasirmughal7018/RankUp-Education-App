import 'package:flutter/material.dart';

class DiscussionsPage extends StatelessWidget {
  const DiscussionsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Discussions')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Card(
            child: ListTile(
              leading: Icon(Icons.forum_outlined),
              title: Text('How do we solve word problems faster?'),
              subtitle: Text('AI highlighted 2 helpful answers'),
              trailing: Icon(Icons.chevron_right),
            ),
          ),
          SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: Icon(Icons.forum_outlined),
              title: Text('What makes a strong essay introduction?'),
              subtitle: Text('Class discussion • 18 replies'),
              trailing: Icon(Icons.chevron_right),
            ),
          ),
        ],
      ),
    );
  }
}
