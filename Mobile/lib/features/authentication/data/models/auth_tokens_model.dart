class AuthTokensModel {
  const AuthTokensModel({
    required this.accessToken,
    required this.refreshToken,
  });

  factory AuthTokensModel.fromJson(Map<String, dynamic> json) {
    return AuthTokensModel(
      accessToken: _readToken(json, ['accessToken', 'token', 'jwt']),
      refreshToken: _readToken(json, ['refreshToken']),
    );
  }

  final String accessToken;
  final String refreshToken;
}

String _readToken(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.isNotEmpty) {
      return value;
    }
  }

  return '';
}
