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
  final _otpController = TextEditingController();

  UserRole _selectedRole = UserRole.student;
  _LoginMode _mode = _LoginMode.password;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _otpController.dispose();
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
                  SegmentedButton<_LoginMode>(
                    segments: const [
                      ButtonSegment(
                        value: _LoginMode.password,
                        label: Text('Password'),
                        icon: Icon(Icons.lock_outline),
                      ),
                      ButtonSegment(
                        value: _LoginMode.otp,
                        label: Text('OTP'),
                        icon: Icon(Icons.sms_outlined),
                      ),
                    ],
                    selected: {_mode},
                    onSelectionChanged: (selection) {
                      setState(() => _mode = selection.first);
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
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 180),
                    child: _mode == _LoginMode.password
                        ? TextField(
                            key: const ValueKey('password-field'),
                            controller: _passwordController,
                            obscureText: true,
                            decoration: const InputDecoration(
                              labelText: 'Password or PIN',
                              prefixIcon: Icon(Icons.lock_outline),
                            ),
                          )
                        : TextField(
                            key: const ValueKey('otp-field'),
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'OTP code',
                              prefixIcon: Icon(Icons.pin_outlined),
                            ),
                          ),
                  ),
                  if (authState.errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      authState.errorMessage!,
                      style: TextStyle(color: theme.colorScheme.error),
                    ),
                  ],
                  if (authState.successMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      authState.successMessage!,
                      style: TextStyle(color: theme.colorScheme.primary),
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: authState.isLoading ? null : _submit,
                    icon: authState.isLoading
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.login),
                    label: Text(
                      _mode == _LoginMode.password ? 'Login' : 'Verify OTP',
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (_mode == _LoginMode.otp)
                    OutlinedButton.icon(
                      onPressed: authState.isLoading ? null : _requestOtp,
                      icon: const Icon(Icons.sms_outlined),
                      label: const Text('Send OTP'),
                    )
                  else
                    TextButton(
                      onPressed: authState.isLoading ? null : _forgotPassword,
                      child: const Text('Forgot password?'),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() {
    if (_mode == _LoginMode.otp) {
      return ref
          .read(authControllerProvider.notifier)
          .verifyOtp(
            identifier: _identifierController.text.trim(),
            code: _otpController.text.trim(),
            role: _selectedRole,
          );
    }

    return ref
        .read(authControllerProvider.notifier)
        .login(
          identifier: _identifierController.text.trim(),
          password: _passwordController.text,
          role: _selectedRole,
        );
  }

  Future<void> _requestOtp() {
    return ref
        .read(authControllerProvider.notifier)
        .requestOtp(
          identifier: _identifierController.text.trim(),
          role: _selectedRole,
        );
  }

  Future<void> _forgotPassword() {
    return ref
        .read(authControllerProvider.notifier)
        .requestPasswordReset(identifier: _identifierController.text.trim());
  }

  IconData _iconForRole(UserRole role) {
    return switch (role) {
      UserRole.student => Icons.school_outlined,
      UserRole.parent => Icons.family_restroom_outlined,
      UserRole.teacher => Icons.groups_outlined,
    };
  }
}

enum _LoginMode { password, otp }
