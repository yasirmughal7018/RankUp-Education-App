import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final user = authState.user;
    final roles = user?.roles ?? const <UserRole>[];

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
