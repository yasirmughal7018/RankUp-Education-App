import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/core/widgets/field_label.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';

const _schoolChangeRoles = {
  UserRole.teacher,
  UserRole.student,
  UserRole.campusAdmin,
};

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final user = authState.user;
    final roles = user?.roles ?? const <UserRole>[];
    final canRequestSchoolChange =
        user != null && _schoolChangeRoles.contains(user.role);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          CircleAvatar(
            radius: 40,
            child: Text(user?.name.substring(0, 1) ?? 'R'),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              user?.name ?? 'RankUp User',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
          ),
          const SizedBox(height: 8),
          Center(child: Text(user?.role.label ?? 'Guest')),
          if (roles.length > 1) ...[
            const SizedBox(height: 24),
            Text(
              'Acting as',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<UserRole>(
              key: ValueKey(user?.role),
              initialValue: user?.role,
              items: roles
                  .map(
                    (role) => DropdownMenuItem(
                      value: role,
                      child: Text(role.label),
                    ),
                  )
                  .toList(),
              onChanged: authState.isLoading
                  ? null
                  : (role) async {
                      if (role == null || role == user?.role) {
                        return;
                      }
                      await ref
                          .read(authControllerProvider.notifier)
                          .switchRole(role.apiName);
                      if (!context.mounted) {
                        return;
                      }
                      context.go(_dashboardPath(role));
                    },
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
              ),
            ),
          ],
          if (canRequestSchoolChange) ...[
            const SizedBox(height: 28),
            _SchoolChangeSection(user: user!),
          ],
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
            label: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

class _SchoolChangeSection extends ConsumerStatefulWidget {
  const _SchoolChangeSection({required this.user});

  final AppUser user;

  @override
  ConsumerState<_SchoolChangeSection> createState() =>
      _SchoolChangeSectionState();
}

class _SchoolChangeSectionState extends ConsumerState<_SchoolChangeSection> {
  List<({int id, String name})> _schools = const [];
  List<({int id, String name})> _campuses = const [];
  int? _schoolId;
  int? _campusId;
  bool _loadingOptions = true;
  bool _loadingCampuses = false;
  bool _submitting = false;
  String? _error;

  bool get _isCampusAdminOnly => widget.user.role == UserRole.campusAdmin;

  int? get _currentSchoolId => int.tryParse(widget.user.schoolId);

  int? get _currentCampusId => int.tryParse(widget.user.campusId);

  @override
  void initState() {
    super.initState();
    _schoolId = _currentSchoolId;
    _campusId = _currentCampusId;
    _loadSchools();
  }

  Future<void> _loadSchools() async {
    setState(() {
      _loadingOptions = true;
      _error = null;
    });
    try {
      final schools =
          await ref.read(authRepositoryProvider).listRegistrationSchools();
      if (!mounted) {
        return;
      }
      setState(() {
        _schools = schools;
        _loadingOptions = false;
      });
      final schoolId = _schoolId;
      if (schoolId != null) {
        await _loadCampuses(schoolId);
      }
    } on AppException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingOptions = false;
        _error = error.message;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingOptions = false;
        _error = error.toString();
      });
    }
  }

  Future<void> _loadCampuses(int schoolId) async {
    setState(() {
      _loadingCampuses = true;
      _error = null;
    });
    try {
      final campuses = await ref
          .read(authRepositoryProvider)
          .listRegistrationCampuses(schoolId);
      if (!mounted) {
        return;
      }
      setState(() {
        _campuses = campuses;
        if (_campusId != null &&
            campuses.every((campus) => campus.id != _campusId)) {
          _campusId = null;
        }
        _loadingCampuses = false;
      });
    } on AppException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingCampuses = false;
        _campuses = const [];
        _error = error.message;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingCampuses = false;
        _campuses = const [];
        _error = error.toString();
      });
    }
  }

  Future<void> _onSchoolChanged(int? schoolId) async {
    if (_isCampusAdminOnly) {
      return;
    }
    setState(() {
      _schoolId = schoolId;
      _campusId = null;
      _campuses = const [];
    });
    if (schoolId != null) {
      await _loadCampuses(schoolId);
    }
  }

  Future<void> _submit() async {
    setState(() => _error = null);

    final nextSchoolId = _isCampusAdminOnly ? _currentSchoolId : _schoolId;
    final nextCampusId = _campusId;

    if (nextSchoolId == _currentSchoolId &&
        nextCampusId == _currentCampusId) {
      setState(() => _error = 'Choose a different school or campus.');
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Request school / campus change?'),
        content: const Text(
          'Your account will lock until an admin for the destination school or '
          'campus approves or rejects the change. You will be signed out.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Request & lock'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }

    setState(() => _submitting = true);
    try {
      final result = await ref
          .read(authControllerProvider.notifier)
          .requestSchoolChange(
            schoolId: nextSchoolId,
            campusId: nextCampusId,
          );
      await ref.read(authControllerProvider.notifier).logout();
      if (!mounted) {
        return;
      }
      context.go(
        '/login',
        extra: {'lockedMessage': result.message},
      );
    } on AppException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _submitting = false;
        _error = error.message;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _submitting = false;
        _error = error.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final busy = _loadingOptions || _submitting;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'School / campus change',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 6),
            Text(
              _isCampusAdminOnly
                  ? 'Choose a different campus in your school. Your account locks until an admin applies or rejects the change.'
                  : 'Request a move to another school or campus. Your account locks until an admin applies or rejects the change.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            if (_loadingOptions)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: CircularProgressIndicator(),
                ),
              )
            else ...[
              DropdownButtonFormField<int?>(
                key: ValueKey('school-$_schoolId-$_isCampusAdminOnly'),
                initialValue: _schoolId,
                decoration: InputDecoration(
                  label: buildFieldLabel('School', required: true),
                  border: const OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem<int?>(
                    value: null,
                    child: Text('Select school'),
                  ),
                  ..._schools.map(
                    (school) => DropdownMenuItem<int?>(
                      value: school.id,
                      child: Text(school.name),
                    ),
                  ),
                ],
                onChanged:
                    busy || _isCampusAdminOnly ? null : _onSchoolChanged,
              ),
              if (_isCampusAdminOnly) ...[
                const SizedBox(height: 6),
                Text(
                  'Campus admins can change campus only within their school.',
                  style: theme.textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 12),
              DropdownButtonFormField<int?>(
                key: ValueKey('campus-$_schoolId-$_campusId'),
                initialValue: _campusId,
                decoration: InputDecoration(
                  label: buildFieldLabel('Campus'),
                  border: const OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem<int?>(
                    value: null,
                    child: Text('No campus / clear'),
                  ),
                  ..._campuses.map(
                    (campus) => DropdownMenuItem<int?>(
                      value: campus.id,
                      child: Text(campus.name),
                    ),
                  ),
                ],
                onChanged: busy || _schoolId == null || _loadingCampuses
                    ? null
                    : (value) => setState(() => _campusId = value),
              ),
              if (_loadingCampuses) ...[
                const SizedBox(height: 8),
                const LinearProgressIndicator(),
              ],
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: TextStyle(color: theme.colorScheme.error),
              ),
            ],
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: busy || _loadingOptions ? null : _submit,
              icon: _submitting
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.swap_horiz),
              label: Text(
                _submitting ? 'Submitting…' : 'Request change',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _dashboardPath(UserRole role) {
  return switch (role) {
    UserRole.student => '/student',
    UserRole.parent => '/parent',
    UserRole.teacher => '/teacher',
    UserRole.schoolAdmin ||
    UserRole.campusAdmin ||
    UserRole.portalAdmin =>
      '/admin',
  };
}
