import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/tutor/data/models/tutor_linked_student.dart';
import 'package:rankup_education/features/tutor/presentation/providers/tutor_providers.dart';

/// Linked students for the signed-in Tutor.
class TutorStudentsPage extends ConsumerStatefulWidget {
  const TutorStudentsPage({super.key});

  @override
  ConsumerState<TutorStudentsPage> createState() => _TutorStudentsPageState();
}

class _TutorStudentsPageState extends ConsumerState<TutorStudentsPage> {
  String? _successMessage;

  Future<void> _openLinkStudent() async {
    final result = await showModalBottomSheet<LinkTutorStudentResult>(
      context: context,
      isScrollControlled: true,
      builder: (context) => const _LinkStudentSheet(),
    );

    if (result == null || !mounted) {
      return;
    }

    ref.invalidate(tutorLinkedStudentsProvider);
    setState(() {
      _successMessage = result.alreadyLinked
          ? '${result.fullName} was already linked to your account.'
          : '${result.fullName} was linked successfully.';
    });
  }

  Future<void> _unlink(TutorLinkedStudent student) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Unlink student?'),
        content: Text(
          '${student.fullName} stays in their school. You will lose access to assign quizzes to them.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Unlink'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }

    try {
      await ref
          .read(tutorRemoteDataSourceProvider)
          .unlinkStudent(student.studentId);
      ref.invalidate(tutorLinkedStudentsProvider);
      if (!mounted) {
        return;
      }
      setState(() {
        _successMessage = '${student.fullName} was unlinked from your account.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final studentsAsync = ref.watch(tutorLinkedStudentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My students'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(tutorLinkedStudentsProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openLinkStudent,
        icon: const Icon(Icons.person_add_alt_1),
        label: const Text('Link student'),
      ),
      body: studentsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ListView(
          padding: const EdgeInsets.all(24),
          children: [
            AppEmptyState(
              icon: Icons.error_outline,
              title: 'Unable to load students',
              message: error.toString(),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => ref.invalidate(tutorLinkedStudentsProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
        data: (students) {
          if (students.isEmpty) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 100),
              children: [
                if (_successMessage != null) ...[
                  _SuccessBanner(message: _successMessage!),
                  const SizedBox(height: 16),
                ],
                const AppEmptyState(
                  icon: Icons.school_outlined,
                  title: 'No linked students',
                  message:
                      'Link a student by CNIC or username. Their school and class stay unchanged.',
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _openLinkStudent,
                  icon: const Icon(Icons.person_add_alt_1),
                  label: const Text('Link student'),
                ),
              ],
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(tutorLinkedStudentsProvider);
              await ref.read(tutorLinkedStudentsProvider.future);
            },
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
              itemCount: students.length + (_successMessage != null ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                if (_successMessage != null && index == 0) {
                  return _SuccessBanner(message: _successMessage!);
                }

                final student =
                    students[_successMessage != null ? index - 1 : index];
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      child: Text(
                        student.fullName.isNotEmpty
                            ? student.fullName[0].toUpperCase()
                            : '?',
                      ),
                    ),
                    title: Text(student.label),
                    subtitle: Text(
                      [
                        '@${student.username}',
                        if (student.schoolName != null &&
                            student.schoolName!.isNotEmpty)
                          student.schoolName!,
                        if (student.rollNumber.isNotEmpty)
                          'Roll ${student.rollNumber}',
                      ].join(' · '),
                    ),
                    trailing: PopupMenuButton<String>(
                      onSelected: (value) {
                        if (value == 'history') {
                          context.push(
                            '/tutor/students/${student.studentId}/history',
                          );
                        } else if (value == 'unlink') {
                          _unlink(student);
                        }
                      },
                      itemBuilder: (context) => const [
                        PopupMenuItem(
                          value: 'history',
                          child: Text('Quiz history'),
                        ),
                        PopupMenuItem(
                          value: 'unlink',
                          child: Text('Unlink'),
                        ),
                      ],
                    ),
                    onTap: () => context.push(
                      '/tutor/students/${student.studentId}/history',
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

class _SuccessBanner extends StatelessWidget {
  const _SuccessBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Material(
      color: colors.primaryContainer,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Text(
          message,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: colors.onPrimaryContainer,
              ),
        ),
      ),
    );
  }
}

class _LinkStudentSheet extends ConsumerStatefulWidget {
  const _LinkStudentSheet();

  @override
  ConsumerState<_LinkStudentSheet> createState() => _LinkStudentSheetState();
}

class _LinkStudentSheetState extends ConsumerState<_LinkStudentSheet> {
  final _identifierController = TextEditingController();
  String? _error;
  bool _submitting = false;

  @override
  void dispose() {
    _identifierController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final identifier = _identifierController.text.trim();
    if (identifier.isEmpty) {
      setState(() => _error = 'Enter the student’s CNIC or username.');
      return;
    }

    setState(() {
      _error = null;
      _submitting = true;
    });

    try {
      final result = await ref
          .read(tutorRemoteDataSourceProvider)
          .linkStudent(identifier: identifier);
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(result);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString();
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 24 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Link student',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Enter an existing student’s CNIC or username. This does not change their school.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _identifierController,
            enabled: !_submitting,
            autofocus: true,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submitting ? null : _submit(),
            decoration: const InputDecoration(
              labelText: 'CNIC or username',
              hintText: 'e.g. 42101-1234567-1 or student@school.edu',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed:
                      _submitting ? null : () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton(
                  onPressed: _submitting ? null : _submit,
                  child: Text(_submitting ? 'Linking…' : 'Link student'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
