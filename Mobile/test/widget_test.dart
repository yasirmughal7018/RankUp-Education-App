import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rankup_education/app/app.dart';
import 'package:rankup_education/app/environment.dart';
import 'package:rankup_education/features/authentication/domain/entities/app_user.dart';
import 'package:rankup_education/features/authentication/domain/entities/auth_session.dart';
import 'package:rankup_education/features/authentication/domain/repositories/auth_repository.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';

void main() {
  testWidgets('shows RankUp login screen', (tester) async {
    await _pumpLoginApp(tester);

    expect(find.text('RankUp Education'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
  });

  testWidgets('login text fields are editable', (tester) async {
    await _pumpLoginApp(tester);

    await tester.enterText(
      find.widgetWithText(TextField, 'CNIC or mobile number'),
      'teacher-demo',
    );
    await tester.pump();

    expect(find.text('teacher-demo'), findsOneWidget);
  });

  testWidgets('password reset field is editable', (tester) async {
    await _pumpLoginApp(tester);

    await tester.tap(find.text('Forgot password?'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Username or ID'),
      'parent-demo',
    );
    await tester.pump();

    expect(find.text('parent-demo'), findsOneWidget);
  });

  testWidgets('account request fields are editable', (tester) async {
    await _pumpLoginApp(tester);

    await tester.ensureVisible(find.text('Request account access'));
    await tester.tap(find.text('Request account access'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Full Name *'),
      'Teacher Demo',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Mobile Number *'),
      '+923001234567',
    );
    await tester.pump();

    expect(find.text('Teacher Demo'), findsOneWidget);
    expect(find.text('+923001234567'), findsOneWidget);
  });
}

class _FakeAuthRepository implements AuthRepository {
  @override
  Future<AuthSession> login({
    required String identifier,
    required String password,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> setInitialPassword({
    required String identifier,
    required String newPassword,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<({String status, String message})> getLoginStatus({
    required String identifier,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> requestPasswordReset({required String identifier}) async {}

  @override
  Future<void> requestAccountAccess({
    required String fullName,
    required String mobileNumber,
    required String emailAddress,
    required String userType,
    required String rollNumberTeacherCode,
    required String reasonMessage,
    String? cnic,
    int? schoolId,
    int? campusId,
  }) async {}

  @override
  Future<List<({int id, String name})>> listRegistrationSchools() async {
    return const [];
  }

  @override
  Future<List<({int id, String name})>> listRegistrationCampuses(
    int schoolId,
  ) async {
    return const [];
  }

  @override
  Future<AppUser> changePassword({
    required String newPassword,
    String? currentPassword,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> logout() async {}

  @override
  Future<AuthSession> refreshSession() {
    throw UnimplementedError();
  }

  @override
  Future<AuthSession?> restoreSession() async {
    return null;
  }
}

Future<void> _pumpLoginApp(WidgetTester tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        appEnvironmentProvider.overrideWithValue(
          const AppEnvironment(
            name: EnvironmentName.test,
            apiBaseUrl: 'https://api.test',
            signalRUrl: 'https://signalr.test',
            enableNetworkLogging: false,
            enableMockRepositories: true,
          ),
        ),
        authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
      ],
      child: const RankUpEducationApp(),
    ),
  );

  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 500));
  }
}
