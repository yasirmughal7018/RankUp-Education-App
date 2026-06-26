import 'package:flutter_riverpod/flutter_riverpod.dart';

enum EnvironmentName { development, test, staging, production }

class AppEnvironment {
  const AppEnvironment({
    required this.name,
    required this.apiBaseUrl,
    required this.signalRUrl,
    required this.enableNetworkLogging,
    required this.enableMockRepositories,
  });

  factory AppEnvironment.fromDartDefines() {
    const env = String.fromEnvironment('APP_ENV', defaultValue: 'development');

    final name = EnvironmentName.values.firstWhere(
      (value) => value.name == env,
      orElse: () => EnvironmentName.development,
    );

    return AppEnvironment(
      name: name,
      apiBaseUrl: const String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'https://api.rankupeducation.local/api',
      ),
      signalRUrl: const String.fromEnvironment(
        'SIGNALR_URL',
        defaultValue: 'https://api.rankupeducation.local/hubs',
      ),
      enableNetworkLogging: name != EnvironmentName.production,
      enableMockRepositories: const bool.fromEnvironment(
        'USE_MOCKS',
        defaultValue: true,
      ),
    );
  }

  final EnvironmentName name;
  final String apiBaseUrl;
  final String signalRUrl;
  final bool enableNetworkLogging;
  final bool enableMockRepositories;
}

final appEnvironmentProvider = Provider<AppEnvironment>(
  (_) => AppEnvironment.fromDartDefines(),
);
