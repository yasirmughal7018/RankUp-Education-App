import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();

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
                    'Students, parents and teachers in one learning system.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 32),
                  TextField(
                    controller: _identifierController,
                    decoration: const InputDecoration(
                      labelText: 'Username or ID',
                      prefixIcon: Icon(Icons.badge_outlined),
                    ),
                    autocorrect: false,
                    enableSuggestions: false,
                    enabled: true,
                    keyboardType: TextInputType.text,
                    readOnly: false,
                    showCursor: true,
                    textCapitalization: TextCapitalization.none,
                    textInputAction: TextInputAction.next,
                    onTap: _showSoftKeyboard,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                    autocorrect: false,
                    enableSuggestions: false,
                    enabled: true,
                    keyboardType: TextInputType.visiblePassword,
                    readOnly: false,
                    showCursor: true,
                    textInputAction: TextInputAction.done,
                    onTap: _showSoftKeyboard,
                    onSubmitted: (_) {
                      if (!authState.isLoading) {
                        _submit();
                      }
                    },
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
                    label: const Text('Login'),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: authState.isLoading ? null : _openPasswordReset,
                    icon: const Icon(Icons.lock_reset),
                    label: const Text('Forgot password?'),
                  ),
                  OutlinedButton.icon(
                    onPressed: authState.isLoading ? null : _openAccessRequest,
                    icon: const Icon(Icons.person_add_alt_1_outlined),
                    label: const Text('Request account access'),
                  ),
                  const SizedBox(height: 16),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Padding(
                      padding: EdgeInsets.all(12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.admin_panel_settings_outlined),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Accounts are created by the school admin. '
                              'Contact your admin if you need access or a '
                              'password reset.',
                            ),
                          ),
                        ],
                      ),
                    ),
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
    return ref.read(authControllerProvider.notifier).login(
          identifier: _identifierController.text.trim(),
          password: _passwordController.text,
        );
  }

  Future<void> _openPasswordReset() async {
    final identifier = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return _PasswordResetSheet(
          initialIdentifier: _identifierController.text.trim(),
        );
      },
    );

    if (identifier == null || identifier.isEmpty || !mounted) {
      return;
    }

    await ref
        .read(authControllerProvider.notifier)
        .requestPasswordReset(identifier: identifier);
  }

  Future<void> _openAccessRequest() async {
    final request = await showModalBottomSheet<_AccountAccessRequest>(
      context: context,
      isScrollControlled: true,
      builder: (context) => const _AccountAccessRequestSheet(),
    );

    if (request == null || !mounted) {
      return;
    }

    await ref.read(authControllerProvider.notifier).requestAccountAccess(
          fullName: request.fullName,
          mobileNumber: request.mobileNumber,
          emailAddress: request.emailAddress,
          userType: request.userType,
          schoolCampusName: request.schoolCampusName,
          studentOrEmployeeId: request.studentOrEmployeeId,
          adminTarget: request.adminTarget,
          reasonMessage: request.reasonMessage,
        );
  }
}

class _PasswordResetSheet extends StatefulWidget {
  const _PasswordResetSheet({required this.initialIdentifier});

  final String initialIdentifier;

  @override
  State<_PasswordResetSheet> createState() => _PasswordResetSheetState();
}

class _PasswordResetSheetState extends State<_PasswordResetSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _identifierController;

  @override
  void initState() {
    super.initState();
    _identifierController = TextEditingController(
      text: widget.initialIdentifier,
    );
  }

  @override
  void dispose() {
    _identifierController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(24, 24, 24, bottomInset + 24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Password reset',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              const Text(
                'Send a reset request to the admin who manages your account.',
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _identifierController,
                decoration: const InputDecoration(
                  labelText: 'Username or ID',
                  prefixIcon: Icon(Icons.badge_outlined),
                ),
                validator: _required,
                textInputAction: TextInputAction.done,
                onTap: _showSoftKeyboard,
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _submit,
                icon: const Icon(Icons.send_outlined),
                label: const Text('Send reset request'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _submit() {
    if (_formKey.currentState?.validate() != true) {
      return;
    }

    Navigator.of(context).pop(_identifierController.text.trim());
  }
}

class _AccountAccessRequestSheet extends StatefulWidget {
  const _AccountAccessRequestSheet();

  @override
  State<_AccountAccessRequestSheet> createState() {
    return _AccountAccessRequestSheetState();
  }
}

class _AccountAccessRequestSheetState
    extends State<_AccountAccessRequestSheet> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _mobileNumberController = TextEditingController();
  final _emailAddressController = TextEditingController();
  final _schoolCampusController = TextEditingController();
  final _studentOrEmployeeIdController = TextEditingController();
  final _reasonMessageController = TextEditingController();

  String _userType = 'Student';
  String _adminTarget = 'School Admin';

  @override
  void dispose() {
    _fullNameController.dispose();
    _mobileNumberController.dispose();
    _emailAddressController.dispose();
    _schoolCampusController.dispose();
    _studentOrEmployeeIdController.dispose();
    _reasonMessageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(24, 24, 24, bottomInset + 24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Request account access',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              const Text(
                'This sends a request to an admin. It does not create an '
                'account automatically.',
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _fullNameController,
                decoration: const InputDecoration(
                  labelText: 'Full Name *',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: _required,
                textInputAction: TextInputAction.next,
                onTap: _showSoftKeyboard,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _mobileNumberController,
                decoration: const InputDecoration(
                  labelText: 'Mobile Number *',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
                keyboardType: TextInputType.phone,
                validator: _required,
                textInputAction: TextInputAction.next,
                onTap: _showSoftKeyboard,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailAddressController,
                decoration: const InputDecoration(
                  labelText: 'Email Address (Optional)',
                  prefixIcon: Icon(Icons.alternate_email),
                ),
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                onTap: _showSoftKeyboard,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _userType,
                decoration: const InputDecoration(
                  labelText: 'User Type *',
                  prefixIcon: Icon(Icons.group_outlined),
                ),
                items: const [
                  DropdownMenuItem(value: 'Student', child: Text('Student')),
                  DropdownMenuItem(value: 'Parent', child: Text('Parent')),
                  DropdownMenuItem(value: 'Teacher', child: Text('Teacher')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _userType = value);
                  }
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _schoolCampusController,
                decoration: const InputDecoration(
                  labelText: 'School / Campus Name (Optional)',
                  prefixIcon: Icon(Icons.school_outlined),
                ),
                textInputAction: TextInputAction.next,
                onTap: _showSoftKeyboard,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _studentOrEmployeeIdController,
                decoration: const InputDecoration(
                  labelText: 'Student ID / Employee ID (Optional)',
                  prefixIcon: Icon(Icons.badge_outlined),
                ),
                textInputAction: TextInputAction.next,
                onTap: _showSoftKeyboard,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _adminTarget,
                decoration: const InputDecoration(
                  labelText: 'Send Request to *',
                  prefixIcon: Icon(Icons.admin_panel_settings_outlined),
                ),
                items: const [
                  DropdownMenuItem(
                    value: 'School Admin',
                    child: Text('School Admin'),
                  ),
                  DropdownMenuItem(
                    value: 'Portal Admin',
                    child: Text('Portal Admin'),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _adminTarget = value);
                  }
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _reasonMessageController,
                decoration: const InputDecoration(
                  labelText: 'Reason / Message (Optional)',
                  prefixIcon: Icon(Icons.notes_outlined),
                ),
                minLines: 2,
                maxLines: 4,
                onTap: _showSoftKeyboard,
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _submit,
                icon: const Icon(Icons.send_outlined),
                label: const Text('Send account request'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _submit() {
    if (_formKey.currentState?.validate() != true) {
      return;
    }

    Navigator.of(context).pop(
      _AccountAccessRequest(
        fullName: _fullNameController.text.trim(),
        mobileNumber: _mobileNumberController.text.trim(),
        emailAddress: _emailAddressController.text.trim(),
        userType: _userType,
        schoolCampusName: _schoolCampusController.text.trim(),
        studentOrEmployeeId: _studentOrEmployeeIdController.text.trim(),
        adminTarget: _adminTarget,
        reasonMessage: _reasonMessageController.text.trim(),
      ),
    );
  }
}

class _AccountAccessRequest {
  const _AccountAccessRequest({
    required this.fullName,
    required this.mobileNumber,
    required this.emailAddress,
    required this.userType,
    required this.schoolCampusName,
    required this.studentOrEmployeeId,
    required this.adminTarget,
    required this.reasonMessage,
  });

  final String fullName;
  final String mobileNumber;
  final String emailAddress;
  final String userType;
  final String schoolCampusName;
  final String studentOrEmployeeId;
  final String adminTarget;
  final String reasonMessage;
}

String? _required(String? value) {
  if (value == null || value.trim().isEmpty) {
    return 'Required';
  }

  return null;
}

void _showSoftKeyboard() {
  Future<void>.delayed(const Duration(milliseconds: 50), () {
    SystemChannels.textInput.invokeMethod<void>('TextInput.show');
  });
}
