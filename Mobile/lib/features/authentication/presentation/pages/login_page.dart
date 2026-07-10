import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/app/api_base_url.dart';
import 'package:rankup_education/app/environment.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _firstLogin = false;
  String? _localError;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final environment = ref.watch(appEnvironmentProvider);
    final theme = Theme.of(context);
    final showDevApiHint = environment.name == EnvironmentName.development;
    final localhostWarning = usesHostUnreachableLocalhost(environment.apiBaseUrl);
    final authModeLabel = environment.usesApiAuth
        ? 'API login (calls POST /auth/login)'
        : 'Offline demo mode (student/parent/teacher-demo only)';

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
                  if (showDevApiHint) ...[
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: theme.colorScheme.secondaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          '$authModeLabel\n'
                          'Dev API: ${environment.apiBaseUrl}\n'
                          'Start the Web API with: dotnet run --launch-profile http',
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                    ),
                    if (localhostWarning) ...[
                      const SizedBox(height: 12),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          color: theme.colorScheme.errorContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(
                            'This Android emulator cannot reach localhost on your PC. '
                            'Use http://$hostLoopbackAddress:5255/api instead.',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onErrorContainer,
                            ),
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                  ],
                  TextField(
                    controller: _identifierController,
                    decoration: const InputDecoration(
                      labelText: 'CNIC or mobile number',
                      prefixIcon: Icon(Icons.badge_outlined),
                    ),
                    autocorrect: false,
                    enableSuggestions: false,
                    enabled: true,
                    keyboardType: TextInputType.text,
                    showCursor: true,
                    textInputAction: TextInputAction.next,
                    onTap: _showSoftKeyboard,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: _firstLogin ? 'New password' : 'Password',
                      helperText: _firstLogin
                          ? 'At least 6 characters'
                          : null,
                      prefixIcon: const Icon(Icons.lock_outline),
                    ),
                    autocorrect: false,
                    enableSuggestions: false,
                    enabled: true,
                    keyboardType: TextInputType.visiblePassword,
                    showCursor: true,
                    textInputAction: _firstLogin
                        ? TextInputAction.next
                        : TextInputAction.done,
                    onTap: _showSoftKeyboard,
                    onSubmitted: (_) {
                      if (!_firstLogin && !authState.isLoading) {
                        _submit();
                      }
                    },
                  ),
                  if (_firstLogin) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: _confirmPasswordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Confirm password',
                        prefixIcon: Icon(Icons.lock_outline),
                      ),
                      autocorrect: false,
                      enableSuggestions: false,
                      keyboardType: TextInputType.visiblePassword,
                      showCursor: true,
                      textInputAction: TextInputAction.done,
                      onTap: _showSoftKeyboard,
                      onSubmitted: (_) {
                        if (!authState.isLoading) {
                          _submit();
                        }
                      },
                    ),
                  ],
                  const SizedBox(height: 8),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: _firstLogin,
                    onChanged: authState.isLoading
                        ? null
                        : (value) {
                            setState(() {
                              _firstLogin = value ?? false;
                              _localError = null;
                              _passwordController.clear();
                              _confirmPasswordController.clear();
                            });
                          },
                    title: const Text(
                      'First login after approval — set my password',
                    ),
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                  if (_localError != null || authState.errorMessage != null) ...[
                    const SizedBox(height: 12),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: (_localError ?? authState.errorMessage!)
                                .toLowerCase()
                                .contains('not approved')
                            ? theme.colorScheme.tertiaryContainer
                            : theme.colorScheme.errorContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          _localError ?? authState.errorMessage!,
                          style: TextStyle(
                            color: (_localError ?? authState.errorMessage!)
                                    .toLowerCase()
                                    .contains('not approved')
                                ? theme.colorScheme.onTertiaryContainer
                                : theme.colorScheme.onErrorContainer,
                          ),
                        ),
                      ),
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
                        : Icon(_firstLogin ? Icons.lock_open : Icons.login),
                    label: Text(
                      _firstLogin ? 'Set password and sign in' : 'Login',
                    ),
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
                              'Request access first. After School Admin or Portal '
                              'Admin approves, check “First login after approval” '
                              'and set your own password to sign in.',
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

  Future<void> _submit() async {
    setState(() => _localError = null);

    final identifier = _identifierController.text.trim();
    if (identifier.isEmpty) {
      setState(() => _localError = 'CNIC or mobile number is required.');
      return;
    }

    if (_firstLogin) {
      final newPassword = _passwordController.text;
      if (newPassword.length < 6) {
        setState(() => _localError = 'Password must be at least 6 characters.');
        return;
      }
      if (newPassword != _confirmPasswordController.text) {
        setState(
          () => _localError = 'Password and confirmation do not match.',
        );
        return;
      }

      try {
        await ref.read(authControllerProvider.notifier).setInitialPassword(
              identifier: identifier,
              newPassword: newPassword,
            );
      } catch (_) {
        // Error is shown via authState.errorMessage.
      }
      return;
    }

    await ref.read(authControllerProvider.notifier).login(
          identifier: identifier,
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
          rollNumberTeacherCode: request.rollNumberTeacherCode,
          reasonMessage: request.reasonMessage,
          cnic: request.cnic,
          schoolId: request.schoolId,
          campusId: request.campusId,
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
                  labelText: 'CNIC or mobile number',
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

class _AccountAccessRequestSheet extends ConsumerStatefulWidget {
  const _AccountAccessRequestSheet();

  @override
  ConsumerState<_AccountAccessRequestSheet> createState() {
    return _AccountAccessRequestSheetState();
  }
}

class _AccountAccessRequestSheetState
    extends ConsumerState<_AccountAccessRequestSheet> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _mobileNumberController = TextEditingController();
  final _emailAddressController = TextEditingController();
  final _cnicController = TextEditingController();
  final _rollNumberTeacherCodeController = TextEditingController();
  final _reasonMessageController = TextEditingController();

  String _userType = 'Student';
  int? _schoolId;
  int? _campusId;
  List<({int id, String name})> _schools = const [];
  List<({int id, String name})> _campuses = const [];
  bool _loadingSchools = true;
  bool _loadingCampuses = false;
  String? _optionsError;

  @override
  void initState() {
    super.initState();
    _loadSchools();
  }

  Future<void> _loadSchools() async {
    setState(() {
      _loadingSchools = true;
      _optionsError = null;
    });
    try {
      final schools =
          await ref.read(authRepositoryProvider).listRegistrationSchools();
      if (!mounted) {
        return;
      }
      setState(() {
        _schools = schools;
        _loadingSchools = false;
      });
    } on Exception catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingSchools = false;
        _optionsError = error.toString();
      });
    }
  }

  Future<void> _loadCampuses(int schoolId) async {
    setState(() {
      _loadingCampuses = true;
      _campuses = const [];
      _campusId = null;
      _optionsError = null;
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
        _loadingCampuses = false;
      });
    } on Exception catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingCampuses = false;
        _optionsError = error.toString();
      });
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _mobileNumberController.dispose();
    _emailAddressController.dispose();
    _cnicController.dispose();
    _rollNumberTeacherCodeController.dispose();
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
                'Leave School empty to send the request to Portal Admin. '
                'If you select a School, both School Admin and Portal Admin '
                'can approve it.',
              ),
              if (_optionsError != null) ...[
                const SizedBox(height: 12),
                Text(
                  _optionsError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
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
                controller: _cnicController,
                decoration: const InputDecoration(
                  labelText: 'CNIC (Optional, unique)',
                  prefixIcon: Icon(Icons.credit_card_outlined),
                ),
                keyboardType: TextInputType.number,
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
              DropdownButtonFormField<int?>(
                key: ValueKey('school-$_schoolId-${_schools.length}'),
                initialValue: _schoolId,
                decoration: InputDecoration(
                  labelText: _loadingSchools
                      ? 'School (loading...)'
                      : 'School',
                  prefixIcon: const Icon(Icons.school_outlined),
                  helperText:
                      'Empty → Portal Admin only. Selected → School Admin + Portal Admin.',
                ),
                items: [
                  const DropdownMenuItem<int?>(
                    child: Text('No school (Portal Admin)'),
                  ),
                  ..._schools.map(
                    (school) => DropdownMenuItem<int?>(
                      value: school.id,
                      child: Text(school.name),
                    ),
                  ),
                ],
                onChanged: _loadingSchools
                    ? null
                    : (value) {
                        setState(() {
                          _schoolId = value;
                          _campusId = null;
                          _campuses = const [];
                        });
                        if (value != null) {
                          _loadCampuses(value);
                        }
                      },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int?>(
                key: ValueKey(
                  'campus-$_schoolId-$_campusId-${_campuses.length}',
                ),
                initialValue: _campusId,
                decoration: InputDecoration(
                  labelText: _loadingCampuses
                      ? 'Campus (loading...)'
                      : 'Campus',
                  prefixIcon: const Icon(Icons.location_city_outlined),
                ),
                items: [
                  DropdownMenuItem<int?>(
                    child: Text(
                      _schoolId == null
                          ? 'Select a school first'
                          : 'No campus',
                    ),
                  ),
                  ..._campuses.map(
                    (campus) => DropdownMenuItem<int?>(
                      value: campus.id,
                      child: Text(campus.name),
                    ),
                  ),
                ],
                onChanged: _schoolId == null || _loadingCampuses
                    ? null
                    : (value) => setState(() => _campusId = value),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _rollNumberTeacherCodeController,
                decoration: const InputDecoration(
                  labelText: 'Roll number / teacher code (Optional)',
                  prefixIcon: Icon(Icons.badge_outlined),
                ),
                textInputAction: TextInputAction.next,
                onTap: _showSoftKeyboard,
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
        rollNumberTeacherCode: _rollNumberTeacherCodeController.text.trim(),
        reasonMessage: _reasonMessageController.text.trim(),
        cnic: _cnicController.text.trim(),
        schoolId: _schoolId,
        campusId: _schoolId == null ? null : _campusId,
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
    required this.rollNumberTeacherCode,
    required this.reasonMessage,
    this.cnic,
    this.schoolId,
    this.campusId,
  });

  final String fullName;
  final String mobileNumber;
  final String emailAddress;
  final String userType;
  final String rollNumberTeacherCode;
  final String reasonMessage;
  final String? cnic;
  final int? schoolId;
  final int? campusId;
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
