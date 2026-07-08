import 'package:flutter_test/flutter_test.dart';
import 'package:rankup_education/app/api_base_url.dart';

void main() {
  test('resolveApiBaseUrl uses explicit dart define when provided', () {
    expect(
      resolveApiBaseUrl('http://192.168.0.10:5255/api'),
      'http://192.168.0.10:5255/api',
    );
  });

  test('resolveApiBaseUrl trims trailing slash', () {
    expect(
      resolveApiBaseUrl('http://10.0.2.2:5255/api/'),
      'http://10.0.2.2:5255/api',
    );
  });
}
