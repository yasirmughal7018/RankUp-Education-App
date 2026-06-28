import 'package:flutter_test/flutter_test.dart';
import 'package:rankup_education/core/storage/token_store.dart';
import 'package:rankup_education/features/authentication/data/repositories/mock_auth_repository.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';

void main() {
  group('MockAuthRepository', () {
    late MockAuthRepository repository;

    setUp(() {
      repository = MockAuthRepository(_MemoryTokenStore());
    });

    test('logs in the student demo account', () async {
      final session = await repository.login(
        identifier: 'student-demo',
        password: 'password',
      );

      expect(session.user.role, UserRole.student);
    });

    test('logs in the parent demo account', () async {
      final session = await repository.login(
        identifier: 'parent-demo',
        password: 'password',
      );

      expect(session.user.role, UserRole.parent);
    });

    test('logs in the teacher demo account', () async {
      final session = await repository.login(
        identifier: 'teacher-demo',
        password: 'password',
      );

      expect(session.user.role, UserRole.teacher);
    });

    test('rejects invalid demo credentials', () {
      expect(
        () => repository.login(identifier: 'student-demo', password: 'wrong'),
        throwsFormatException,
      );
    });
  });
}

class _MemoryTokenStore implements TokenStore {
  String? _accessToken;
  String? _refreshToken;

  @override
  Future<String?> readAccessToken() async => _accessToken;

  @override
  Future<String?> readRefreshToken() async => _refreshToken;

  @override
  Future<bool> get hasTokens async {
    return (_accessToken?.isNotEmpty ?? false) &&
        (_refreshToken?.isNotEmpty ?? false);
  }

  @override
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  @override
  Future<void> clear() async {
    _accessToken = null;
    _refreshToken = null;
  }
}
