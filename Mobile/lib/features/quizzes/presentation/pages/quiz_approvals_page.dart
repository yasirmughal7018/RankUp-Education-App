import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_manage_models.dart';
import 'package:rankup_education/features/quizzes/presentation/providers/quiz_providers.dart';

class QuizApprovalsPage extends ConsumerStatefulWidget {
  const QuizApprovalsPage({super.key});

  @override
  ConsumerState<QuizApprovalsPage> createState() => _QuizApprovalsPageState();
}

class _QuizApprovalsPageState extends ConsumerState<QuizApprovalsPage> {
  late Future<List<PendingQuizApprovalItem>> _pending;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _pending = ref
        .read(teacherQuizManageControllerProvider.notifier)
        .loadPendingQuizApprovals();
  }

  Future<void> _approve(String quizId) async {
    final ok = await ref
        .read(teacherQuizManageControllerProvider.notifier)
        .approveQuiz(quizId);
    if (ok && mounted) setState(_reload);
  }

  Future<void> _reject(String quizId) async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject quiz'),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Reason'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (reason == null) return;
    final ok = await ref
        .read(teacherQuizManageControllerProvider.notifier)
        .rejectQuiz(quizId, reason: reason);
    if (ok && mounted) setState(_reload);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quiz approvals')),
      body: FutureBuilder<List<PendingQuizApprovalItem>>(
        future: _pending,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text(snapshot.error.toString()));
          }
          final items = snapshot.data ?? const [];
          if (items.isEmpty) {
            return const Center(child: Text('No pending quiz approvals.'));
          }
          return RefreshIndicator(
            onRefresh: () async {
              setState(_reload);
              await _pending;
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                return Card(
                  child: ListTile(
                    title: Text(item.title),
                    subtitle: Text(
                      '${item.quizType} · ${item.createdBy}\n${item.approvalStatus}',
                    ),
                    isThreeLine: true,
                    trailing: Wrap(
                      children: [
                        IconButton(
                          tooltip: 'Approve',
                          onPressed: () => _approve(item.quizId),
                          icon: const Icon(Icons.check),
                        ),
                        IconButton(
                          tooltip: 'Reject',
                          onPressed: () => _reject(item.quizId),
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
