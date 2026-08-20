import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/parent/data/models/linked_student.dart';
import 'package:rankup_education/features/parent/presentation/providers/parent_providers.dart';

/// Linked children list for the signed-in Parent.
class ParentChildrenPage extends ConsumerStatefulWidget {
  const ParentChildrenPage({super.key});

  @override
  ConsumerState<ParentChildrenPage> createState() => _ParentChildrenPageState();
}

class _ParentChildrenPageState extends ConsumerState<ParentChildrenPage> {
  String? _successMessage;

  Future<void> _openAddChild() async {
    final result = await showModalBottomSheet<LinkMyChildResult>(
      context: context,
      isScrollControlled: true,
      builder: (context) => const _AddChildSheet(),
    );

    if (result == null || !mounted) {
      return;
    }

    ref.invalidate(linkedStudentsProvider);
    setState(() {
      _successMessage = result.alreadyLinked
          ? '${result.fullName} was already linked to your account.'
          : '${result.fullName} was linked successfully.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final studentsAsync = ref.watch(linkedStudentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My children'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(linkedStudentsProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddChild,
        icon: const Icon(Icons.person_add_alt_1),
        label: const Text('Add child'),
      ),
      body: studentsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ListView(
          padding: const EdgeInsets.all(24),
          children: [
            AppEmptyState(
              icon: Icons.error_outline,
              title: 'Unable to load children',
              message: error.toString(),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => ref.invalidate(linkedStudentsProvider),
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
                AppEmptyState(
                  icon: Icons.family_restroom_outlined,
                  title: 'No linked children',
                  message:
                      'Add a child using their CNIC or username. School admins can also link students for you.',
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _openAddChild,
                  icon: const Icon(Icons.person_add_alt_1),
                  label: const Text('Add child'),
                ),
              ],
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(linkedStudentsProvider);
              await ref.read(linkedStudentsProvider.future);
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
                final theme = Theme.of(context);
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      child: Text(
                        student.fullName.isNotEmpty
                            ? student.fullName[0].toUpperCase()
                            : '?',
                      ),
                    ),
                    title: Row(
                      children: [
                        Expanded(
                          child: Text(
                            student.label,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Chip(
                          label: Text(
                            student.statusLabel,
                            style: theme.textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          visualDensity: VisualDensity.compact,
                          materialTapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                          padding: EdgeInsets.zero,
                          labelPadding: const EdgeInsets.symmetric(
                            horizontal: 8,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Chip(
                          label: Text(
                            student.relationship.trim().isEmpty
                                ? 'Guardian'
                                : student.relationship.trim(),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.onPrimaryContainer,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          visualDensity: VisualDensity.compact,
                          materialTapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                          padding: EdgeInsets.zero,
                          labelPadding: const EdgeInsets.symmetric(
                            horizontal: 8,
                          ),
                          backgroundColor: theme.colorScheme.primaryContainer,
                          side: BorderSide.none,
                        ),
                      ],
                    ),
                    subtitle: Text(
                      '${student.username} · Roll ${student.rollNumber.isEmpty ? '—' : student.rollNumber}\n${student.placementLabel}',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push(
                      '/parent/children/${student.studentId}/history',
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

class _AddChildSheet extends ConsumerStatefulWidget {
  const _AddChildSheet();

  @override
  ConsumerState<_AddChildSheet> createState() => _AddChildSheetState();
}

class _AddChildSheetState extends ConsumerState<_AddChildSheet> {
  final _identifierController = TextEditingController();
  final _relationshipController = TextEditingController(text: 'Guardian');
  String? _error;
  bool _submitting = false;

  @override
  void dispose() {
    _identifierController.dispose();
    _relationshipController.dispose();
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
      final result = await ref.read(parentRemoteDataSourceProvider).linkMyChild(
            identifier: identifier,
            relationship: _relationshipController.text.trim().isEmpty
                ? 'Guardian'
                : _relationshipController.text.trim(),
          );
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
            'Add child',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Enter your child’s CNIC or username to link their student account.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _identifierController,
            enabled: !_submitting,
            autofocus: true,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'CNIC or username',
              hintText: 'e.g. 42101-1234567-1 or student@school.edu',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _relationshipController,
            enabled: !_submitting,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submitting ? null : _submit(),
            decoration: const InputDecoration(
              labelText: 'Relationship',
              hintText: 'Guardian',
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
                  child: Text(_submitting ? 'Linking…' : 'Link child'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
