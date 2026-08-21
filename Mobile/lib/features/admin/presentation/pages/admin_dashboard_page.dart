import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';

/// Admin home with shortcuts to approvals and alerts.
class AdminDashboardPage extends ConsumerWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final role = user?.role ?? UserRole.portalAdmin;
    final roleLabel = role.label;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin'),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            onPressed: () => context.go('/notifications'),
            icon: const Icon(Icons.notifications_outlined),
          ),
          IconButton(
            tooltip: 'Settings',
            onPressed: () => context.go('/settings'),
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Text(
            'Welcome, ${user?.name ?? roleLabel}',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$roleLabel can review account access requests and manage school quizzes from mobile.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          if (canManageQuizzes(role)) ...[
            Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Icon(
                    Icons.assignment_outlined,
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                ),
                title: const Text('Manage quizzes'),
                subtitle: const Text(
                  'Create, assign, monitor, and review quizzes',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/quizzes'),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: theme.colorScheme.tertiaryContainer,
                  child: Icon(
                    Icons.dashboard_outlined,
                    color: theme.colorScheme.onTertiaryContainer,
                  ),
                ),
                title: const Text('Assignment board'),
                subtitle: const Text(
                  'Cross-quiz view of student assignments',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/quizzes/assignments'),
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (canApproveQuizzes(role)) ...[
            Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: theme.colorScheme.secondaryContainer,
                  child: Icon(
                    Icons.approval_outlined,
                    color: theme.colorScheme.onSecondaryContainer,
                  ),
                ),
                title: const Text('Quiz approvals'),
                subtitle: const Text(
                  'Approve or reject teacher quizzes',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/quizzes/approvals'),
              ),
            ),
            const SizedBox(height: 12),
          ],
          Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: theme.colorScheme.primaryContainer,
                child: Icon(
                  Icons.how_to_reg_outlined,
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
              title: const Text('Registration approvals'),
              subtitle: const Text(
                'Approve or reject pending authentication requests',
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.go('/admin/registrations'),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: theme.colorScheme.secondaryContainer,
                child: Icon(
                  Icons.notifications_active_outlined,
                  color: theme.colorScheme.onSecondaryContainer,
                ),
              ),
              title: const Text('Notifications'),
              subtitle: const Text(
                'Open RegistrationRequest alerts to jump to approvals',
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.go('/notifications'),
            ),
          ),
        ],
      ),
    );
  }
}
