import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/app/app.dart';
import 'package:rankup_education/app/environment.dart';

/// Application entry point; bootstraps environment overrides and runs the app.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final environment = AppEnvironment.fromDartDefines();

  runApp(
    ProviderScope(
      overrides: [appEnvironmentProvider.overrideWithValue(environment)],
      child: const RankUpEducationApp(),
    ),
  );
}
