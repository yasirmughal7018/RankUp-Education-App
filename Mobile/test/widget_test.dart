import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/app/app.dart';
import 'package:rankup_education/app/environment.dart';

void main() {
  testWidgets('shows RankUp login screen', (tester) async {
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
        ],
        child: const RankUpEducationApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('RankUp Education'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
  });
}
