import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _identifierController = TextEditingController(text: 'demo');
  final _passwordController = TextEditingController(text: 'password');
  UserRole _selectedRole = UserRole.student;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(
                    Icons.workspace_premium,
                    size: 64,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'RankUp Education',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Students, parents, and teachers in one learning system.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 32),
                  SegmentedButton<UserRole>(
                    segments: [
                      for (final role in UserRole.values)
                        ButtonSegment(
                          value: role,
                          label: Text(role.label),
                          icon: Icon(_iconForRole(role)),
                        ),
                    ],
                    selected: {_selectedRole},
                    onSelectionChanged: (selection) {
                      setState(() => _selectedRole = selection.first);
                    },
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _identifierController,
                    decoration: const InputDecoration(
                      labelText: 'Email, mobile, student ID, or username',
                      prefixIcon: Icon(Icons.badge_outlined),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password or PIN',
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                  ),
                  if (authState.errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      authState.errorMessage!,
                      style: TextStyle(color: theme.colorScheme.error),
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: authState.isLoading ? null : _login,
                    icon: authState.isLoading
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.login),
                    label: const Text('Login'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _login() {
    return ref
        .read(authControllerProvider.notifier)
        .login(
          identifier: _identifierController.text.trim(),
          password: _passwordController.text,
          role: _selectedRole,
        );
  }

  IconData _iconForRole(UserRole role) {
    return switch (role) {
      UserRole.student => Icons.school_outlined,
      UserRole.parent => Icons.family_restroom_outlined,
      UserRole.teacher => Icons.groups_outlined,
    };
  }
}
