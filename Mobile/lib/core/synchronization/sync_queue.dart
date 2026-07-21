import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Riverpod provider for the in-memory offline sync queue.
final syncQueueProvider = Provider<SyncQueue>((ref) {
  return SyncQueue();
});

enum SyncStatus { pending, syncing, synced, failed }

/// Single queued write-behind operation awaiting replay.
class SyncQueueItem {
  const SyncQueueItem({
    required this.localId,
    required this.operation,
    required this.payload,
    required this.createdAt,
    this.status = SyncStatus.pending,
  });

  final String localId;
  final String operation;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final SyncStatus status;

  SyncQueueItem copyWith({SyncStatus? status}) {
    return SyncQueueItem(
      localId: localId,
      operation: operation,
      payload: payload,
      createdAt: createdAt,
      status: status ?? this.status,
    );
  }
}

/// In-memory offline sync queue placeholder.
///
/// Quiz answer drafts and other write-behind work should enqueue here when
/// offline, then [processPending] when connectivity returns. Persistence
/// (Hive/SQLite) and real API replay are not implemented yet.
class SyncQueue {
  final List<SyncQueueItem> _items = [];

  List<SyncQueueItem> get pending =>
      _items.where((item) => item.status == SyncStatus.pending).toList();

  int get pendingCount => pending.length;

  void enqueue({
    required String localId,
    required String operation,
    required Map<String, dynamic> payload,
  }) {
    _items.add(
      SyncQueueItem(
        localId: localId,
        operation: operation,
        payload: payload,
        createdAt: DateTime.now().toUtc(),
      ),
    );
    if (kDebugMode) {
      debugPrint('SyncQueue.enqueue $operation ($localId)');
    }
  }

  Future<int> processPending() async {
    final toProcess = pending;
    if (toProcess.isEmpty) {
      return 0;
    }
    // TODO(rankup): replay each operation against Dio when online.
    for (var i = 0; i < _items.length; i++) {
      if (_items[i].status == SyncStatus.pending) {
        _items[i] = _items[i].copyWith(status: SyncStatus.synced);
      }
    }
    if (kDebugMode) {
      debugPrint('SyncQueue.processPending marked ${toProcess.length} synced (placeholder)');
    }
    return toProcess.length;
  }

  void clear() => _items.clear();
}
