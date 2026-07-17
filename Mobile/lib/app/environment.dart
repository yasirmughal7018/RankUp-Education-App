import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/app/api_base_url.dart';

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
    const apiFromDefine = String.fromEnvironment('API_BASE_URL');

    final name = EnvironmentName.values.firstWhere(
      (value) => value.name == env,
      orElse: () => EnvironmentName.development,
    );

    return AppEnvironment(
      name: name,
      apiBaseUrl: resolveApiBaseUrl(apiFromDefine),
      signalRUrl: const String.fromEnvironment(
        'SIGNALR_URL',
        defaultValue: 'https://api.rankupeducation.local/hubs',
      ),
      enableNetworkLogging: name != EnvironmentName.production,
      enableMockRepositories: const bool.fromEnvironment(
        'USE_MOCKS',
      ),
    );
  }

  final EnvironmentName name;
  final String apiBaseUrl;
  final String signalRUrl;
  final bool enableNetworkLogging;
  final bool enableMockRepositories;

  bool get usesApiAuth => !enableMockRepositories;
}

final appEnvironmentProvider = Provider<AppEnvironment>(
  (_) => AppEnvironment.fromDartDefines(),
);
