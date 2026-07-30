import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/core/network/connectivity_service.dart';
import 'package:rankup_education/core/storage/student_device_id_store.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_attempt.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/domain/offline_quiz_sync.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';

/// Outcome of a draft save that may fall back to the offline queue.
enum QuizDraftSaveOutcome { saved, queuedOffline, failed }

/// Quiz list, filter, attempt, and review UI state.
class QuizzesState {
  const QuizzesState({
    this.allQuizzes = const [],
    this.quizzes = const [],
    this.isLoading = false,
    this.isDetailLoading = false,
    this.isAttemptLoading = false,
    this.errorMessage,
    this.actionError,
    this.search = '',
    this.quizType = '',
    this.status = '',
    this.dateFilter = '',
    this.selectedDetail,
    this.activeAttempt,
    this.attemptResult,
    this.pendingOfflineCount = 0,
    this.offlineSubmitQueued = false,
    this.pendingOfflineQuizId,
    this.pendingOfflineAttemptId,
  });

  final List<QuizSummary> allQuizzes;
  final List<QuizSummary> quizzes;
  final bool isLoading;
  final bool isDetailLoading;
  final bool isAttemptLoading;
  final String? errorMessage;
  final String? actionError;
  final String search;
  final String quizType;
  final String status;
  final String dateFilter;
  final QuizDetail? selectedDetail;
  final QuizAttemptSession? activeAttempt;
  final QuizAttemptResult? attemptResult;
  final int pendingOfflineCount;
  final bool offlineSubmitQueued;
  final String? pendingOfflineQuizId;
  final String? pendingOfflineAttemptId;

  QuizzesState copyWith({
    List<QuizSummary>? allQuizzes,
    List<QuizSummary>? quizzes,
    bool? isLoading,
    bool? isDetailLoading,
    bool? isAttemptLoading,
    String? errorMessage,
    String? actionError,
    String? search,
    String? quizType,
    String? status,
    String? dateFilter,
    QuizDetail? selectedDetail,
    QuizAttemptSession? activeAttempt,
    QuizAttemptResult? attemptResult,
    int? pendingOfflineCount,
    bool? offlineSubmitQueued,
    String? pendingOfflineQuizId,
    String? pendingOfflineAttemptId,
    bool clearError = false,
    bool clearActionError = false,
    bool clearAttempt = false,
    bool clearResult = false,
    bool clearPendingOfflineTarget = false,
  }) {
    return QuizzesState(
      allQuizzes: allQuizzes ?? this.allQuizzes,
      quizzes: quizzes ?? this.quizzes,
      isLoading: isLoading ?? this.isLoading,
      isDetailLoading: isDetailLoading ?? this.isDetailLoading,
      isAttemptLoading: isAttemptLoading ?? this.isAttemptLoading,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      actionError: clearActionError ? null : actionError ?? this.actionError,
      search: search ?? this.search,
      quizType: quizType ?? this.quizType,
      status: status ?? this.status,
      dateFilter: dateFilter ?? this.dateFilter,
      selectedDetail: selectedDetail ?? this.selectedDetail,
      activeAttempt: clearAttempt ? null : activeAttempt ?? this.activeAttempt,
      attemptResult: clearResult ? null : attemptResult ?? this.attemptResult,
      pendingOfflineCount: pendingOfflineCount ?? this.pendingOfflineCount,
      offlineSubmitQueued: offlineSubmitQueued ?? this.offlineSubmitQueued,
      pendingOfflineQuizId: clearPendingOfflineTarget
          ? null
          : pendingOfflineQuizId ?? this.pendingOfflineQuizId,
      pendingOfflineAttemptId: clearPendingOfflineTarget
          ? null
          : pendingOfflineAttemptId ?? this.pendingOfflineAttemptId,
    );
  }
}

/// Orchestrates quiz loading, filtering, attempts, and submissions.
class QuizzesController extends StateNotifier<QuizzesState> {
  QuizzesController(
    this._repository,
    this._offlineStore,
    this._connectivity,
    this._deviceIdStore,
  ) : super(const QuizzesState());

  final QuizRepository _repository;
  final OfflineQuizSyncStore _offlineStore;
  final ConnectivityService _connectivity;
  final StudentDeviceIdStore _deviceIdStore;

  Future<String> _resolveDeviceId(String? deviceId) async {
    if (deviceId != null && deviceId.trim().isNotEmpty) {
      return deviceId.trim();
    }
    return _deviceIdStore.getOrCreate();
  }

  /// Loads quiz summaries and applies client-side filters.
  Future<void> load({
    String? search,
    String? quizType,
    String? status,
    String? dateFilter,
  }) async {
    state = state.copyWith(
      isLoading: true,
      search: search,
      quizType: quizType,
      status: status,
      dateFilter: dateFilter,
      clearError: true,
    );

    try {
      final quizzes = await _repository.getQuizzes(search: state.search);
      state = state.copyWith(
        allQuizzes: quizzes,
        quizzes: _applyLocalFilters(
          quizzes,
          search: state.search,
          quizType: state.quizType,
          status: state.status,
          dateFilter: state.dateFilter,
        ),
        isLoading: false,
      );
    } on Exception catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<QuizDetail?> loadDetail(String quizId) async {
    state = state.copyWith(
      isDetailLoading: true,
      clearActionError: true,
      clearAttempt: true,
      clearResult: true,
    );

    try {
      final detail = await _repository.getQuizDetail(quizId);
      state = state.copyWith(selectedDetail: detail, isDetailLoading: false);
      return detail;
    } on Exception catch (error) {
      state = state.copyWith(
        isDetailLoading: false,
        actionError: error.toString(),
      );
      return null;
    }
  }

  Future<QuizAttemptSession?> startAttempt({
    required String quizId,
    required String deviceId,
    bool instructionsAcknowledged = false,
  }) async {
    state = state.copyWith(isAttemptLoading: true, clearActionError: true);

    try {
      final resolvedDeviceId = await _resolveDeviceId(deviceId);
      final attempt = await _repository.startAttempt(
        quizId: quizId,
        deviceId: resolvedDeviceId,
        instructionsAcknowledged: instructionsAcknowledged,
      );
      state = state.copyWith(
        activeAttempt: attempt,
        isAttemptLoading: false,
        clearResult: true,
      );
      return attempt;
    } on Exception catch (error) {
      state = state.copyWith(
        isAttemptLoading: false,
        actionError: error.toString(),
      );
      return null;
    }
  }

  Future<QuizDraftSaveOutcome> saveDraft({
    required String quizId,
    required String attemptId,
    required List<QuizAnswerSubmission> answers,
    int? timeSpentSeconds,
    int? focusLossDelta,
    int? clipboardPasteDelta,
    String? deviceId,
  }) async {
    final resolvedDeviceId = await _resolveDeviceId(deviceId);
    final spent = timeSpentSeconds ?? 0;

    Future<QuizDraftSaveOutcome> enqueueOffline() async {
      await _offlineStore.enqueue(
        quizId: quizId,
        attemptId: attemptId,
        answers: answers,
        timeSpentSeconds: spent,
        deviceId: resolvedDeviceId,
        submit: false,
        focusLossDelta: focusLossDelta,
        clipboardPasteDelta: clipboardPasteDelta,
      );
      await _refreshOfflineCount(quizId: quizId, attemptId: attemptId);
      return QuizDraftSaveOutcome.queuedOffline;
    }

    final online = await _connectivity.hasConnection;
    if (!online) {
      return enqueueOffline();
    }

    try {
      await _repository.saveDraft(
        quizId: quizId,
        attemptId: attemptId,
        answers: answers,
        timeSpentSeconds: timeSpentSeconds,
        focusLossDelta: focusLossDelta,
        clipboardPasteDelta: clipboardPasteDelta,
        deviceId: resolvedDeviceId,
      );
      await _refreshOfflineCount(quizId: quizId, attemptId: attemptId);
      return QuizDraftSaveOutcome.saved;
    } on NetworkException {
      return enqueueOffline();
    } on ValidationException catch (error) {
      state = state.copyWith(actionError: error.message);
      return QuizDraftSaveOutcome.failed;
    } on AppException catch (error) {
      state = state.copyWith(actionError: error.message);
      return QuizDraftSaveOutcome.failed;
    } on Exception catch (error) {
      state = state.copyWith(actionError: error.toString());
      return QuizDraftSaveOutcome.failed;
    }
  }

  Future<QuizAttemptResult?> submitAttempt({
    required String quizId,
    required String attemptId,
    required List<QuizAnswerSubmission> answers,
    required int timeSpentSeconds,
    bool isAutoSubmit = false,
    String? deviceId,
  }) async {
    if (state.offlineSubmitQueued &&
        state.pendingOfflineAttemptId == attemptId) {
      return null;
    }

    state = state.copyWith(isAttemptLoading: true, clearActionError: true);
    final resolvedDeviceId = await _resolveDeviceId(deviceId);

    Future<QuizAttemptResult?> enqueueOfflineSubmit() async {
      await _offlineStore.enqueue(
        quizId: quizId,
        attemptId: attemptId,
        answers: answers,
        timeSpentSeconds: timeSpentSeconds,
        deviceId: resolvedDeviceId,
        submit: true,
        isAutoSubmit: isAutoSubmit,
      );
      await _refreshOfflineCount(quizId: quizId, attemptId: attemptId);
      state = state.copyWith(
        isAttemptLoading: false,
        offlineSubmitQueued: true,
      );
      return null;
    }

    final online = await _connectivity.hasConnection;
    if (!online) {
      return enqueueOfflineSubmit();
    }

    try {
      final flushed =
          await flushOfflineQueue(quizId: quizId, attemptId: attemptId);
      if (flushed != null) {
        await load(
          search: state.search,
          quizType: state.quizType,
          status: state.status,
          dateFilter: state.dateFilter,
        );
        state = state.copyWith(isAttemptLoading: false);
        return flushed;
      }

      final result = await _repository.submitAttempt(
        quizId: quizId,
        attemptId: attemptId,
        answers: answers,
        timeSpentSeconds: timeSpentSeconds,
        isAutoSubmit: isAutoSubmit,
        deviceId: resolvedDeviceId,
      );
      await _offlineStore.clear(attemptId);
      state = state.copyWith(
        attemptResult: result,
        isAttemptLoading: false,
        clearAttempt: true,
        pendingOfflineCount: 0,
        offlineSubmitQueued: false,
        clearPendingOfflineTarget: true,
      );
      await load(
        search: state.search,
        quizType: state.quizType,
        status: state.status,
        dateFilter: state.dateFilter,
      );
      return result;
    } on NetworkException {
      return enqueueOfflineSubmit();
    } on Exception catch (error) {
      state = state.copyWith(
        isAttemptLoading: false,
        actionError: error.toString(),
      );
      return null;
    }
  }

  /// Replays queued draft then submit for [attemptId] via POST .../sync.
  Future<QuizAttemptResult?> flushOfflineQueue({
    required String quizId,
    required String attemptId,
  }) async {
    final pending = await _offlineStore.list(attemptId);
    if (pending.isEmpty) {
      await _refreshOfflineCount(quizId: quizId, attemptId: attemptId);
      return null;
    }

    final online = await _connectivity.hasConnection;
    if (!online) {
      return null;
    }

    final ordered = [
      ...pending.where((item) => !item.submit),
      ...pending.where((item) => item.submit),
    ];

    QuizAttemptResult? submitResult;
    for (final item in ordered) {
      try {
        final syncResult = await _repository.syncOfflineAttempt(
          quizId: item.quizId,
          attemptId: item.attemptId,
          clientSyncId: item.clientSyncId,
          answers: item.answers,
          timeSpentSeconds: item.timeSpentSeconds,
          deviceId: item.deviceId,
          submit: item.submit,
          isAutoSubmit: item.isAutoSubmit,
          focusLossDelta: item.focusLossDelta,
          clipboardPasteDelta: item.clipboardPasteDelta,
        );
        await _offlineStore.remove(attemptId, item.id);
        if (syncResult.submitted && syncResult.result != null) {
          submitResult = syncResult.result;
        }
      } on Exception catch (error) {
        await _refreshOfflineCount(quizId: quizId, attemptId: attemptId);
        state = state.copyWith(actionError: error.toString());
        return null;
      }
    }

    final remaining = await _offlineStore.count(attemptId);
    state = state.copyWith(
      pendingOfflineCount: remaining,
      offlineSubmitQueued: remaining > 0 &&
          (await _offlineStore.list(attemptId)).any((item) => item.submit),
      attemptResult: submitResult ?? state.attemptResult,
      clearAttempt: submitResult != null,
      pendingOfflineQuizId: remaining > 0 ? quizId : null,
      pendingOfflineAttemptId: remaining > 0 ? attemptId : null,
      clearPendingOfflineTarget: remaining == 0,
    );

    if (submitResult != null) {
      await load(
        search: state.search,
        quizType: state.quizType,
        status: state.status,
        dateFilter: state.dateFilter,
      );
    }

    return submitResult;
  }

  /// Flushes any known pending offline target (active attempt or last queued).
  Future<QuizAttemptResult?> flushPendingOfflineQueue() async {
    final attempt = state.activeAttempt;
    final quizId = attempt?.quizId ?? state.pendingOfflineQuizId;
    final attemptId = attempt?.attemptId ?? state.pendingOfflineAttemptId;
    if (quizId == null ||
        quizId.isEmpty ||
        attemptId == null ||
        attemptId.isEmpty) {
      return null;
    }
    return flushOfflineQueue(quizId: quizId, attemptId: attemptId);
  }

  Future<void> refreshOfflineStatus({
    required String quizId,
    required String attemptId,
  }) =>
      _refreshOfflineCount(quizId: quizId, attemptId: attemptId);

  Future<void> _refreshOfflineCount({
    required String quizId,
    required String attemptId,
  }) async {
    final items = await _offlineStore.list(attemptId);
    final count = items.length;
    final hasSubmit = items.any((item) => item.submit);
    state = state.copyWith(
      pendingOfflineCount: count,
      offlineSubmitQueued: hasSubmit,
      pendingOfflineQuizId: count > 0 ? quizId : null,
      pendingOfflineAttemptId: count > 0 ? attemptId : null,
      clearPendingOfflineTarget: count == 0,
    );
  }

  Future<QuizAttemptResult?> loadAttemptResult({
    required String quizId,
    required String attemptId,
  }) async {
    state = state.copyWith(isDetailLoading: true, clearActionError: true);

    try {
      final result = await _repository.getAttemptResult(
        quizId: quizId,
        attemptId: attemptId,
      );
      state = state.copyWith(attemptResult: result, isDetailLoading: false);
      return result;
    } on Exception catch (error) {
      state = state.copyWith(
        isDetailLoading: false,
        actionError: error.toString(),
      );
      return null;
    }
  }

  void clearAttemptState() {
    state = state.copyWith(clearAttempt: true, clearResult: true);
  }
}

List<QuizSummary> _applyLocalFilters(
  List<QuizSummary> quizzes, {
  required String search,
  required String quizType,
  required String status,
  required String dateFilter,
}) {
  final now = DateTime.now();
  final selectedDateFilter = dateFilter.isEmpty ? 'All' : dateFilter;

  return quizzes.where((quiz) {
    final date = quiz.dueAt ?? quiz.startAt ?? now;
    final query = search.trim().toLowerCase();
    final searchableText =
        '${quiz.title} ${quiz.subject} ${quiz.topic}'.toLowerCase();
    final matchesSearch = query.isEmpty || searchableText.contains(query);
    final matchesType = quizType.isEmpty || quiz.quizType.startsWith(quizType);
    final matchesStatus = status.isEmpty || _studentStatus(quiz, now) == status;
    final matchesDate = switch (selectedDateFilter) {
      'Today' => _isSameDay(date, now),
      'Yesterday' => _isSameDay(date, now.subtract(const Duration(days: 1))),
      'Last 7 Days' => _isWithinPastDays(date, now, 7),
      'Last 15 Days' => _isWithinPastDays(date, now, 15),
      _ => true,
    };

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  }).toList();
}

bool _isSameDay(DateTime left, DateTime right) {
  return left.year == right.year &&
      left.month == right.month &&
      left.day == right.day;
}

bool _isWithinPastDays(DateTime date, DateTime now, int days) {
  final startOfToday = DateTime(now.year, now.month, now.day);
  final windowStart = startOfToday.subtract(Duration(days: days - 1));
  final tomorrow = startOfToday.add(const Duration(days: 1));

  return !date.isBefore(windowStart) && date.isBefore(tomorrow);
}

String studentQuizStatus(QuizSummary quiz, [DateTime? currentTime]) {
  return _studentStatus(quiz, currentTime ?? DateTime.now());
}

String _studentStatus(QuizSummary quiz, DateTime now) {
  final normalizedResultStatus =
      quiz.resultStatus.toLowerCase().replaceAll(' ', '');

  if (quiz.resultPercent != null || normalizedResultStatus == 'reviewed') {
    return 'Completed';
  }

  if (quiz.dueAt != null && quiz.dueAt!.isBefore(now)) {
    return 'Expired';
  }

  if (normalizedResultStatus == 'underteacherreview' ||
      normalizedResultStatus == 'aireview' ||
      normalizedResultStatus == 'teacherreview' ||
      normalizedResultStatus == 'pendingteacherreview' ||
      normalizedResultStatus == 'submitted' ||
      normalizedResultStatus == 'autosubmitted') {
    return 'Under Review';
  }

  if (normalizedResultStatus == 'inprogress') {
    return 'InProgress';
  }

  if (quiz.status == QuizStatus.upcoming ||
      (quiz.startAt != null && quiz.startAt!.isAfter(now))) {
    return 'Up Coming';
  }

  return 'Not Attempted';
}
