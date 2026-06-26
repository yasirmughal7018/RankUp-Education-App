import 'package:flutter/material.dart';
import 'package:rankup_education/features/worksheets/data/models/worksheet_summary.dart';

class WorksheetsPage extends StatelessWidget {
  const WorksheetsPage({super.key});

  static const _worksheets = [
    WorksheetSummary(
      id: 'worksheet-1',
      title: 'Human Body Systems',
      subject: 'Science',
      status: 'Assigned',
    ),
    WorksheetSummary(
      id: 'worksheet-2',
      title: 'Essay Planning',
      subject: 'English',
      status: 'Under Review',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Worksheets')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemBuilder: (context, index) {
          final worksheet = _worksheets[index];
          return Card(
            child: ListTile(
              leading: const Icon(Icons.description_outlined),
              title: Text(worksheet.title),
              subtitle: Text(worksheet.subject),
              trailing: Chip(label: Text(worksheet.status)),
            ),
          );
        },
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemCount: _worksheets.length,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        icon: const Icon(Icons.upload_file),
        label: const Text('Submit'),
      ),
    );
  }
}
