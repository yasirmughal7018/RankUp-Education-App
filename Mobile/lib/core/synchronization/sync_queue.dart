enum SyncStatus { pending, syncing, synced, failed }

class SyncQueueItem {
  const SyncQueueItem({
    required this.localId,
    required this.operation,
    required this.createdAt,
    this.status = SyncStatus.pending,
  });

  final String localId;
  final String operation;
  final DateTime createdAt;
  final SyncStatus status;
}
