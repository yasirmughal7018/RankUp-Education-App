import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';
import 'package:rankup_education/features/questions/data/models/question_summary_model.dart';
import 'package:rankup_education/features/questions/presentation/providers/question_providers.dart';

const _questionTypes = [
  'Single Choice',
  'Multiple Choice',
  'True/False',
  'Fill in the Blanks',
  'Descriptive',
  'Matching',
  'Ordering',
];

class QuestionsPage extends ConsumerStatefulWidget {
  const QuestionsPage({super.key});

  @override
  ConsumerState<QuestionsPage> createState() => _QuestionsPageState();
}

class _QuestionsPageState extends ConsumerState<QuestionsPage> {
  bool _busy = false;

  Future<void> _refresh() async {
    ref
      ..invalidate(questionsListProvider)
      ..invalidate(pendingQuestionApprovalsProvider);
  }

  Future<void> _mutate(
    Future<QuestionSummaryModel> Function() action, {
    String success = 'Question updated.',
  }) async {
    setState(() => _busy = true);
    try {
      await action();
      await _refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(success)),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _createQuestion() async {
    final body = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => const _CreateQuestionDialog(),
    );
    if (body == null) return;
    await _mutate(
      () => ref.read(questionRemoteDataSourceProvider).createQuestion(body),
      success: 'Question created.',
    );
  }

  Future<String?> _askReason() async {
    final controller = TextEditingController();
    String? error;
    final result = await showDialog<String>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Reject question'),
          content: TextField(
            controller: controller,
            minLines: 2,
            maxLines: 4,
            decoration: InputDecoration(
              labelText: 'Reason',
              errorText: error,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                final value = controller.text.trim();
                if (value.length < 10) {
                  setDialogState(
                    () => error = 'Enter at least 10 characters.',
                  );
                  return;
                }
                Navigator.pop(dialogContext, value);
              },
              child: const Text('Reject'),
            ),
          ],
        ),
      ),
    );
    controller.dispose();
    return result;
  }

  Future<void> _import() async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    final file = result?.files.single;
    if (file == null) return;
    final bytes = file.bytes;
    if (bytes == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not read the selected file.')),
        );
      }
      return;
    }
    setState(() => _busy = true);
    try {
      final imported =
          await ref.read(questionRemoteDataSourceProvider).importQuestions(
                fileBytes: bytes,
                fileName: file.name,
              );
      await _refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Imported ${imported.created} questions'
              '${imported.errors.isEmpty ? '.' : ' with ${imported.errors.length} errors.'}',
            ),
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _openPending() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _PendingApprovalsSheet(
        onApprove: (id) => _mutate(
          () => ref.read(questionRemoteDataSourceProvider).approveQuestion(id),
          success: 'Question approved.',
        ),
        onReject: (id) async {
          final reason = await _askReason();
          if (reason != null) {
            await _mutate(
              () => ref
                  .read(questionRemoteDataSourceProvider)
                  .rejectQuestion(id, reason: reason),
              success: 'Question rejected.',
            );
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    final role = user?.role;
    if (user == null || role == null || !canManageQuestions(role)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Question Bank')),
        body: Center(
          child: FilledButton(
            onPressed: () => context.go(user == null ? '/login' : '/'),
            child: const Text('Access restricted'),
          ),
        ),
      );
    }
    final questions = ref.watch(questionsListProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Question Bank'),
        actions: [
          if (canApproveQuestions(role))
            IconButton(
              tooltip: 'Pending approvals',
              onPressed: _busy ? null : _openPending,
              icon: const Icon(Icons.approval_outlined),
            ),
          IconButton(
            tooltip: 'Import questions',
            onPressed: _busy ? null : _import,
            icon: const Icon(Icons.upload_file_outlined),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: _busy ? null : _refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _busy ? null : _createQuestion,
        icon: const Icon(Icons.add),
        label: const Text('Create question'),
      ),
      body: questions.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(error.toString())),
        data: (items) => items.isEmpty
            ? const AppEmptyState(
                icon: Icons.quiz_outlined,
                title: 'No questions yet',
                message: 'Create or import a bank question.',
              )
            : RefreshIndicator(
                onRefresh: _refresh,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, index) => Card(
                    child: ListTile(
                      title: Text(items[index].text),
                      subtitle: Text(
                        '${items[index].questionType} · ${items[index].marks} marks'
                        '${items[index].isQuizReady ? ' · Quiz ready' : ''}',
                      ),
                      trailing: Chip(label: Text(items[index].status)),
                      onTap: () => _showDetail(items[index], user),
                    ),
                  ),
                ),
              ),
      ),
    );
  }

  void _showDetail(QuestionSummaryModel question, AppUser user) {
    final role = user.role;
    final source = ref.read(questionRemoteDataSourceProvider);
    final canAct = canApproveOrRejectQuestion(
      role: role,
      userId: user.id,
      createdBy: question.createdBy,
    );
    final pending = _isPendingQuestionStatus(question.status);
    final endorsed = _isEndorsedNotPublished(question);
    final showApprove = canAct &&
        (pending || (role == UserRole.portalAdmin && endorsed));
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                question.text,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                '${question.questionType} · ${question.marks} marks\n'
                'Status: ${question.status} · Visibility: ${question.visibility ?? 'None'}\n'
                'Quiz ready: ${question.isQuizReady ? 'Yes' : 'No'}',
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if ((role == UserRole.teacher ||
                          role == UserRole.parent) &&
                      question.status.toLowerCase() == 'rejected')
                    FilledButton(
                      onPressed: () {
                        Navigator.pop(sheetContext);
                        _mutate(() => source.submitQuestion(question.id));
                      },
                      child: const Text('Submit for review'),
                    ),
                  if (showApprove) ...[
                    FilledButton(
                      onPressed: () {
                        Navigator.pop(sheetContext);
                        _mutate(() => source.approveQuestion(question.id));
                      },
                      child: const Text('Approve'),
                    ),
                    if (pending)
                      OutlinedButton(
                        onPressed: () async {
                          Navigator.pop(sheetContext);
                          final reason = await _askReason();
                          if (reason != null) {
                            await _mutate(
                              () => source.rejectQuestion(
                                question.id,
                                reason: reason,
                              ),
                            );
                          }
                        },
                        child: const Text('Reject'),
                      ),
                  ],
                  if (canPublishQuestions(role)) ...[
                    OutlinedButton(
                      onPressed: () {
                        Navigator.pop(sheetContext);
                        _mutate(
                          () => question.isActive
                              ? source.deactivateQuestion(question.id)
                              : source.activateQuestion(question.id),
                        );
                      },
                      child:
                          Text(question.isActive ? 'Deactivate' : 'Activate'),
                    ),
                    OutlinedButton(
                      onPressed: () {
                        Navigator.pop(sheetContext);
                        _mutate(
                          () => question.status.toLowerCase() == 'archived'
                              ? source.unarchiveQuestion(question.id)
                              : source.archiveQuestion(question.id),
                        );
                      },
                      child: Text(
                        question.status.toLowerCase() == 'archived'
                            ? 'Unarchive'
                            : 'Archive',
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PendingApprovalsSheet extends ConsumerWidget {
  const _PendingApprovalsSheet({
    required this.onApprove,
    required this.onReject,
  });

  final Future<void> Function(String id) onApprove;
  final Future<void> Function(String id) onReject;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pending = ref.watch(pendingQuestionApprovalsProvider);
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * .75,
        child: pending.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text(error.toString())),
          data: (items) => Column(
            children: [
              const ListTile(title: Text('Pending question approvals')),
              Expanded(
                child: items.isEmpty
                    ? const Center(child: Text('No pending approvals.'))
                    : ListView.builder(
                        itemCount: items.length,
                        itemBuilder: (_, index) => ListTile(
                          title: Text(items[index].text),
                          subtitle: Text(items[index].questionType),
                          trailing: Wrap(
                            children: [
                              IconButton(
                                tooltip: 'Approve',
                                onPressed: () => onApprove(items[index].id),
                                icon: const Icon(Icons.check),
                              ),
                              IconButton(
                                tooltip: 'Reject',
                                onPressed: () => onReject(items[index].id),
                                icon: const Icon(Icons.close),
                              ),
                            ],
                          ),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CreateQuestionDialog extends StatefulWidget {
  const _CreateQuestionDialog();

  @override
  State<_CreateQuestionDialog> createState() => _CreateQuestionDialogState();
}

class _CreateQuestionDialogState extends State<_CreateQuestionDialog> {
  final _text = TextEditingController();
  final _accepted = TextEditingController();
  final _classId = TextEditingController();
  final _subjectId = TextEditingController();
  final _topicId = TextEditingController();
  final _difficulty = TextEditingController();
  final _options = List.generate(4, (_) => TextEditingController());
  final _images = List.generate(4, (_) => TextEditingController());
  String _type = _questionTypes.first;
  int _marks = 1;
  int _correct = 0;
  final Set<int> _correctMany = {};
  String? _error;

  @override
  void dispose() {
    for (final controller in [
      _text,
      _accepted,
      _classId,
      _subjectId,
      _topicId,
      _difficulty,
      ..._options,
      ..._images,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _submit() {
    final classId = int.tryParse(_classId.text);
    final subjectId = int.tryParse(_subjectId.text);
    final difficulty = int.tryParse(_difficulty.text);
    if (_text.text.trim().isEmpty ||
        classId == null ||
        subjectId == null ||
        difficulty == null ||
        _marks < 1) {
      setState(
        () => _error = 'Question, scope, difficulty, and marks are required.',
      );
      return;
    }
    var options = <Map<String, dynamic>>[];
    var accepted = <Map<String, dynamic>>[];
    if (_type == 'True/False') {
      options = [
        {'optionText': 'True', 'isCorrect': _correct == 0},
        {'optionText': 'False', 'isCorrect': _correct == 1},
      ];
    } else if (_type == 'Fill in the Blanks') {
      if (_accepted.text.trim().isEmpty) {
        setState(() => _error = 'Accepted answer is required.');
        return;
      }
      accepted = [
        {
          'answerText': _accepted.text.trim(),
          'isCaseSensitive': false,
          'allowPartialMatch': false,
          'minimumLength': 0,
          'maximumLength': 1000,
          'allowAiReview': false,
          'allowTeacherReview': true,
        },
      ];
    } else if (!{'Descriptive', 'File Upload'}.contains(_type)) {
      options = [
        for (var i = 0; i < _options.length; i++)
          if (_options[i].text.trim().isNotEmpty)
            {
              'optionText': _options[i].text.trim(),
              'isCorrect': _type == 'Multiple Choice'
                  ? _correctMany.contains(i)
                  : _type != 'Matching' && _type != 'Ordering' && i == _correct,
              if (_type == 'Media') 'optionImageUrl': _images[i].text.trim(),
            },
      ];
      final minimum = _type == 'Matching' ? 4 : 2;
      if (options.length < minimum ||
          (_type == 'Matching' && options.length.isOdd)) {
        setState(() => _error = 'Add valid options for $_type.');
        return;
      }
      if (_type == 'Media' &&
          options.any(
            (option) => (option['optionImageUrl'] as String).isEmpty,
          )) {
        setState(() => _error = 'Every media option needs an image URL.');
        return;
      }
      if (_type == 'Multiple Choice' && _correctMany.isEmpty) {
        setState(() => _error = 'Mark at least one correct option.');
        return;
      }
    }
    Navigator.pop(context, <String, dynamic>{
      'questionText': _text.text.trim(),
      'questionType': _type,
      'classId': classId,
      'subjectId': subjectId,
      'topicId': int.tryParse(_topicId.text),
      'difficultyLevel': difficulty,
      'marks': _marks,
      'estimatedTimeSeconds': 60,
      'hint': null,
      'explanation': null,
      'options': options,
      'acceptedAnswers': accepted,
    });
  }

  @override
  Widget build(BuildContext context) {
    final usesOptions = !{
      'Fill in the Blanks',
      'Descriptive',
      'File Upload',
    }.contains(_type);
    return AlertDialog(
      title: const Text('Create question'),
      content: SizedBox(
        width: 440,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _text,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Question text'),
              ),
              DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Type'),
                items: [
                  for (final type in _questionTypes)
                    DropdownMenuItem(value: type, child: Text(type)),
                ],
                onChanged: (value) => setState(() => _type = value ?? _type),
              ),
              Row(
                children: [
                  Expanded(child: _numberField(_classId, 'Class ID')),
                  const SizedBox(width: 8),
                  Expanded(child: _numberField(_subjectId, 'Subject ID')),
                ],
              ),
              Row(
                children: [
                  Expanded(child: _numberField(_topicId, 'Topic ID')),
                  const SizedBox(width: 8),
                  Expanded(child: _numberField(_difficulty, 'Difficulty')),
                ],
              ),
              TextFormField(
                initialValue: '1',
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Marks'),
                onChanged: (value) => _marks = int.tryParse(value) ?? 1,
              ),
              if (_type == 'Fill in the Blanks')
                TextField(
                  controller: _accepted,
                  decoration:
                      const InputDecoration(labelText: 'Accepted answer'),
                ),
              if (_type == 'True/False')
                RadioGroup<int>(
                  groupValue: _correct,
                  onChanged: (value) => setState(() => _correct = value ?? 0),
                  child: Column(
                    children: [
                      for (var i = 0; i < 2; i++)
                        RadioListTile<int>(
                          value: i,
                          title: Text(
                            i == 0 ? 'True is correct' : 'False is correct',
                          ),
                        ),
                    ],
                  ),
                )
              else if (usesOptions)
                if (_type == 'Multiple Choice')
                  for (var i = 0; i < _options.length; i++)
                    CheckboxListTile(
                      value: _correctMany.contains(i),
                      onChanged: (value) => setState(() {
                        (value ?? false)
                            ? _correctMany.add(i)
                            : _correctMany.remove(i);
                      }),
                      title: TextField(
                        controller: _options[i],
                        decoration: InputDecoration(
                          labelText: 'Option ${i + 1}',
                        ),
                      ),
                    )
                else
                  RadioGroup<int>(
                    groupValue: _correct,
                    onChanged: _type == 'Matching' || _type == 'Ordering'
                        ? (_) {}
                        : (value) => setState(() => _correct = value ?? 0),
                    child: Column(
                      children: [
                        for (var i = 0; i < _options.length; i++)
                          Column(
                            children: [
                              RadioListTile<int>(
                                value: i,
                                enabled: _type != 'Matching' &&
                                    _type != 'Ordering',
                                title: TextField(
                                  controller: _options[i],
                                  decoration: InputDecoration(
                                    labelText: _type == 'Matching'
                                        ? const ['L1', 'L2', 'R1', 'R2'][i]
                                        : 'Option ${i + 1}',
                                  ),
                                ),
                              ),
                              if (_type == 'Media')
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                  ),
                                  child: TextField(
                                    controller: _images[i],
                                    keyboardType: TextInputType.url,
                                    decoration: InputDecoration(
                                      labelText: 'Image URL ${i + 1}',
                                    ),
                                  ),
                                ),
                            ],
                          ),
                      ],
                    ),
                  ),
              if (_error != null)
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Create')),
      ],
    );
  }

  Widget _numberField(TextEditingController controller, String label) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      decoration: InputDecoration(labelText: label),
    );
  }
}

bool _isPendingQuestionStatus(String status) {
  final normalized = status.toLowerCase().replaceAll(' ', '');
  return normalized == 'pendingreview' ||
      normalized == 'pending' ||
      normalized == 'underreview';
}

bool _isEndorsedNotPublished(QuestionSummaryModel question) {
  final status = question.status.toLowerCase();
  if (status != 'approved' && status != 'active' && status != 'published') {
    return false;
  }
  final visibility = (question.visibility ?? '').trim().toLowerCase();
  return visibility == 'campus' || visibility == 'school';
}
