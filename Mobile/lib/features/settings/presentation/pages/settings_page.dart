import 'package:flutter/material.dart';

/// App preferences and notification toggles.
class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          SwitchListTile(
            value: true,
            onChanged: null,
            title: Text('Push notifications'),
            subtitle: Text('Quiz, worksheet, rank, and message alerts'),
          ),
          ListTile(
            leading: Icon(Icons.language),
            title: Text('Language'),
            subtitle: Text('English and Urdu foundation'),
          ),
          ListTile(
            leading: Icon(Icons.privacy_tip_outlined),
            title: Text('Privacy controls'),
            subtitle: Text('Profile visibility and safe sharing'),
          ),
        ],
      ),
    );
  }
}
