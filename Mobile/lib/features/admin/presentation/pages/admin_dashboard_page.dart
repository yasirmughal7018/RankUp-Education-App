import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';

class AdminDashboardPage extends ConsumerWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final roleLabel = user?.role.label ?? 'Admin';
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
            '$roleLabel can review account access requests from mobile and web notifications.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
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
