import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/parent/data/models/linked_student.dart';
import 'package:rankup_education/features/parent/data/models/parent_group.dart';
import 'package:rankup_education/features/parent/presentation/providers/parent_providers.dart';

/// Create and manage groups of linked children.
class ParentGroupsSection extends ConsumerStatefulWidget {
  const ParentGroupsSection({required this.students, super.key});

  final List<LinkedStudent> students;

  @override
  ConsumerState<ParentGroupsSection> createState() =>
      _ParentGroupsSectionState();
}

class _ParentGroupsSectionState extends ConsumerState<ParentGroupsSection> {
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _message;
  String? _error;
  bool _creating = false;
  int? _busyGroupId;
  int? _busyStudentId;

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(parentGroupsProvider);
    await ref.read(parentGroupsProvider.future);
  }

  Future<void> _createGroup() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() {
        _error = 'Enter a group name.';
        _message = null;
      });
      return;
    }

    setState(() {
      _creating = true;
      _error = null;
      _message = null;
    });

    try {
      final group = await ref.read(parentRemoteDataSourceProvider).createGroup(
            groupName: name,
            description: _descriptionController.text.trim(),
          );
      _nameController.clear();
      _descriptionController.clear();
      ref.invalidate(parentGroupsProvider);
      if (!mounted) {
        return;
      }
      setState(() {
        _creating = false;
        _message = 'Created “${group.groupName}”.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _creating = false;
        _error = error.toString();
      });
    }
  }

  Future<void> _deleteGroup(ParentGroup group) async {
    setState(() {
      _busyGroupId = group.groupId;
      _error = null;
      _message = null;
    });
    try {
      await ref.read(parentRemoteDataSourceProvider).deleteGroup(group.groupId);
      ref.invalidate(parentGroupsProvider);
      if (!mounted) {
        return;
      }
      setState(() {
        _busyGroupId = null;
        _message = 'Removed “${group.groupName}”.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busyGroupId = null;
        _error = error.toString();
      });
    }
  }

  Future<void> _addMember(ParentGroup group, LinkedStudent student) async {
    setState(() {
      _busyGroupId = group.groupId;
      _busyStudentId = student.studentId;
      _error = null;
      _message = null;
    });
    try {
      await ref.read(parentRemoteDataSourceProvider).addGroupMember(
            groupId: group.groupId,
            studentId: student.studentId,
          );
      ref.invalidate(parentGroupsProvider);
      if (!mounted) {
        return;
      }
      setState(() {
        _busyGroupId = null;
        _busyStudentId = null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busyGroupId = null;
        _busyStudentId = null;
        _error = error.toString();
      });
    }
  }

  Future<void> _removeMember(ParentGroup group, ParentGroupMember member) async {
    setState(() {
      _busyGroupId = group.groupId;
      _busyStudentId = member.studentId;
      _error = null;
      _message = null;
    });
    try {
      await ref.read(parentRemoteDataSourceProvider).removeGroupMember(
            groupId: group.groupId,
            studentId: member.studentId,
          );
      ref.invalidate(parentGroupsProvider);
      if (!mounted) {
        return;
      }
      setState(() {
        _busyGroupId = null;
        _busyStudentId = null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busyGroupId = null;
        _busyStudentId = null;
        _error = error.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final groupsAsync = ref.watch(parentGroupsProvider);

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Text(
            'Group linked children so you can assign a quiz to several of them at once.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _nameController,
            enabled: !_creating,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'Group name',
              hintText: 'e.g. Weekend practice',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descriptionController,
            enabled: !_creating,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _creating ? null : _createGroup(),
            decoration: const InputDecoration(
              labelText: 'Description (optional)',
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _creating ? null : _createGroup,
            icon: const Icon(Icons.group_add_outlined),
            label: Text(_creating ? 'Creating…' : 'Create group'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          if (_message != null) ...[
            const SizedBox(height: 12),
            Text(
              _message!,
              style: TextStyle(color: Theme.of(context).colorScheme.primary),
            ),
          ],
          const SizedBox(height: 20),
          groupsAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, _) => AppEmptyState(
              icon: Icons.error_outline,
              title: 'Unable to load groups',
              message: error.toString(),
            ),
            data: (groups) {
              if (groups.isEmpty) {
                return const AppEmptyState(
                  icon: Icons.groups_outlined,
                  title: 'No groups yet',
                  message:
                      'Create a group, then add the children you want to assign together.',
                );
              }

              return Column(
                children: [
                  for (final group in groups)
                    _GroupCard(
                      group: group,
                      students: widget.students,
                      busy: _busyGroupId == group.groupId,
                      busyStudentId: _busyGroupId == group.groupId
                          ? _busyStudentId
                          : null,
                      onDelete: () => _deleteGroup(group),
                      onAdd: (student) => _addMember(group, student),
                      onRemove: (member) => _removeMember(group, member),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _GroupCard extends StatelessWidget {
  const _GroupCard({
    required this.group,
    required this.students,
    required this.busy,
    required this.busyStudentId,
    required this.onDelete,
    required this.onAdd,
    required this.onRemove,
  });

  final ParentGroup group;
  final List<LinkedStudent> students;
  final bool busy;
  final int? busyStudentId;
  final VoidCallback onDelete;
  final ValueChanged<LinkedStudent> onAdd;
  final ValueChanged<ParentGroupMember> onRemove;

  @override
  Widget build(BuildContext context) {
    final memberIds = group.members.map((member) => member.studentId).toSet();
    final available = students
        .where((student) => !memberIds.contains(student.studentId))
        .toList();

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        group.groupName,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        [
                          '${group.memberCount} member${group.memberCount == 1 ? '' : 's'}',
                          if (group.description.isNotEmpty) group.description,
                        ].join(' · '),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Delete group',
                  onPressed: busy ? null : onDelete,
                  icon: const Icon(Icons.delete_outline),
                ),
              ],
            ),
            if (group.members.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8, bottom: 4),
                child: Text('No members yet.'),
              )
            else
              for (final member in group.members)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  title: Text(member.label),
                  subtitle: Text(member.username),
                  trailing: TextButton(
                    onPressed: busyStudentId == member.studentId
                        ? null
                        : () => onRemove(member),
                    child: const Text('Remove'),
                  ),
                ),
            if (students.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('Link a child first, then add them here.'),
              )
            else if (available.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('Every linked child is already in this group.'),
              )
            else
              for (final student in available)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  title: Text(student.label),
                  trailing: TextButton(
                    onPressed: busyStudentId == student.studentId
                        ? null
                        : () => onAdd(student),
                    child: const Text('Add'),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}
