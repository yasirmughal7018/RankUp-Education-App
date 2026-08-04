/// In-app notification item from stub API.
class NotificationItem {
  const NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.category,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      category: json['category'] as String? ?? '',
      isRead: json['isRead'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final int id;
  final String title;
  final String body;
  final String category;
  final bool isRead;
  final DateTime createdAt;
}

/// Single attendance mark for the signed-in student.
class AttendanceRecord {
  const AttendanceRecord({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.date,
    required this.status,
    this.notes,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: (json['id'] as num).toInt(),
      studentId: (json['studentId'] as num).toInt(),
      studentName: json['studentName'] as String? ?? '',
      date: json['date'] as String? ?? '',
      status: json['status'] as String? ?? '',
      notes: json['notes'] as String?,
    );
  }

  final int id;
  final int studentId;
  final String studentName;
  final String date;
  final String status;
  final String? notes;
}

/// Message inbox thread summary.
class MessageThread {
  const MessageThread({
    required this.id,
    required this.subject,
    required this.lastPreview,
    required this.unreadCount,
    this.lastMessageAt,
  });

  factory MessageThread.fromJson(Map<String, dynamic> json) {
    return MessageThread(
      id: (json['id'] as num).toInt(),
      subject: json['subject'] as String? ?? '',
      lastPreview: json['lastPreview'] as String? ?? '',
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
      lastMessageAt: DateTime.tryParse(json['lastMessageAt'] as String? ?? ''),
    );
  }

  final int id;
  final String subject;
  final String lastPreview;
  final int unreadCount;
  final DateTime? lastMessageAt;
}

/// Points balance plus earned reward items.
class RewardSummary {
  const RewardSummary({
    required this.totalPoints,
    required this.items,
  });

  factory RewardSummary.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? const [];
    return RewardSummary(
      totalPoints: (json['totalPoints'] as num?)?.toInt() ?? 0,
      items: rawItems
          .whereType<Map<String, dynamic>>()
          .map(RewardItem.fromJson)
          .toList(),
    );
  }

  final int totalPoints;
  final List<RewardItem> items;
}

/// Individual reward or badge entry.
class RewardItem {
  const RewardItem({
    required this.id,
    required this.title,
    required this.description,
    required this.points,
    this.earnedAt,
  });

  factory RewardItem.fromJson(Map<String, dynamic> json) {
    return RewardItem(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      points: (json['points'] as num?)?.toInt() ?? 0,
      earnedAt: DateTime.tryParse(json['earnedAt'] as String? ?? ''),
    );
  }

  final int id;
  final String title;
  final String description;
  final int points;
  final DateTime? earnedAt;
}

/// Competition listing item.
class CompetitionItem {
  const CompetitionItem({
    required this.id,
    required this.title,
    required this.status,
    this.startsAt,
    this.endsAt,
  });

  factory CompetitionItem.fromJson(Map<String, dynamic> json) {
    return CompetitionItem(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? '',
      status: json['status'] as String? ?? '',
      startsAt: DateTime.tryParse(json['startsAt'] as String? ?? ''),
      endsAt: DateTime.tryParse(json['endsAt'] as String? ?? ''),
    );
  }

  final int id;
  final String title;
  final String status;
  final DateTime? startsAt;
  final DateTime? endsAt;
}

/// Worksheet assignment summary.
class WorksheetItem {
  const WorksheetItem({
    required this.id,
    required this.title,
    required this.subject,
    required this.status,
    this.dueAt,
  });

  factory WorksheetItem.fromJson(Map<String, dynamic> json) {
    return WorksheetItem(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      status: json['status'] as String? ?? '',
      dueAt: DateTime.tryParse(json['dueAt'] as String? ?? ''),
    );
  }

  final int id;
  final String title;
  final String subject;
  final String status;
  final DateTime? dueAt;
}
