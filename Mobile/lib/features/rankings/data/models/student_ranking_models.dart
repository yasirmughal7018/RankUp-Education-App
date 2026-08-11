/// Student peer rankings from `GET /reports/rankings/me`.
class StudentRankingReportModel {
  const StudentRankingReportModel({
    required this.scope,
    required this.quizId,
    required this.title,
    required this.viewerStudentId,
    required this.myRank,
    required this.myBestPercentage,
    required this.myAttemptCount,
    required this.items,
  });

  factory StudentRankingReportModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    final items = rawItems is List
        ? rawItems
            .whereType<Map<String, dynamic>>()
            .map(RankingItemModel.fromJson)
            .toList()
        : const <RankingItemModel>[];

    return StudentRankingReportModel(
      scope: _readString(json, ['scope'], fallback: 'class'),
      quizId: _readNullableInt(json, ['quizId']),
      title: _readString(json, ['title'], fallback: 'Rankings'),
      viewerStudentId: _readInt(json, ['viewerStudentId']),
      myRank: _readNullableInt(json, ['myRank']),
      myBestPercentage: _readNullableInt(json, ['myBestPercentage']),
      myAttemptCount: _readInt(json, ['myAttemptCount']),
      items: items,
    );
  }

  final String scope;
  final int? quizId;
  final String title;
  final int viewerStudentId;
  final int? myRank;
  final int? myBestPercentage;
  final int myAttemptCount;
  final List<RankingItemModel> items;
}

/// One leaderboard row.
class RankingItemModel {
  const RankingItemModel({
    required this.rank,
    required this.studentId,
    required this.studentName,
    required this.bestPercentage,
    required this.attemptCount,
  });

  factory RankingItemModel.fromJson(Map<String, dynamic> json) {
    return RankingItemModel(
      rank: _readInt(json, ['rank']),
      studentId: _readInt(json, ['studentId']),
      studentName: _readString(json, ['studentName'], fallback: 'Student'),
      bestPercentage: _readInt(json, ['bestPercentage']),
      attemptCount: _readInt(json, ['attemptCount']),
    );
  }

  final int rank;
  final int studentId;
  final String studentName;
  final int bestPercentage;
  final int attemptCount;
}

String _readString(
  Map<String, dynamic> json,
  List<String> keys, {
  String fallback = '',
}) {
  for (final key in keys) {
    final value = json[key];
    if (value == null) {
      continue;
    }
    final text = value.toString().trim();
    if (text.isNotEmpty) {
      return text;
    }
  }
  return fallback;
}

int _readInt(Map<String, dynamic> json, List<String> keys) {
  return _readNullableInt(json, keys) ?? 0;
}

int? _readNullableInt(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    if (value is String) {
      return int.tryParse(value.trim());
    }
  }
  return null;
}
