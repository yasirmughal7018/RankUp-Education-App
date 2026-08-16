import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/teacher/data/models/teacher_roster_models.dart';
import 'package:rankup_education/features/teacher/presentation/providers/teacher_providers.dart';

class TeacherStudentsPage extends ConsumerStatefulWidget {
  const TeacherStudentsPage({super.key});

  @override
  ConsumerState<TeacherStudentsPage> createState() =>
      _TeacherStudentsPageState();
}

class _TeacherStudentsPageState extends ConsumerState<TeacherStudentsPage> {
  String? _successMessage;
  String _search = '';
  int? _selectedGrade;
  String? _selectedSection;

  Future<void> _openAddStudent(List<TeacherClassSection> classSections) async {
    final result = await showModalBottomSheet<AddMyStudentResult>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _AddStudentSheet(classSections: classSections),
    );
    if (result == null || !mounted) {
      return;
    }
    ref.invalidate(teacherRosterProvider);
    ref.invalidate(teacherGroupsProvider);
    setState(() {
      _successMessage = result.alreadyOnRoster
          ? '${result.student.fullName} was already in that class.'
          : '${result.student.fullName} was added to ${result.student.label}.';
      _search = '';
      _selectedGrade = result.student.grade;
      _selectedSection = result.student.section;
    });
  }

  @override
  Widget build(BuildContext context) {
    final rosterAsync = ref.watch(teacherRosterProvider);
    final groupsAsync = ref.watch(teacherGroupsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My students'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () {
              ref.invalidate(teacherRosterProvider);
              ref.invalidate(teacherGroupsProvider);
            },
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: rosterAsync.maybeWhen(
        data: (roster) => FloatingActionButton.extended(
          onPressed: () => _openAddStudent(roster.classSections),
          icon: const Icon(Icons.person_add_alt_1),
          label: const Text('Add student'),
        ),
        orElse: () => null,
      ),
      body: rosterAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ListView(
          padding: const EdgeInsets.all(24),
          children: [
            AppEmptyState(
              icon: Icons.error_outline,
              title: 'Unable to load students',
              message: error.toString(),
            ),
          ],
        ),
        data: (roster) {
          final buckets = _buildGradeBuckets(
            roster.classSections,
            roster.students,
          );
          final query = _search.trim().toLowerCase();
          final searching = query.isNotEmpty;
          final matches = searching
              ? roster.students
                    .where((student) => _studentMatches(student, query))
                    .toList()
              : const <TeacherRosterStudent>[];

          final grade = buckets.any((item) => item.grade == _selectedGrade)
              ? _selectedGrade
              : (buckets.isEmpty ? null : buckets.first.grade);
          final gradeIndex = buckets.indexWhere((item) => item.grade == grade);
          final gradeBucket = gradeIndex >= 0 ? buckets[gradeIndex] : null;
          final sectionStillValid =
              gradeBucket != null &&
              _selectedSection != null &&
              gradeBucket.sections.any(
                (item) => item.section == _selectedSection,
              );
          final section = sectionStillValid
              ? _selectedSection
              : (gradeBucket != null && gradeBucket.sections.length == 1
                    ? gradeBucket.sections.first.section
                    : null);
          final sectionBucket = gradeBucket == null || section == null
              ? null
              : gradeBucket.sections.firstWhere(
                  (item) => item.section == section,
                );

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(teacherRosterProvider);
              ref.invalidate(teacherGroupsProvider);
              await ref.read(teacherRosterProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
              children: [
                if (_successMessage != null) ...[
                  Text(_successMessage!),
                  const SizedBox(height: 12),
                ],
                TextField(
                  onChanged: (value) => setState(() => _search = value),
                  decoration: const InputDecoration(
                    hintText: 'Search name, username, or roll',
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
                const SizedBox(height: 16),
                if (searching)
                  _SearchResults(
                    students: matches,
                    onOpen: (student) {
                      setState(() {
                        _search = '';
                        _selectedGrade = student.grade;
                        _selectedSection = student.section;
                      });
                    },
                  )
                else if (buckets.isEmpty)
                  const AppEmptyState(
                    icon: Icons.class_outlined,
                    title: 'No classes assigned',
                    message:
                        'Ask an admin to assign your class and section pairs, then add students here.',
                  )
                else ...[
                  Text(
                    'Class',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final bucket in buckets)
                        FilterChip(
                          selected: bucket.grade == grade,
                          showCheckmark: false,
                          label: Text(
                            'Grade ${bucket.grade} · ${bucket.studentCount}',
                          ),
                          onSelected: (_) {
                            setState(() {
                              _selectedGrade = bucket.grade;
                              _selectedSection = bucket.sections.length == 1
                                  ? bucket.sections.first.section
                                  : null;
                            });
                          },
                        ),
                    ],
                  ),
                  if (gradeBucket != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      'Section',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final item in gradeBucket.sections)
                          FilterChip(
                            selected: item.section == section,
                            showCheckmark: false,
                            label: Text(
                              '${item.section} · ${item.students.length}',
                            ),
                            onSelected: (_) {
                              setState(() {
                                _selectedGrade = gradeBucket.grade;
                                _selectedSection =
                                    item.section == section
                                    ? null
                                    : item.section;
                              });
                            },
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (sectionBucket == null)
                      Text(
                        'Choose a section to see its students.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      )
                    else if (sectionBucket.students.isEmpty)
                      AppEmptyState(
                        icon: Icons.groups_outlined,
                        title: 'No students in ${sectionBucket.label}',
                        message:
                            'Add a student with their CNIC or username into this class.',
                      )
                    else ...[
                      Text(
                        '${sectionBucket.label} · ${sectionBucket.students.length} student${sectionBucket.students.length == 1 ? '' : 's'}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      for (final student in sectionBucket.students)
                        _StudentTile(student: student),
                    ],
                  ],
                ],
                const SizedBox(height: 24),
                Text(
                  'Student groups',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                groupsAsync.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (error, _) => Text(error.toString()),
                  data: (groups) {
                    if (groups.isEmpty) {
                      return const Text(
                        'Create groups such as a Math set or extra support from the web app.',
                      );
                    }
                    return Column(
                      children: groups
                          .map(
                            (group) => Card(
                              child: ListTile(
                                title: Text(group.groupName),
                                subtitle: Text(
                                  '${group.memberCount} member${group.memberCount == 1 ? '' : 's'}'
                                  '${group.description.isEmpty ? '' : ' · ${group.description}'}',
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SearchResults extends StatelessWidget {
  const _SearchResults({required this.students, required this.onOpen});

  final List<TeacherRosterStudent> students;
  final ValueChanged<TeacherRosterStudent> onOpen;

  @override
  Widget build(BuildContext context) {
    if (students.isEmpty) {
      return const AppEmptyState(
        icon: Icons.search_off,
        title: 'No matching students',
        message: 'Try a different name, username, or roll number.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${students.length} match${students.length == 1 ? '' : 'es'}',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        for (final student in students.take(80))
          Card(
            child: ListTile(
              onTap: () => onOpen(student),
              title: Text(student.fullName),
              subtitle: Text(
                'Grade ${student.grade}${student.section} · ${student.username} · Roll ${student.rollNumber.isEmpty ? '—' : student.rollNumber}',
              ),
            ),
          ),
      ],
    );
  }
}

class _StudentTile extends StatelessWidget {
  const _StudentTile({required this.student});

  final TeacherRosterStudent student;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(student.fullName),
        subtitle: Text(
          '${student.username} · Roll ${student.rollNumber.isEmpty ? '—' : student.rollNumber}',
        ),
      ),
    );
  }
}

class _GradeBucket {
  const _GradeBucket({required this.grade, required this.sections});

  final int grade;
  final List<_SectionBucket> sections;

  int get studentCount =>
      sections.fold(0, (sum, item) => sum + item.students.length);
}

class _SectionBucket {
  const _SectionBucket({
    required this.grade,
    required this.section,
    required this.students,
  });

  final int grade;
  final String section;
  final List<TeacherRosterStudent> students;

  String get label => 'Grade $grade$section';
}

List<_GradeBucket> _buildGradeBuckets(
  List<TeacherClassSection> classSections,
  List<TeacherRosterStudent> students,
) {
  final map = <String, List<TeacherRosterStudent>>{};
  for (final item in classSections) {
    map.putIfAbsent('${item.grade}|${item.section}', () => []);
  }
  for (final student in students) {
    map
        .putIfAbsent('${student.grade}|${student.section}', () => [])
        .add(student);
  }

  final byGrade = <int, List<_SectionBucket>>{};
  for (final entry in map.entries) {
    final parts = entry.key.split('|');
    final grade = int.tryParse(parts.first) ?? 0;
    final section = parts.skip(1).join('|');
    final roster = [...entry.value]
      ..sort((left, right) {
        final roll = left.rollNumber.compareTo(right.rollNumber);
        if (roll != 0) {
          return roll;
        }
        return left.fullName.toLowerCase().compareTo(
          right.fullName.toLowerCase(),
        );
      });
    byGrade
        .putIfAbsent(grade, () => [])
        .add(
          _SectionBucket(grade: grade, section: section, students: roster),
        );
  }

  final grades = byGrade.keys.toList()..sort();
  return [
    for (final grade in grades)
      _GradeBucket(
        grade: grade,
        sections: (byGrade[grade] ?? [])
          ..sort((left, right) => left.section.compareTo(right.section)),
      ),
  ];
}

bool _studentMatches(TeacherRosterStudent student, String query) {
  final haystack =
      '${student.fullName} ${student.username} ${student.rollNumber} grade ${student.grade}${student.section}'
          .toLowerCase();
  return haystack.contains(query);
}

class _AddStudentSheet extends ConsumerStatefulWidget {
  const _AddStudentSheet({required this.classSections});

  final List<TeacherClassSection> classSections;

  @override
  ConsumerState<_AddStudentSheet> createState() => _AddStudentSheetState();
}

class _AddStudentSheetState extends ConsumerState<_AddStudentSheet> {
  final _identifierController = TextEditingController();
  TeacherClassSection? _selected;
  String? _error;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _selected = widget.classSections.isEmpty
        ? null
        : widget.classSections.first;
  }

  @override
  void dispose() {
    _identifierController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final identifier = _identifierController.text.trim();
    final selected = _selected;
    if (identifier.isEmpty) {
      setState(() => _error = 'Enter the student’s CNIC or username.');
      return;
    }
    if (selected == null) {
      setState(() => _error = 'Ask an admin to assign your classes first.');
      return;
    }

    setState(() {
      _error = null;
      _submitting = true;
    });

    try {
      final result = await ref
          .read(teacherRemoteDataSourceProvider)
          .addMyStudent(
            identifier: identifier,
            grade: selected.grade,
            section: selected.section,
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
          Text('Add student', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            'Find an existing student by CNIC or username and place them in one of your classes.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _identifierController,
            enabled: !_submitting,
            autofocus: true,
            decoration: const InputDecoration(
              labelText: 'CNIC or username',
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _selected == null
                ? null
                : '${_selected!.grade}|${_selected!.section}',
            items: widget.classSections
                .map(
                  (item) => DropdownMenuItem(
                    value: '${item.grade}|${item.section}',
                    child: Text(item.label),
                  ),
                )
                .toList(),
            onChanged: _submitting
                ? null
                : (value) {
                    if (value == null) {
                      return;
                    }
                    final parts = value.split('|');
                    final grade = int.tryParse(parts.first) ?? 0;
                    final section = parts.skip(1).join('|');
                    setState(() {
                      _selected = widget.classSections.firstWhere(
                        (item) =>
                            item.grade == grade && item.section == section,
                      );
                    });
                  },
            decoration: const InputDecoration(labelText: 'Class & section'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: Text(_submitting ? 'Adding…' : 'Add student'),
          ),
        ],
      ),
    );
  }
}
