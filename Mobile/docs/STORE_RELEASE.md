# Android and iOS Release Notes

## Android

Before Play Store release:

- Set the final package name under `android/app/build.gradle.kts`.
- Add production app icons and adaptive icons.
- Configure signing in `android/key.properties`.
- Build with `flutter build appbundle --release`.
- Test the generated `.aab` through internal testing.

## iOS

Before App Store release:

- Open `ios/Runner.xcworkspace` in Xcode.
- Set bundle identifier, team, signing, display name, and app icons.
- Configure push notifications and associated capabilities.
- Build with `flutter build ipa --release`.
- Upload through Xcode Organizer or Transporter.

## Shared Release Checks

- Use `--dart-define=APP_ENV=production`.
- Use the production API URL and SignalR URL.
- Keep mocks off for release builds (`USE_MOCKS` defaults to `false`; do not pass `USE_MOCKS=true`).
- Verify privacy policy, child-safety rules, and data-sharing flows.
- Run unit, widget, integration, Android, and iOS smoke tests.
