import 'package:flutter/material.dart';
import 'package:rankup_education/features/admin/domain/pending_registration.dart';

/// Read-only confirmation sheet — approve without editing fields or setting a password.
/// Bottom sheet for reviewing and approving a registration.
class ApproveRegistrationSheet extends StatelessWidget {
  const ApproveRegistrationSheet({
    required this.registration,
    super.key,
  });

  final PendingRegistration registration;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final schoolCampus = registration.schoolId == null
        ? 'No school (Portal Admin)'
        : 'School ${registration.schoolId}'
            '${registration.campusId != null ? ' / Campus ${registration.campusId}' : ''}';

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Approve registration',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Review the details below. Approving does not change any info or set a '
            'password. The user must set their own password on first login.',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Detail('Name', registration.fullName),
                  _Detail('Username', registration.username),
                  _Detail('Role', registration.role),
                  _Detail(
                    'Mobile',
                    registration.mobileNumber ?? registration.username,
                  ),
                  _Detail('CNIC', registration.cnic ?? '—'),
                  _Detail('Email', registration.emailAddress ?? '—'),
                  _Detail('School / campus', schoolCampus),
                  _Detail('Pending with', registration.pendingWithLabel),
                  _Detail(
                    'Roll / teacher code',
                    registration.rollNumberTeacherCode ?? '—',
                  ),
                  _Detail('Reason', registration.reasonMessage ?? '—'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Approve account'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
