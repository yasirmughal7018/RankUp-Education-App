import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';

class ChangePasswordPage extends ConsumerStatefulWidget {
  const ChangePasswordPage({super.key});

  @override
  ConsumerState<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends ConsumerState<ChangePasswordPage> {
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  String? _localError;

  @override
  void dispose() {
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _localError = null);

    final newPassword = _newController.text;
    if (newPassword.length < 6) {
      setState(() => _localError = 'Password must be at least 6 characters.');
      return;
    }

    if (newPassword != _confirmController.text) {
      setState(() => _localError = 'Password and confirmation do not match.');
      return;
    }

    try {
      await ref.read(authControllerProvider.notifier).changePassword(
            newPassword: newPassword,
          );
      if (!mounted) {
        return;
      }
      final role = ref.read(authControllerProvider).user?.role;
      if (role != null) {
        context.go(_dashboardPath(role));
      }
    } on AppException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _localError = error.message);
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _localError = 'Unable to set password.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final theme = Theme.of(context);
    final error = _localError ?? authState.errorMessage;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Set your password'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'First-time password setup',
                    style: theme.textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your account was approved by an admin. Set a password to continue.',
                    style: theme.textTheme.bodyMedium,
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 16),
                    Material(
                      color: theme.colorScheme.errorContainer,
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          error,
                          style: TextStyle(
                            color: theme.colorScheme.onErrorContainer,
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  TextField(
                    controller: _newController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(),
                    ),
                    enabled: !authState.isLoading,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _confirmController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Confirm password',
                      border: OutlineInputBorder(),
                    ),
                    enabled: !authState.isLoading,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: authState.isLoading ? null : _submit,
                    child: authState.isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Save password and continue'),
                  ),
                ],
              ),
            ),
          ),
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
    UserRole.schoolAdmin || UserRole.portalAdmin => '/admin',
  };
}
