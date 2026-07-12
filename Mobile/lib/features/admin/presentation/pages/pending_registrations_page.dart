import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/admin/domain/pending_registration.dart';
import 'package:rankup_education/features/admin/presentation/providers/registration_providers.dart';
import 'package:rankup_education/features/admin/presentation/widgets/approve_registration_sheet.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';

class PendingRegistrationsPage extends ConsumerStatefulWidget {
  const PendingRegistrationsPage({super.key});

  @override
  ConsumerState<PendingRegistrationsPage> createState() {
    return _PendingRegistrationsPageState();
  }
}

class _PendingRegistrationsPageState
    extends ConsumerState<PendingRegistrationsPage> {
  String? _successMessage;
  String? _actionError;
  bool _isActing = false;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_markNotificationsRead);
  }

  Future<void> _markNotificationsRead() async {
    try {
      await ref
          .read(registrationRemoteDataSourceProvider)
          .markRegistrationNotificationsRead();
    } catch (_) {
      // Approvals still work if mark-read fails.
    }
  }

  Future<void> _approve(PendingRegistration registration) async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) {
        return ApproveRegistrationSheet(registration: registration);
      },
    );

    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _isActing = true;
      _actionError = null;
      _successMessage = null;
    });

    try {
      final result = await ref
          .read(registrationRemoteDataSourceProvider)
          .approve(registration.id);
      if (!mounted) {
        return;
      }
      setState(() {
        _successMessage = result.message.isNotEmpty
            ? result.message
            : result.isActivated
                ? '${registration.fullName} was approved. They must set a password on first login.'
                : '${registration.fullName}: approval recorded. Waiting for Portal Admin.';
      });
      ref.invalidate(pendingRegistrationsProvider);
    } on AppException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _actionError = error.message;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _actionError = 'Unable to approve registration.';
      });
    } finally {
      if (mounted) {
        setState(() => _isActing = false);
      }
    }
  }

  Future<void> _reject(PendingRegistration registration) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Reject request?'),
          content: Text(
            'Reject registration for ${registration.fullName}?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Reject'),
            ),
          ],
        );
      },
    );

    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _isActing = true;
      _actionError = null;
      _successMessage = null;
    });

    try {
      await ref
          .read(registrationRemoteDataSourceProvider)
          .reject(registration.id);
      if (!mounted) {
        return;
      }
      setState(() {
        _successMessage = '${registration.fullName} was rejected.';
      });
      ref.invalidate(pendingRegistrationsProvider);
    } on AppException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _actionError = error.message;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _actionError = 'Unable to reject registration.';
      });
    } finally {
      if (mounted) {
        setState(() => _isActing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    final async = ref.watch(pendingRegistrationsProvider);
    final isPortalAdmin = user?.role == UserRole.portalAdmin;
    final roleLabel = switch (user?.role) {
      UserRole.portalAdmin => 'Portal Admin',
      UserRole.schoolAdmin => 'School Admin',
      UserRole.campusAdmin => 'Campus Admin',
      _ => 'Admin',
    };
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Registration approvals'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _isActing
                ? null
                : () => ref.invalidate(pendingRegistrationsProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Chip(label: Text(roleLabel)),
                  const SizedBox(height: 8),
                  Text(
                    isPortalAdmin
                        ? 'Only your approval activates the account. School/Campus Admin can record approval first.'
                        : 'Your approval is recorded, but Portal Admin must still approve before the account is activated.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_successMessage != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Material(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(_successMessage!),
                ),
              ),
            ),
          if (_actionError != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Material(
                color: theme.colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    _actionError!,
                    style: TextStyle(color: theme.colorScheme.onErrorContainer),
                  ),
                ),
              ),
            ),
          Expanded(
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        error is AppException
                            ? error.message
                            : 'Unable to load pending registrations.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: () =>
                            ref.invalidate(pendingRegistrationsProvider),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
              data: (registrations) {
                if (registrations.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'No pending registration requests.',
                        textAlign: TextAlign.center,
                      ),
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(pendingRegistrationsProvider);
                    await ref.read(pendingRegistrationsProvider.future);
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: registrations.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final item = registrations[index];
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.fullName,
                                style: theme.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text('${item.role} · ${item.username}'),
                              const SizedBox(height: 4),
                              Text(
                                'Pending with: ${item.pendingWithLabel}',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                              ),
                              Text(_schoolCampusLabel(item)),
                              if (item.reasonMessage != null &&
                                  item.reasonMessage!.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(item.reasonMessage!),
                                ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: _isActing
                                          ? null
                                          : () => _reject(item),
                                      child: const Text('Reject'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: FilledButton(
                                      onPressed: _isActing
                                          ? null
                                          : () => _approve(item),
                                      child: const Text('Approve'),
                                    ),
                                  ),
                                ],
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
          ),
        ],
      ),
    );
  }
}

String _schoolCampusLabel(PendingRegistration registration) {
  if (registration.schoolId == null) {
    return 'No school (Portal Admin)';
  }

  final campus = registration.campusId != null
      ? ' / Campus ${registration.campusId}'
      : '';
  return 'School ${registration.schoolId}$campus';
}
