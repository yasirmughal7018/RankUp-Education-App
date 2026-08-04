import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/core/network/connectivity_service.dart';
import 'package:rankup_education/core/storage/student_device_id_store.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_manage_models.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_attempt.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/domain/quiz_navigation.dart';
import 'package:rankup_education/features/quizzes/domain/repositories/quiz_repository.dart';
import 'package:rankup_education/features/quizzes/presentation/controllers/quizzes_controller.dart';
import 'package:rankup_education/features/quizzes/presentation/pages/teacher_quiz_views.dart';
import 'package:rankup_education/features/quizzes/presentation/providers/quiz_providers.dart';
import 'package:rankup_education/features/reports/data/models/student_quiz_history_models.dart';
import 'package:rankup_education/features/reports/presentation/providers/report_providers.dart';

/// Matches web `useQuizAttemptAutosave` debounce / interval.
const _draftChangeDebounce = Duration(milliseconds: 1200);
const _draftInterval = Duration(seconds: 15);

enum _QuizView {
  list,
  details,
  attempt,
  submitted,
  review,
  history,
  create,
  manage,
  pendingReviews,
  teacherReview,
}

/// Multi-step student quiz hub: list, attempt, submit, and review.
class QuizzesPage extends ConsumerStatefulWidget {
  const QuizzesPage({super.key});

  @override
  ConsumerState<QuizzesPage> createState() => _QuizzesPageState();
}

class _QuizzesPageState extends ConsumerState<QuizzesPage>
    with WidgetsBindingObserver {
  final _searchController = TextEditingController();
  final Set<int> _answeredQuestions = {};
  final Set<int> _markedQuestions = {};
  final Map<int, List<String>> _selectedOptionIds = {};
  final Map<int, String> _textAnswers = {};
  final Set<int> _revealedHints = {};
  Timer? _attemptTimer;
  Timer? _draftSaveTimer;
  Timer? _draftIntervalTimer;
  DateTime? _attemptStartedAt;
  DateTime? _lastDraftSavedAt;
  final Map<int, int> _questionTimeSpent = {};
  final Set<int> _expiredQuestionIndexes = {};
  final Set<int> _autoAdvancedQuestionIndexes = {};
  int? _questionRemainingSeconds;

  _QuizView _view = _QuizView.list;
  _QuizView _reviewReturnView = _QuizView.details;
  QuizSummary? _selectedQuiz;
  String _quizType = '';
  String _status = '';
  String _dateFilter = '';
  int _questionIndex = 0;
  String _saveStatus = 'Saved';
  Duration? _remainingTime;
  bool _warnedLowTime = false;
  bool _warnedFiveMinutes = false;
  String? _timeWarningBanner;
  bool _isOffline = false;
  int _focusLossCount = 0;
  int _clipboardPasteCount = 0;
  int _focusLossDelta = 0;
  int _clipboardPasteDelta = 0;
  bool _instructionsAcknowledged = false;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _flushingOffline = false;
  String? _deviceId;

  bool get _isTeacher =>
      ref.watch(authControllerProvider).user?.role == UserRole.teacher;

  UserRole get _role =>
      ref.watch(authControllerProvider).user?.role ?? UserRole.student;

  String get _activeNavigationMode {
    final attempt = ref.read(quizzesControllerProvider).activeAttempt;
    return normalizeQuizNavigationMode(
      attempt?.navigationMode ?? _selectedQuiz?.navigationMode,
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    Future<void>.microtask(() async {
      _deviceId = await ref.read(studentDeviceIdStoreProvider).getOrCreate();
      await _load();
      _connectivitySub =
          ref.read(connectivityServiceProvider).changes.listen((results) {
        final online = !results.contains(ConnectivityResult.none);
        if (mounted) {
          setState(() => _isOffline = !online);
          if (_view == _QuizView.attempt && !online) {
            setState(() {
              _saveStatus = 'Offline — answers saved on this device';
            });
          }
        }
        if (online) {
          unawaited(_flushPendingOffline());
        }
      });
      final initial = await ref.read(connectivityServiceProvider).hasConnection;
      if (mounted) {
        setState(() => _isOffline = !initial);
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_connectivitySub?.cancel() ?? Future<void>.value());
    _attemptTimer?.cancel();
    _draftSaveTimer?.cancel();
    _draftIntervalTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_flushPendingOffline());
    }
    if (_view != _QuizView.attempt) {
      return;
    }
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      setState(() {
        _focusLossDelta += 1;
        _focusLossCount += 1;
        _saveStatus = 'Saving…';
      });
      _scheduleDraftSave();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(quizzesControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_appBarTitle),
        leading: _view == _QuizView.list
            ? null
            : IconButton(
                tooltip: 'Back',
                onPressed: _goBack,
                icon: const Icon(Icons.arrow_back),
              ),
        actions: [
          if (_view == _QuizView.list && canApproveQuizzes(_role))
            IconButton(
              tooltip: 'Quiz approvals',
              onPressed: () => context.push('/quizzes/approvals'),
              icon: const Icon(Icons.approval_outlined),
            ),
          if (_view == _QuizView.list && _isTeacher)
            IconButton(
              tooltip: 'Question bank',
              onPressed: () => context.push('/questions'),
              icon: const Icon(Icons.quiz_outlined),
            ),
          if (_view == _QuizView.list && !_isTeacher)
            IconButton(
              tooltip: 'Attempt history',
              onPressed: () => setState(() => _view = _QuizView.history),
              icon: const Icon(Icons.history_outlined),
            ),
        ],
      ),
      body: switch (_view) {
        _QuizView.list => _isTeacher
            ? TeacherQuizListView(
                state: state,
                searchController: _searchController,
                onSearch: _load,
                onRefresh: _load,
                onOpenQuiz: _openTeacherManage,
                onCreateQuiz: () {
                  ref
                      .read(teacherQuizManageControllerProvider.notifier)
                      .clearMessages();
                  setState(() => _view = _QuizView.create);
                },
                onOpenPendingReviews: () {
                  unawaited(_openPendingReviews());
                },
              )
            : _QuizListView(
                state: state,
                searchController: _searchController,
                quizType: _quizType,
                status: _status,
                dateFilter: _dateFilter,
                onSearch: _load,
                onQuizTypeChanged: (value) {
                  setState(() => _quizType = value);
                  _load();
                },
                onStatusChanged: (value) {
                  setState(() => _status = value);
                  _load();
                },
                onDateFilterChanged: (value) {
                  setState(() => _dateFilter = value);
                  _load();
                },
                onResetFilters: _resetFilters,
                onRefresh: _load,
                onOpenQuiz: _openDetails,
              ),
        _QuizView.create => TeacherQuizCreateView(
            isSaving: ref.watch(teacherQuizManageControllerProvider).isSaving,
            errorMessage:
                ref.watch(teacherQuizManageControllerProvider).errorMessage,
            onCancel: () => setState(() => _view = _QuizView.list),
            onSubmit: (input) async {
              final created = await ref
                  .read(teacherQuizManageControllerProvider.notifier)
                  .createQuiz(input);
              if (!mounted || created == null) {
                return;
              }
              await _load();
              if (!mounted) {
                return;
              }
              setState(() {
                _selectedQuiz = QuizSummary(
                  id: created.id,
                  title: created.title,
                  subject: created.subject,
                  grade: created.grade,
                  questionCount: created.questionCount,
                  points: created.totalMarks,
                  status: QuizStatus.available,
                  description: created.description,
                  quizType: created.quizType,
                  topic: created.topic,
                  difficulty: created.difficulty,
                  totalMarks: created.totalMarks,
                  timeLimitMinutes: created.timeLimitMinutes,
                  attemptLimit: created.allowedAttempts ?? 1,
                  instructions: created.instructions,
                  navigationMode: created.navigationMode,
                  createdBy: created.createdBy,
                  schoolName: created.schoolName,
                );
                _view = _QuizView.manage;
              });
            },
          ),
        _QuizView.manage => TeacherQuizManageView(
            state: ref.watch(teacherQuizManageControllerProvider),
            onBack: () {
              ref
                  .read(teacherQuizManageControllerProvider.notifier)
                  .clearManage();
              setState(() => _view = _QuizView.list);
            },
            onRefresh: () async {
              final quiz = _selectedQuiz;
              if (quiz == null) {
                return;
              }
              await ref
                  .read(teacherQuizManageControllerProvider.notifier)
                  .loadManageQuiz(quiz.id);
            },
            onPublish: () async {
              final quiz = _selectedQuiz;
              if (quiz == null) {
                return;
              }
              final ok = await ref
                  .read(teacherQuizManageControllerProvider.notifier)
                  .publishQuiz(quiz.id);
              if (ok) {
                await _load();
              }
            },
            onAssign: () {
              unawaited(_assignCurrentQuiz());
            },
            onAddQuestion: () {
              unawaited(_addInlineQuestion());
            },
            onAttachFromBank: () {
              unawaited(_attachBankQuestion());
            },
            onRemoveQuestion: (questionId) async {
              final quiz = _selectedQuiz;
              if (quiz == null) {
                return;
              }
              await ref
                  .read(teacherQuizManageControllerProvider.notifier)
                  .removeQuestion(quizId: quiz.id, questionId: questionId);
            },
            onDuplicate: () async {
              final quiz = _selectedQuiz;
              if (quiz == null) return;
              await ref
                  .read(teacherQuizManageControllerProvider.notifier)
                  .duplicateQuiz(quiz.id);
              await _load();
            },
            onArchive: () async {
              final quiz = _selectedQuiz;
              if (quiz == null) return;
              await ref
                  .read(teacherQuizManageControllerProvider.notifier)
                  .archiveQuiz(quiz.id);
              await _load();
            },
            onCancel: () async {
              final quiz = _selectedQuiz;
              if (quiz == null) return;
              await ref
                  .read(teacherQuizManageControllerProvider.notifier)
                  .cancelAssignments(quiz.id);
            },
            onMonitor: () {
              final quiz = _selectedQuiz;
              if (quiz != null) {
                context.push('/quizzes/monitoring/${quiz.id}');
              }
            },
            onAllowRetry: (assignmentId) {
              final quiz = _selectedQuiz;
              if (quiz != null) {
                ref
                    .read(teacherQuizManageControllerProvider.notifier)
                    .allowRetry(
                      quizId: quiz.id,
                      assignmentId: assignmentId,
                    );
              }
            },
          ),
        _QuizView.pendingReviews => TeacherPendingReviewsView(
            state: ref.watch(teacherQuizManageControllerProvider),
            onRefresh: () => ref
                .read(teacherQuizManageControllerProvider.notifier)
                .loadPendingReviews(),
            onOpenReview: (item) {
              unawaited(_openTeacherReview(item));
            },
          ),
        _QuizView.teacherReview => TeacherAttemptReviewView(
            state: ref.watch(teacherQuizManageControllerProvider),
            onMarksChanged: ({
              required questionId,
              required awardedMarks,
              feedback,
            }) {
              ref
                  .read(teacherQuizManageControllerProvider.notifier)
                  .patchLocalReviewMarks(
                    questionId: questionId,
                    awardedMarks: awardedMarks,
                    feedback: feedback,
                  );
            },
            onSaveMarks: () async {
              final review =
                  ref.read(teacherQuizManageControllerProvider).attemptReview;
              if (review == null) {
                return;
              }
              await ref
                  .read(teacherQuizManageControllerProvider.notifier)
                  .saveReviewMarks(
                    quizId: review.quizId,
                    attemptId: review.attemptId,
                  );
            },
            onFinalize: () async {
              final review =
                  ref.read(teacherQuizManageControllerProvider).attemptReview;
              if (review == null) {
                return;
              }
              final ok = await ref
                  .read(teacherQuizManageControllerProvider.notifier)
                  .finalizeReview(
                    quizId: review.quizId,
                    attemptId: review.attemptId,
                  );
              if (ok) {
                await ref
                    .read(teacherQuizManageControllerProvider.notifier)
                    .loadPendingReviews();
              }
            },
          ),
        _QuizView.details => _QuizDetailsView(
            quiz: _selectedQuiz!,
            isLoading: ref.watch(quizzesControllerProvider).isDetailLoading,
            instructionsAcknowledged: _instructionsAcknowledged,
            onInstructionsAcknowledgedChanged: (value) {
              setState(() => _instructionsAcknowledged = value);
            },
            onStart: () {
              unawaited(_startAttempt());
            },
            onReview: () {
              unawaited(_openReview());
            },
            onCancel: () => setState(() => _view = _QuizView.list),
          ),
        _QuizView.attempt => _QuizAttemptView(
            quiz: _selectedQuiz!,
            questionIndex: _questionIndex,
            questions:
                ref.watch(quizzesControllerProvider).activeAttempt?.questions ??
                    const [],
            answeredQuestions: _answeredQuestions,
            selectedOptionIds: _selectedOptionIds,
            markedQuestions: _markedQuestions,
            revealedHints: _revealedHints,
            textAnswers: _textAnswers,
            saveStatus: _saveStatus,
            remainingTime: _remainingTime,
            questionRemainingSeconds: _questionRemainingSeconds,
            questionLocked: _isCurrentQuestionLocked(),
            integrityLocked: _integrityLocked,
            isOffline: _isOffline,
            timeWarningBanner: _timeWarningBanner,
            pendingOfflineCount:
                ref.watch(quizzesControllerProvider).pendingOfflineCount,
            offlineSubmitQueued:
                ref.watch(quizzesControllerProvider).offlineSubmitQueued,
            onDismissTimeWarning: () {
              setState(() => _timeWarningBanner = null);
            },
            onOptionSelected: _answerOptionQuestion,
            onMatchingSelected: _setMatchingSelection,
            onOrderingMoved: _moveOrderingItem,
            onTextAnswerChanged: _answerTextQuestion,
            onShowHint: _showHint,
            onPrevious: _previousQuestion,
            onNext: _nextQuestion,
            onJumpToQuestion: _jumpToQuestion,
            onToggleMark: _toggleMarkForReview,
            onSaveNow: () {
              unawaited(_saveDraftNow(force: true));
            },
            onSubmit: () {
              unawaited(_submitAttempt());
            },
          ),
        _QuizView.submitted => _SubmissionConfirmationView(
            quiz: _selectedQuiz!,
            answeredCount: _answeredQuestions.length,
            markedCount: _markedQuestions.length,
            onReview: _selectedQuiz!.reviewAvailable
                ? () => setState(() => _view = _QuizView.review)
                : null,
            onDone: () => setState(() => _view = _QuizView.list),
          ),
        _QuizView.review => _QuizReviewView(
            quiz: _selectedQuiz!,
            result: ref.watch(quizzesControllerProvider).attemptResult,
            onBackToList: () => setState(() => _view = _reviewReturnView),
          ),
        _QuizView.history => _AttemptHistoryView(
            quizzes: state.allQuizzes,
            onOpenHistoryItem: _openHistoryItem,
          ),
      },
    );
  }

  String get _appBarTitle {
    return switch (_view) {
      _QuizView.list => _isTeacher ? 'Manage Quizzes' : 'Student Quizzes',
      _QuizView.details => 'Quiz Details',
      _QuizView.create => 'Create quiz',
      _QuizView.manage => 'Manage quiz',
      _QuizView.pendingReviews => 'Pending reviews',
      _QuizView.teacherReview => 'Review attempt',
      _QuizView.attempt => 'Quiz Attempt',
      _QuizView.submitted => 'Submitted',
      _QuizView.review => 'Review',
      _QuizView.history => 'Attempt History',
    };
  }

  Future<void> _openHistoryItem(StudentQuizHistoryItemModel item) async {
    final quizzes = ref.read(quizzesControllerProvider).allQuizzes;
    QuizSummary? matched;
    for (final quiz in quizzes) {
      if (quiz.id == '${item.quizId}') {
        matched = quiz;
        break;
      }
    }

    final quiz = matched ??
        QuizSummary(
          id: '${item.quizId}',
          title: item.quizTitle,
          subject: '',
          grade: '',
          questionCount: 0,
          points: 0,
          status: QuizStatus.completed,
          resultStatus: item.resultStatus,
          resultPercent: item.bestPercentage,
          completedAt: item.lastSubmittedAt,
          reviewAvailable: item.isReviewDone || item.attemptId != null,
        );

    final attemptId = item.attemptId;
    if (attemptId != null) {
      await ref.read(quizzesControllerProvider.notifier).loadAttemptResult(
            quizId: '${item.quizId}',
            attemptId: '$attemptId',
          );
    }

    if (!mounted) {
      return;
    }

    setState(() {
      _selectedQuiz = quiz;
      _reviewReturnView = _QuizView.history;
      _view = _QuizView.review;
    });
  }

  Future<void> _openReview() async {
    final quiz = _selectedQuiz;
    if (quiz == null) {
      return;
    }

    final attempt = ref.read(quizzesControllerProvider).activeAttempt;
    if (attempt != null) {
      await ref.read(quizzesControllerProvider.notifier).loadAttemptResult(
            quizId: quiz.id,
            attemptId: attempt.attemptId,
          );
    }

    if (!mounted) {
      return;
    }

    setState(() {
      _reviewReturnView = _QuizView.details;
      _view = _QuizView.review;
    });
  }

  Future<void> _load() {
    return ref.read(quizzesControllerProvider.notifier).load(
          search: _searchController.text.trim(),
          quizType: _quizType,
          status: _status,
          dateFilter: _dateFilter,
        );
  }

  Future<void> _flushPendingOffline() async {
    if (_flushingOffline) {
      return;
    }
    _flushingOffline = true;
    try {
      final result = await ref
          .read(quizzesControllerProvider.notifier)
          .flushPendingOfflineQueue();
      if (!mounted || result == null) {
        return;
      }
      _completeAttemptFromResult(result, offlineSynced: true);
    } finally {
      _flushingOffline = false;
    }
  }

  void _completeAttemptFromResult(
    QuizAttemptResult result, {
    bool autoSubmitted = false,
    bool offlineSynced = false,
  }) {
    final quiz = _selectedQuiz;
    if (quiz == null || !mounted) {
      return;
    }

    _stopAttemptTimer();
    _cancelDraftSave();
    setState(() {
      _selectedQuiz = quiz.copyWith(
        status: QuizStatus.completed,
        resultStatus: result.resultStatus,
        resultPercent: result.percentage,
        completedAt: DateTime.now(),
        reviewAvailable: result.reviewAvailable,
      );
      _saveStatus = offlineSynced
          ? 'Offline submit synced'
          : autoSubmitted
              ? 'Time ended. Quiz submitted automatically.'
              : 'Quiz submitted';
      _view = _QuizView.submitted;
    });
  }

  void _resetFilters() {
    setState(() {
      _searchController.clear();
      _quizType = '';
      _status = '';
      _dateFilter = '';
    });
    _load();
  }

  Future<void> _openDetails(QuizSummary quiz) async {
    _stopAttemptTimer();
    _cancelDraftSave();
    ref.read(quizzesControllerProvider.notifier).clearAttemptState();

    final detail =
        await ref.read(quizzesControllerProvider.notifier).loadDetail(quiz.id);
    if (!mounted) {
      return;
    }

    if (detail == null) {
      final message = ref.read(quizzesControllerProvider).actionError ??
          'Could not load quiz details.';
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
      return;
    }

    setState(() {
      _selectedQuiz = detail;
      _reviewReturnView = _QuizView.details;
      _instructionsAcknowledged = false;
      _view = _QuizView.details;
    });
  }

  Future<void> _startAttempt() async {
    final selectedQuiz = _selectedQuiz;
    if (selectedQuiz == null ||
        studentQuizStatus(selectedQuiz) == 'Expired' ||
        selectedQuiz.status == QuizStatus.upcoming ||
        studentQuizStatus(selectedQuiz) == 'Completed') {
      return;
    }

    final continueQuiz = studentQuizStatus(selectedQuiz) == 'In Progress';
    final requiresInstructionsAck =
        !continueQuiz && selectedQuiz.instructions.isNotEmpty;
    if (requiresInstructionsAck && !_instructionsAcknowledged) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Acknowledge the quiz instructions before starting.'),
        ),
      );
      return;
    }

    final attempt =
        await ref.read(quizzesControllerProvider.notifier).startAttempt(
              quizId: selectedQuiz.id,
              deviceId: _deviceId ?? '',
              instructionsAcknowledged:
                  !requiresInstructionsAck || _instructionsAcknowledged,
            );
    if (!mounted) {
      return;
    }
    if (attempt == null) {
      final message = ref.read(quizzesControllerProvider).actionError ??
          'Could not start the quiz attempt.';
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
      return;
    }

    final timeLimitMinutes =
        attempt.timeLimitMinutes ?? selectedQuiz.timeLimitMinutes;
    _stopAttemptTimer();
    _cancelDraftSave();

    Duration? remaining;
    if (timeLimitMinutes != null) {
      final elapsed = DateTime.now().difference(attempt.startedAt);
      final budget = Duration(minutes: timeLimitMinutes);
      remaining = budget - elapsed;
      if (remaining.isNegative) {
        remaining = Duration.zero;
      }
    }

    setState(() {
      _questionIndex = 0;
      _answeredQuestions.clear();
      _selectedOptionIds.clear();
      _textAnswers.clear();
      _markedQuestions.clear();
      _revealedHints.clear();
      _questionTimeSpent.clear();
      _expiredQuestionIndexes.clear();
      _autoAdvancedQuestionIndexes.clear();
      _hydrateSavedAnswers(attempt);
      _seedOrderingPresentations(attempt);
      _hydrateQuestionTimers(attempt);
      _attemptStartedAt = attempt.startedAt;
      _focusLossCount = attempt.focusLossCount;
      _clipboardPasteCount = attempt.clipboardPasteCount;
      _focusLossDelta = 0;
      _clipboardPasteDelta = 0;
      _saveStatus = attempt.resumed
          ? 'Resumed — previous answers restored'
          : 'Attempt started';
      _remainingTime = remaining;
      _warnedLowTime =
          remaining != null && remaining <= const Duration(seconds: 60);
      _warnedFiveMinutes =
          remaining != null && remaining <= const Duration(minutes: 5);
      _timeWarningBanner = _warnedLowTime
          ? 'Less than one minute left. The quiz will auto-submit when time runs out.'
          : (_warnedFiveMinutes
              ? '5 minutes remaining. Wrap up and submit when ready.'
              : null);
      _lastDraftSavedAt = null;
      _view = _QuizView.attempt;
      _selectedQuiz = selectedQuiz.copyWith(
        navigationMode: normalizeQuizNavigationMode(attempt.navigationMode),
      );
    });

    unawaited(
      ref.read(quizzesControllerProvider.notifier).refreshOfflineStatus(
            quizId: selectedQuiz.id,
            attemptId: attempt.attemptId,
          ),
    );
    unawaited(_flushPendingOffline());

    final needsClock = remaining != null || attempt.enablePerQuestionTimer;
    if (needsClock) {
      if (remaining != null && remaining <= Duration.zero) {
        unawaited(_submitAttempt(autoSubmitted: true));
        return;
      }

      _attemptTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted || _view != _QuizView.attempt) {
          _stopAttemptTimer();
          return;
        }

        _tickQuestionTimer();

        final current = _remainingTime;
        if (current == null) {
          return;
        }

        if (current <= const Duration(seconds: 1)) {
          setState(() => _remainingTime = Duration.zero);
          unawaited(_submitAttempt(autoSubmitted: true));
          return;
        }

        setState(() {
          _remainingTime = current - const Duration(seconds: 1);
        });

        final next = current - const Duration(seconds: 1);
        if (!_warnedFiveMinutes &&
            next <= const Duration(minutes: 5) &&
            next > const Duration(seconds: 60)) {
          _warnedFiveMinutes = true;
          if (mounted) {
            setState(() {
              _timeWarningBanner =
                  '5 minutes remaining. Wrap up and submit when ready.';
            });
          }
        }

        if (!_warnedLowTime &&
            next <= const Duration(seconds: 60) &&
            next > Duration.zero) {
          _warnedLowTime = true;
          if (mounted) {
            setState(() {
              _timeWarningBanner =
                  'Less than one minute left. The quiz will auto-submit when time runs out.';
            });
            unawaited(_playLowTimeAlert());
            unawaited(
              showDialog<void>(
                context: context,
                builder: (dialogContext) => AlertDialog(
                  title: const Text('Less than one minute left'),
                  content: const Text(
                    'Submit soon — the quiz will auto-submit when time runs out.',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(dialogContext).pop(),
                      child: const Text('Continue'),
                    ),
                  ],
                ),
              ),
            );
          }
        }
      });
    }

    _startDraftInterval();
  }

  void _startDraftInterval() {
    _draftIntervalTimer?.cancel();
    _draftIntervalTimer = Timer.periodic(_draftInterval, (_) {
      if (!mounted || _view != _QuizView.attempt) {
        return;
      }
      unawaited(_saveDraftNow());
    });
  }

  Future<void> _playLowTimeAlert() async {
    try {
      await SystemSound.play(SystemSoundType.alert);
    } catch (_) {}
    try {
      await HapticFeedback.heavyImpact();
    } catch (_) {}
  }

  void _hydrateQuestionTimers(QuizAttemptSession attempt) {
    for (var index = 0; index < attempt.questions.length; index++) {
      final question = attempt.questions[index];
      final spent =
          question.timeSpentSeconds < 0 ? 0 : question.timeSpentSeconds;
      _questionTimeSpent[index] = spent;
      if (attempt.enablePerQuestionTimer &&
          question.estimatedTimeSeconds > 0 &&
          spent >= question.estimatedTimeSeconds) {
        _expiredQuestionIndexes.add(index);
      }
    }
    _syncQuestionRemainingSeconds(attempt);
  }

  void _syncQuestionRemainingSeconds(QuizAttemptSession attempt) {
    if (!attempt.enablePerQuestionTimer || attempt.questions.isEmpty) {
      _questionRemainingSeconds = null;
      return;
    }

    final index = _questionIndex.clamp(0, attempt.questions.length - 1);
    final question = attempt.questions[index];
    final estimated = question.estimatedTimeSeconds;
    if (estimated <= 0) {
      _questionRemainingSeconds = null;
      return;
    }

    final spent = _questionTimeSpent[index] ?? 0;
    _questionRemainingSeconds = (estimated - spent).clamp(0, estimated);
  }

  bool get _integrityLocked =>
      _focusLossCount >= 5 || _clipboardPasteCount >= 3;

  bool _isCurrentQuestionLocked() {
    if (_integrityLocked) {
      return true;
    }

    final attempt = ref.read(quizzesControllerProvider).activeAttempt;
    if (attempt == null ||
        !attempt.enablePerQuestionTimer ||
        attempt.questions.isEmpty) {
      return false;
    }

    final index = _questionIndex.clamp(0, attempt.questions.length - 1);
    final question = attempt.questions[index];
    if (question.estimatedTimeSeconds <= 0) {
      return false;
    }

    return _expiredQuestionIndexes.contains(index) ||
        (_questionRemainingSeconds != null && _questionRemainingSeconds! <= 0);
  }

  void _tickQuestionTimer() {
    final attempt = ref.read(quizzesControllerProvider).activeAttempt;
    if (attempt == null || attempt.questions.isEmpty) {
      return;
    }

    final index = _questionIndex.clamp(0, attempt.questions.length - 1);
    final question = attempt.questions[index];
    final previous = _questionTimeSpent[index] ?? 0;
    final enable = attempt.enablePerQuestionTimer;
    final estimated = question.estimatedTimeSeconds;

    var shouldAutoAdvance = false;
    setState(() {
      if (enable && estimated > 0) {
        final spent = previous >= estimated ? estimated : previous + 1;
        _questionTimeSpent[index] = spent;
        final remaining = estimated - spent;
        _questionRemainingSeconds = remaining;
        if (remaining <= 0) {
          _expiredQuestionIndexes.add(index);
          if (!_autoAdvancedQuestionIndexes.contains(index)) {
            _autoAdvancedQuestionIndexes.add(index);
            shouldAutoAdvance = true;
          }
        }
      } else {
        _questionTimeSpent[index] = previous + 1;
        _questionRemainingSeconds = null;
      }
    });

    if (shouldAutoAdvance) {
      unawaited(_saveDraftNow());
      if (index < attempt.questions.length - 1) {
        setState(() {
          _questionIndex = index + 1;
          _syncQuestionRemainingSeconds(attempt);
        });
      }
    }
  }

  void _hydrateSavedAnswers(QuizAttemptSession attempt) {
    if (attempt.savedAnswers.isEmpty) {
      return;
    }

    final questionIndexById = <String, int>{
      for (var i = 0; i < attempt.questions.length; i++)
        attempt.questions[i].id: i,
    };

    for (final saved in attempt.savedAnswers) {
      final index = questionIndexById[saved.questionId];
      if (index == null) {
        continue;
      }

      final optionIds = <String>[
        ...saved.selectedOptionIds,
        if (saved.selectedOptionId != null &&
            !saved.selectedOptionIds.contains(saved.selectedOptionId))
          saved.selectedOptionId!,
      ];
      if (optionIds.isNotEmpty) {
        _selectedOptionIds[index] = optionIds;
        _answeredQuestions.add(index);
      }

      final text = saved.submittedText?.trim();
      if (text != null && text.isNotEmpty) {
        _textAnswers[index] = text;
        _answeredQuestions.add(index);
      }

      if (saved.isMarkedForReview) {
        _markedQuestions.add(index);
      }
    }
  }

  Future<void> _submitAttempt({bool autoSubmitted = false}) async {
    final quiz = _selectedQuiz;
    final attempt = ref.read(quizzesControllerProvider).activeAttempt;
    if (quiz == null || attempt == null) {
      return;
    }
    if (ref.read(quizzesControllerProvider).offlineSubmitQueued) {
      return;
    }

    // Flush latest drafts (including mark-for-review / per-question time) before submit.
    await _saveDraftNow();
    _stopAttemptTimer();
    _cancelDraftSave();

    final answers = <QuizAnswerSubmission>[
      for (var index = 0; index < attempt.questions.length; index++)
        _buildAnswerSubmission(attempt.questions[index], index),
    ];
    final startedAt = _attemptStartedAt ?? attempt.startedAt;
    final timeSpentSeconds = DateTime.now().difference(startedAt).inSeconds;

    final result =
        await ref.read(quizzesControllerProvider.notifier).submitAttempt(
              quizId: quiz.id,
              attemptId: attempt.attemptId,
              answers: answers,
              timeSpentSeconds: timeSpentSeconds,
              isAutoSubmit: autoSubmitted,
              deviceId: _deviceId ?? '',
            );
    if (!mounted) {
      return;
    }
    if (result == null) {
      final state = ref.read(quizzesControllerProvider);
      if (state.offlineSubmitQueued) {
        setState(() {
          _saveStatus =
              'Submit queued offline — will sync when you are back online';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Submit is queued on this device and will sync when online.',
            ),
          ),
        );
        return;
      }
      final message = state.actionError ?? 'Could not submit the quiz attempt.';
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
      return;
    }

    _completeAttemptFromResult(result, autoSubmitted: autoSubmitted);
  }

  QuizAnswerSubmission _buildAnswerSubmission(
    QuizQuestion question,
    int index,
  ) {
    final selectedIds = _selectedOptionIds[index] ?? const <String>[];
    final textAnswer = _textAnswers[index];
    final typeId = question.questionTypeId;
    final usesOrderedIds = typeId == 41 || typeId == 46 || typeId == 47;
    final cleanedIds =
        selectedIds.where((id) => id.trim().isNotEmpty).toList(growable: false);

    return QuizAnswerSubmission(
      questionId: question.id,
      selectedOptionId:
          usesOrderedIds || cleanedIds.isEmpty ? null : cleanedIds.first,
      selectedOptionIds:
          usesOrderedIds && cleanedIds.isNotEmpty ? cleanedIds : null,
      submittedText: textAnswer,
      isMarkedForReview: _markedQuestions.contains(index),
      timeSpentSeconds: (_questionTimeSpent[index] ?? 0) > 0
          ? _questionTimeSpent[index]
          : null,
    );
  }

  void _seedOrderingPresentations(QuizAttemptSession attempt) {
    for (var index = 0; index < attempt.questions.length; index++) {
      final question = attempt.questions[index];
      if (question.questionTypeId != 47) {
        continue;
      }
      final existing = _selectedOptionIds[index];
      if (existing != null && existing.isNotEmpty) {
        continue;
      }
      final original = question.options.map((option) => option.id).toList();
      final ids = List<String>.from(original)..shuffle();
      if (ids.length > 1 &&
          ids.length == original.length &&
          List.generate(ids.length, (i) => ids[i] == original[i])
              .every((same) => same)) {
        final first = ids[0];
        ids[0] = ids[1];
        ids[1] = first;
      }
      _selectedOptionIds[index] = ids;
      _answeredQuestions.add(index);
    }
  }

  void _scheduleDraftSave() {
    _draftSaveTimer?.cancel();
    if (mounted && _view == _QuizView.attempt) {
      setState(() => _saveStatus = 'Unsaved changes');
    }
    _draftSaveTimer = Timer(_draftChangeDebounce, () {
      unawaited(_saveDraftNow());
    });
  }

  void _cancelDraftSave() {
    _draftSaveTimer?.cancel();
    _draftSaveTimer = null;
  }

  Future<void> _saveDraftNow({bool force = false}) async {
    final quiz = _selectedQuiz;
    final attempt = ref.read(quizzesControllerProvider).activeAttempt;
    if (quiz == null || attempt == null || _view != _QuizView.attempt) {
      return;
    }

    final answers = <QuizAnswerSubmission>[
      for (var index = 0; index < attempt.questions.length; index++)
        if (_answeredQuestions.contains(index) ||
            _markedQuestions.contains(index) ||
            (_questionTimeSpent[index] ?? 0) > 0)
          _buildAnswerSubmission(attempt.questions[index], index),
    ];
    if (!force &&
        answers.isEmpty &&
        _focusLossDelta <= 0 &&
        _clipboardPasteDelta <= 0) {
      return;
    }

    final startedAt = _attemptStartedAt ?? attempt.startedAt;
    final timeSpentSeconds = DateTime.now().difference(startedAt).inSeconds;
    final focusDelta = _focusLossDelta;
    final pasteDelta = _clipboardPasteDelta;
    _focusLossDelta = 0;
    _clipboardPasteDelta = 0;

    setState(() {
      _saveStatus = _isOffline ? 'Syncing offline answers…' : 'Saving…';
    });

    final outcome =
        await ref.read(quizzesControllerProvider.notifier).saveDraft(
              quizId: quiz.id,
              attemptId: attempt.attemptId,
              answers: answers,
              timeSpentSeconds: timeSpentSeconds,
              focusLossDelta: focusDelta > 0 ? focusDelta : null,
              clipboardPasteDelta: pasteDelta > 0 ? pasteDelta : null,
              deviceId: _deviceId ?? '',
            );
    if (!mounted || _view != _QuizView.attempt) {
      return;
    }

    if (outcome == QuizDraftSaveOutcome.failed) {
      _focusLossDelta += focusDelta;
      _clipboardPasteDelta += pasteDelta;
    } else {
      _lastDraftSavedAt = DateTime.now();
    }

    final pending = ref.read(quizzesControllerProvider).pendingOfflineCount;
    setState(() {
      _saveStatus = switch (outcome) {
        QuizDraftSaveOutcome.queuedOffline => pending > 0
            ? 'Offline — $pending pending sync'
            : 'Offline — answers saved on this device',
        QuizDraftSaveOutcome.saved => pending > 0
            ? 'Saved · $pending pending sync'
            : _formatSavedStatusLabel(),
        QuizDraftSaveOutcome.failed =>
          ref.read(quizzesControllerProvider).actionError ??
              'Draft save failed — will retry',
      };
    });
  }

  String _formatSavedStatusLabel() {
    final savedAt = _lastDraftSavedAt;
    if (savedAt == null) {
      return 'Saved';
    }
    final seconds = DateTime.now().difference(savedAt).inSeconds;
    if (seconds < 5) {
      return 'Saved just now';
    }
    if (seconds < 60) {
      return 'Saved ${seconds}s ago';
    }
    final hour = savedAt.hour.toString().padLeft(2, '0');
    final minute = savedAt.minute.toString().padLeft(2, '0');
    return 'Saved at $hour:$minute';
  }

  void _stopAttemptTimer() {
    _attemptTimer?.cancel();
    _attemptTimer = null;
    _draftIntervalTimer?.cancel();
    _draftIntervalTimer = null;
  }

  void _showHint() {
    setState(() {
      _revealedHints.add(_questionIndex);
    });
  }

  void _answerOptionQuestion(String optionId, int questionTypeId) {
    if (_isCurrentQuestionLocked()) {
      return;
    }

    setState(() {
      final selected = _selectedOptionIds.putIfAbsent(
        _questionIndex,
        () => <String>[],
      );

      if (questionTypeId == 41) {
        if (selected.contains(optionId)) {
          selected.remove(optionId);
        } else {
          selected.add(optionId);
        }
      } else {
        selected
          ..clear()
          ..add(optionId);
      }

      if (selected.isEmpty) {
        _answeredQuestions.remove(_questionIndex);
      } else {
        _answeredQuestions.add(_questionIndex);
      }

      _saveStatus = 'Saving…';
    });
    _scheduleDraftSave();
  }

  void _setMatchingSelection(int leftIndex, String? rightId) {
    if (_isCurrentQuestionLocked()) {
      return;
    }
    final attempt = ref.read(quizzesControllerProvider).activeAttempt;
    if (attempt == null) {
      return;
    }
    final question = attempt.questions[_questionIndex];
    final half = question.options.length ~/ 2;
    setState(() {
      final selected = List<String>.generate(
        half,
        (slot) {
          final current = _selectedOptionIds[_questionIndex];
          if (current == null || slot >= current.length) {
            return '';
          }
          return current[slot];
        },
      );
      selected[leftIndex] = rightId ?? '';
      _selectedOptionIds[_questionIndex] = selected;
      if (selected.any((id) => id.isNotEmpty)) {
        _answeredQuestions.add(_questionIndex);
      } else {
        _answeredQuestions.remove(_questionIndex);
      }
      _saveStatus = 'Saving…';
    });
    _scheduleDraftSave();
  }

  void _moveOrderingItem(int index, int delta) {
    if (_isCurrentQuestionLocked()) {
      return;
    }
    setState(() {
      final selected = List<String>.from(
        _selectedOptionIds[_questionIndex] ?? const <String>[],
      );
      final target = index + delta;
      if (index < 0 ||
          target < 0 ||
          index >= selected.length ||
          target >= selected.length) {
        return;
      }
      final temp = selected[index];
      selected[index] = selected[target];
      selected[target] = temp;
      _selectedOptionIds[_questionIndex] = selected;
      _answeredQuestions.add(_questionIndex);
      _saveStatus = 'Saving…';
    });
    _scheduleDraftSave();
  }

  void _answerTextQuestion(String answer) {
    if (_isCurrentQuestionLocked()) {
      return;
    }

    final previous = _textAnswers[_questionIndex] ?? '';
    final grewBy = answer.length - previous.length;
    if (grewBy > 8) {
      _recordClipboardPaste();
    }

    setState(() {
      if (answer.trim().isEmpty) {
        _textAnswers.remove(_questionIndex);
        _answeredQuestions.remove(_questionIndex);
      } else {
        _textAnswers[_questionIndex] = answer;
        _answeredQuestions.add(_questionIndex);
      }
      _saveStatus = 'Saving…';
    });
    _scheduleDraftSave();
  }

  void _previousQuestion() {
    if (_questionIndex == 0 || _activeNavigationMode == quizNavigationLocked) {
      return;
    }
    setState(() {
      _questionIndex -= 1;
      final attempt = ref.read(quizzesControllerProvider).activeAttempt;
      if (attempt != null) {
        _syncQuestionRemainingSeconds(attempt);
      }
    });
  }

  void _nextQuestion() {
    final quiz = _selectedQuiz;
    final attempt = ref.read(quizzesControllerProvider).activeAttempt;
    final maxIndex =
        (attempt?.questions.length ?? quiz?.questionCount ?? 1) - 1;
    if (quiz == null || _questionIndex >= maxIndex) {
      return;
    }
    if (quizNavigationRequiresAnswerBeforeNext(_activeNavigationMode) &&
        !_answeredQuestions.contains(_questionIndex)) {
      return;
    }
    setState(() {
      _questionIndex += 1;
      if (attempt != null) {
        _syncQuestionRemainingSeconds(attempt);
      }
    });
  }

  void _jumpToQuestion(int index) {
    if (_activeNavigationMode != quizNavigationFree) {
      return;
    }
    setState(() {
      _questionIndex = index;
      final attempt = ref.read(quizzesControllerProvider).activeAttempt;
      if (attempt != null) {
        _syncQuestionRemainingSeconds(attempt);
      }
    });
  }

  void _recordClipboardPaste() {
    setState(() {
      _clipboardPasteDelta += 1;
      _clipboardPasteCount += 1;
      _saveStatus = 'Saving…';
    });
    _scheduleDraftSave();
  }

  void _toggleMarkForReview() {
    if (_isCurrentQuestionLocked()) {
      return;
    }

    setState(() {
      if (_markedQuestions.contains(_questionIndex)) {
        _markedQuestions.remove(_questionIndex);
      } else {
        _markedQuestions.add(_questionIndex);
      }
      _saveStatus = 'Saving…';
    });
    _scheduleDraftSave();
  }

  void _goBack() {
    if (_view == _QuizView.attempt) {
      _stopAttemptTimer();
      _cancelDraftSave();
      unawaited(_saveDraftNow());
      _remainingTime = null;
    }
    setState(() {
      _view = switch (_view) {
        _QuizView.details => _QuizView.list,
        _QuizView.attempt => _QuizView.details,
        _QuizView.submitted => _QuizView.list,
        _QuizView.review => _reviewReturnView,
        _QuizView.history => _QuizView.list,
        _QuizView.create => _QuizView.list,
        _QuizView.manage => _QuizView.list,
        _QuizView.pendingReviews => _QuizView.list,
        _QuizView.teacherReview => _QuizView.pendingReviews,
        _QuizView.list => _QuizView.list,
      };
    });
  }

  Future<void> _openTeacherManage(QuizSummary quiz) async {
    setState(() {
      _selectedQuiz = quiz;
      _view = _QuizView.manage;
    });
    await ref
        .read(teacherQuizManageControllerProvider.notifier)
        .loadManageQuiz(quiz.id);
  }

  Future<void> _openPendingReviews() async {
    setState(() => _view = _QuizView.pendingReviews);
    await ref
        .read(teacherQuizManageControllerProvider.notifier)
        .loadPendingReviews();
  }

  Future<void> _openTeacherReview(PendingReviewItem item) async {
    setState(() => _view = _QuizView.teacherReview);
    await ref
        .read(teacherQuizManageControllerProvider.notifier)
        .loadAttemptReview(
          quizId: item.quizId,
          attemptId: item.attemptId,
        );
  }

  Future<void> _assignCurrentQuiz() async {
    final quiz = _selectedQuiz;
    final manage = ref.read(teacherQuizManageControllerProvider).manageQuiz;
    if (quiz == null) {
      return;
    }

    final input = await showTeacherAssignSheet(
      context,
      role: _role,
      defaultGradeLabel: manage?.grade ?? quiz.grade,
      defaultAllowedAttempts: manage?.allowedAttempts ?? quiz.attemptLimit,
    );
    if (input == null || !mounted) {
      return;
    }

    await ref
        .read(teacherQuizManageControllerProvider.notifier)
        .assignQuiz(quiz.id, input);
    await _load();
  }

  Future<void> _addInlineQuestion() async {
    final quiz = _selectedQuiz;
    if (quiz == null) {
      return;
    }

    final input = await showAddInlineQuestionDialog(context);
    if (input == null || !mounted) {
      return;
    }

    await ref
        .read(teacherQuizManageControllerProvider.notifier)
        .addInlineQuestion(quiz.id, input);
  }

  Future<void> _attachBankQuestion() async {
    final quiz = _selectedQuiz;
    if (quiz == null) {
      return;
    }

    final selected = await showAttachBankQuestionDialog(context);
    if (selected == null || !mounted) {
      return;
    }

    await ref
        .read(teacherQuizManageControllerProvider.notifier)
        .attachBankQuestion(
          quizId: quiz.id,
          questionId: selected.id,
          marks: selected.marks,
        );
  }
}

class _QuizListView extends StatelessWidget {
  const _QuizListView({
    required this.state,
    required this.searchController,
    required this.quizType,
    required this.status,
    required this.dateFilter,
    required this.onSearch,
    required this.onQuizTypeChanged,
    required this.onStatusChanged,
    required this.onDateFilterChanged,
    required this.onResetFilters,
    required this.onRefresh,
    required this.onOpenQuiz,
  });

  final QuizzesState state;
  final TextEditingController searchController;
  final String quizType;
  final String status;
  final String dateFilter;
  final VoidCallback onSearch;
  final ValueChanged<String> onQuizTypeChanged;
  final ValueChanged<String> onStatusChanged;
  final ValueChanged<String> onDateFilterChanged;
  final VoidCallback onResetFilters;
  final Future<void> Function() onRefresh;
  final ValueChanged<QuizSummary> onOpenQuiz;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          const _OfflineSyncTile(),
          const SizedBox(height: 12),
          _QuizSummaryStrip(quizzes: state.allQuizzes),
          const SizedBox(height: 12),
          _FilterPanel(
            searchController: searchController,
            quizType: quizType,
            status: status,
            dateFilter: dateFilter,
            onSearch: onSearch,
            onQuizTypeChanged: onQuizTypeChanged,
            onStatusChanged: onStatusChanged,
            onDateFilterChanged: onDateFilterChanged,
            onResetFilters: onResetFilters,
          ),
          const SizedBox(height: 16),
          if (state.isLoading)
            const _QuizSkeleton()
          else if (state.errorMessage != null)
            _ErrorPanel(
              message: state.errorMessage!,
              onRetry: onRefresh,
            )
          else if (state.quizzes.isEmpty)
            const AppEmptyState(
              icon: Icons.quiz_outlined,
              title: 'No quizzes found',
              message: 'Try another filter or check back after assignments.',
            )
          else
            for (final quiz in state.quizzes) ...[
              _QuizCard(quiz: quiz, onOpen: () => onOpenQuiz(quiz)),
              const SizedBox(height: 12),
            ],
        ],
      ),
    );
  }
}

class _FilterPanel extends StatefulWidget {
  const _FilterPanel({
    required this.searchController,
    required this.quizType,
    required this.status,
    required this.dateFilter,
    required this.onSearch,
    required this.onQuizTypeChanged,
    required this.onStatusChanged,
    required this.onDateFilterChanged,
    required this.onResetFilters,
  });

  final TextEditingController searchController;
  final String quizType;
  final String status;
  final String dateFilter;
  final VoidCallback onSearch;
  final ValueChanged<String> onQuizTypeChanged;
  final ValueChanged<String> onStatusChanged;
  final ValueChanged<String> onDateFilterChanged;
  final VoidCallback onResetFilters;

  @override
  State<_FilterPanel> createState() => _FilterPanelState();
}

class _FilterPanelState extends State<_FilterPanel> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 44,
                    child: TextFormField(
                      controller: widget.searchController,
                      decoration: InputDecoration(
                        isDense: true,
                        labelText: 'Search by title or topic',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: IconButton(
                          tooltip: 'Search',
                          onPressed: widget.onSearch,
                          icon: const Icon(Icons.arrow_forward),
                        ),
                      ),
                      textInputAction: TextInputAction.search,
                      onFieldSubmitted: (_) => widget.onSearch(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filledTonal(
                  tooltip: 'Filters',
                  onPressed: () => setState(() => _expanded = !_expanded),
                  icon: Icon(
                    _expanded
                        ? Icons.filter_list_off_outlined
                        : Icons.filter_list_outlined,
                  ),
                ),
              ],
            ),
            if (_expanded) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.tune_outlined, size: 18),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Filters',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                  TextButton(
                    onPressed: widget.onResetFilters,
                    child: const Text('Reset'),
                  ),
                ],
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _FilterDropdown(
                      label: 'Type',
                      value: widget.quizType,
                      values: const [
                        '',
                        'Practice',
                        'Assessment',
                        'Competition',
                        'Surprise',
                      ],
                      onChanged: widget.onQuizTypeChanged,
                    ),
                    const SizedBox(width: 10),
                    _FilterDropdown(
                      label: 'Status',
                      value: widget.status,
                      values: const [
                        '',
                        'Expired',
                        'Completed',
                        'Under Review',
                        'InProgress',
                        'Not Attempted',
                        'Up Coming',
                      ],
                      onChanged: widget.onStatusChanged,
                    ),
                    const SizedBox(width: 10),
                    _FilterDropdown(
                      label: 'Date',
                      value: widget.dateFilter,
                      values: const [
                        '',
                        'Today',
                        'Upcoming',
                        'Overdue',
                        'Last 7 Days',
                        'Last 15 Days',
                      ],
                      onChanged: widget.onDateFilterChanged,
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _FilterDropdown extends StatelessWidget {
  const _FilterDropdown({
    required this.label,
    required this.value,
    required this.values,
    required this.onChanged,
  });

  final String label;
  final String value;
  final List<String> values;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 146,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 4),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: value,
            decoration: const InputDecoration(
              isDense: true,
              contentPadding: EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
            ),
            items: [
              for (final item in values)
                DropdownMenuItem(
                  value: item,
                  child: Text(
                    item.isEmpty ? 'All' : item,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            selectedItemBuilder: (context) {
              return [
                for (final item in values)
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: Text(
                      item.isEmpty ? 'All' : item,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ];
            },
            onChanged: (next) => onChanged(next ?? ''),
          ),
        ],
      ),
    );
  }
}

class _QuizSummaryStrip extends StatelessWidget {
  const _QuizSummaryStrip({required this.quizzes});

  final List<QuizSummary> quizzes;

  @override
  Widget build(BuildContext context) {
    final completedScores = quizzes
        .where((quiz) => studentQuizStatus(quiz) == 'Completed')
        .map((quiz) => quiz.resultPercent)
        .whereType<int>()
        .toList(growable: false);
    final averageScore = completedScores.isEmpty
        ? '-'
        : '${(completedScores.reduce((a, b) => a + b) / completedScores.length).round()}%';

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _MetricPill(
                    label: 'Upcoming',
                    value: _statusCount('Up Coming').toString(),
                  ),
                  _MetricPill(
                    label: 'In-Progress',
                    value: _statusCount('InProgress').toString(),
                  ),
                  _MetricPill(
                    label: 'Not Attempted',
                    value: _statusCount('Not Attempted').toString(),
                  ),
                  _MetricPill(
                    label: 'Under Review',
                    value: _statusCount('Under Review').toString(),
                  ),
                  _MetricPill(
                    label: 'Completed',
                    value: _statusCount('Completed').toString(),
                  ),
                  _MetricPill(
                    label: 'Expired',
                    value: _statusCount('Expired').toString(),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          _AverageScoreBadge(value: averageScore),
        ],
      ),
    );
  }

  int _statusCount(String status) {
    return quizzes.where((quiz) => studentQuizStatus(quiz) == status).length;
  }
}

class _MetricPill extends StatelessWidget {
  const _MetricPill({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;

    return Padding(
      padding: const EdgeInsetsDirectional.only(end: 6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color.withValues(alpha: 0.18)),
        ),
        child: Text(
          '$label: $value',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: color,
                fontWeight: FontWeight.w800,
              ),
        ),
      ),
    );
  }
}

class _AverageScoreBadge extends StatelessWidget {
  const _AverageScoreBadge({required this.value});

  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFF16A34A).withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        'Avg Score: $value',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: const Color(0xFF15803D),
              fontWeight: FontWeight.w900,
            ),
      ),
    );
  }
}

class _QuizCard extends StatelessWidget {
  const _QuizCard({required this.quiz, required this.onOpen});

  final QuizSummary quiz;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = studentQuizStatus(quiz);
    final expired = status == 'Expired';
    final completed = status == 'Completed';

    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(
          color: Theme.of(context).colorScheme.outlineVariant,
        ),
      ),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _QuizTypeIcon(quiz: quiz),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          quiz.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${quiz.subject} - ${_fallback(quiz.topic, quiz.grade)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  _QuizCardActions(
                    status: status,
                    quizStatus: quiz.status,
                    onPressed: onOpen,
                    showButton: !expired,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _InfoChip(
                    icon: Icons.category_outlined,
                    label: _fallback(quiz.quizType, 'Practice Quiz'),
                  ),
                  _InfoChip(
                    icon: Icons.help_outline,
                    label: '${quiz.questionCount} questions',
                  ),
                  _InfoChip(
                    icon: Icons.schedule_outlined,
                    label: quiz.timeLimitMinutes == null
                        ? 'No time limit'
                        : '${quiz.timeLimitMinutes} min',
                  ),
                  if (completed && quiz.completedAt != null)
                    _InfoChip(
                      icon: Icons.check_circle_outline,
                      label: _dateLabel(quiz.completedAt, fallback: ''),
                    )
                  else
                    _InfoChip(
                      icon: Icons.event_available_outlined,
                      label: _dateLabel(quiz.dueAt, fallback: 'No due date'),
                    ),
                  if (completed && quiz.resultPercent != null)
                    _InfoChip(
                      icon: Icons.fact_check_outlined,
                      label: 'Result: ${quiz.resultPercent}%',
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuizCardActions extends StatelessWidget {
  const _QuizCardActions({
    required this.status,
    required this.quizStatus,
    required this.onPressed,
    required this.showButton,
  });

  final String status;
  final QuizStatus quizStatus;
  final VoidCallback onPressed;
  final bool showButton;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        _StatusChip(label: status, status: quizStatus),
        if (showButton) ...[
          const SizedBox(height: 6),
          _QuizActionButton(
            status: status,
            onPressed: onPressed,
            label: _actionLabelForStatus(status),
          ),
        ],
      ],
    );
  }
}

class _QuizActionButton extends StatelessWidget {
  const _QuizActionButton({
    required this.status,
    required this.label,
    required this.onPressed,
  });

  final String status;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isNeutral = status == 'Up Coming' || status == 'Completed';
    final isReview = status == 'Under Review';
    final isCompleted = status == 'Completed';
    final backgroundColor = isNeutral
        ? Colors.transparent
        : isReview
            ? const Color(0xFFF59E0B).withValues(alpha: 0.28)
            : const Color(0xFF2563EB);
    final foregroundColor = isNeutral
        ? isCompleted
            ? const Color(0xFF15803D)
            : theme.colorScheme.onSurfaceVariant
        : isReview
            ? const Color(0xFF92400E)
            : Colors.white;
    final borderColor = isNeutral
        ? isCompleted
            ? const Color(0xFF16A34A).withValues(alpha: 0.55)
            : theme.colorScheme.outline
        : isReview
            ? const Color(0xFFD97706).withValues(alpha: 0.65)
            : const Color(0xFF1D4ED8);

    return SizedBox(
      width: 88,
      height: 34,
      child: TextButton(
        onPressed: onPressed,
        style: TextButton.styleFrom(
          padding: EdgeInsets.zero,
          backgroundColor: backgroundColor,
          foregroundColor: foregroundColor,
          elevation: isNeutral ? 0 : 1,
          shadowColor: borderColor.withValues(alpha: 0.35),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
            side: BorderSide(color: borderColor),
          ),
          textStyle: theme.textTheme.labelMedium?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
        child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
    );
  }
}

class _QuizDetailsView extends StatelessWidget {
  const _QuizDetailsView({
    required this.quiz,
    required this.isLoading,
    required this.instructionsAcknowledged,
    required this.onInstructionsAcknowledgedChanged,
    required this.onStart,
    required this.onReview,
    required this.onCancel,
  });

  final QuizSummary quiz;
  final bool isLoading;
  final bool instructionsAcknowledged;
  final ValueChanged<bool> onInstructionsAcknowledgedChanged;
  final VoidCallback onStart;
  final VoidCallback onReview;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final studentStatus = studentQuizStatus(quiz);
    final continueQuiz = studentStatus == 'In Progress';
    final canStart = studentStatus != 'Completed' &&
        studentStatus != 'Expired' &&
        quiz.status != QuizStatus.upcoming;
    final requiresInstructionsAck =
        canStart && !continueQuiz && quiz.instructions.isNotEmpty;
    final canClickStart =
        canStart && (!requiresInstructionsAck || instructionsAcknowledged);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        _HeroQuizHeader(quiz: quiz),
        const SizedBox(height: 12),
        _DetailSection(
          title: 'Quiz Information',
          children: [
            _DetailRow(
              label: 'Type',
              value: _fallback(quiz.quizType, 'Practice Quiz'),
            ),
            _DetailRow(
              label: 'Curriculum',
              value: _fallback(quiz.curriculum, 'School Curriculum'),
            ),
            _DetailRow(label: 'Class', value: quiz.grade),
            _DetailRow(label: 'Subject / Topic', value: _subjectTopic(quiz)),
            _DetailRow(
              label: 'Chapter',
              value: _fallback(quiz.chapter, 'Not specified'),
            ),
            _DetailRow(
              label: 'Learning objective',
              value: _fallback(
                quiz.learningObjective,
                'Practice assigned learning outcome',
              ),
            ),
            _DetailRow(
              label: 'Questions',
              value: quiz.questionCount.toString(),
            ),
            _DetailRow(
              label: 'Marks',
              value: quiz.totalMarks == 0
                  ? 'Not specified'
                  : quiz.totalMarks.toString(),
            ),
            _DetailRow(
              label: 'Start',
              value: _dateLabel(quiz.startAt, fallback: 'Available now'),
            ),
            _DetailRow(
              label: 'End',
              value: _dateLabel(quiz.dueAt, fallback: 'No end date'),
            ),
            if (studentStatus == 'Completed' && quiz.completedAt != null)
              _DetailRow(
                label: 'Completed',
                value: _dateLabel(quiz.completedAt, fallback: 'Not completed'),
              ),
            _DetailRow(label: 'Created by', value: _createdByLabel(quiz)),
          ],
        ),
        const SizedBox(height: 12),
        _DetailSection(
          title: 'Instructions',
          children: [
            for (final instruction in _instructionsFor(quiz))
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check_circle_outline, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(instruction)),
                  ],
                ),
              ),
            if (requiresInstructionsAck)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: instructionsAcknowledged,
                onChanged: (value) {
                  onInstructionsAcknowledgedChanged(value ?? false);
                },
                controlAffinity: ListTileControlAffinity.leading,
                title: const Text(
                  'I have read and understand these instructions and am ready to start the quiz.',
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        _DetailSection(
          title: 'Attempt Rules',
          children: [
            _RuleTile(
              icon: Icons.route_outlined,
              title: quizNavigationDisplayLabel(quiz.navigationMode),
              message: quizNavigationMessage(quiz.navigationMode),
            ),
            _RuleTile(
              icon: Icons.edit_note_outlined,
              title: quiz.answersCanBeChanged
                  ? 'Answers can be changed'
                  : 'Answers are locked after moving',
              message: quiz.answersCanBeChanged
                  ? 'You may revise answers while the quiz is active.'
                  : 'You cannot return to previous answers in this quiz.',
            ),
            _RuleTile(
              icon: Icons.lightbulb_outline,
              title: quiz.hintsAllowed ? 'Hints allowed' : 'Hints not allowed',
              message: quiz.hintsAllowed
                  ? 'Hints may appear after you try a question.'
                  : 'Hints are hidden for this quiz.',
            ),
            _RuleTile(
              icon: Icons.rate_review_outlined,
              title:
                  quiz.reviewAvailable ? 'Review available' : 'Review locked',
              message: quiz.reviewAvailable
                  ? 'You can review permitted answers after submission.'
                  : 'Review will open only after result publication.',
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (quiz.status == QuizStatus.completed)
          FilledButton.icon(
            onPressed: quiz.reviewAvailable ? onReview : null,
            icon: const Icon(Icons.rate_review_outlined),
            label: Text(
              _isReviewComplete(quiz) ? 'Review Answers' : 'View Review Status',
            ),
          )
        else ...[
          FilledButton.icon(
            onPressed: canClickStart ? onStart : null,
            icon: const Icon(Icons.play_arrow),
            label: Text(
              continueQuiz ? 'Continue Quiz' : 'Start Quiz',
            ),
          ),
          if (requiresInstructionsAck && !instructionsAcknowledged)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Acknowledge the instructions above to start.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ),
        ],
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: onCancel,
          icon: const Icon(Icons.close),
          label: const Text('Cancel'),
        ),
      ],
    );
  }
}

class _QuizAttemptView extends StatelessWidget {
  const _QuizAttemptView({
    required this.quiz,
    required this.questionIndex,
    required this.questions,
    required this.answeredQuestions,
    required this.selectedOptionIds,
    required this.markedQuestions,
    required this.revealedHints,
    required this.textAnswers,
    required this.saveStatus,
    required this.remainingTime,
    required this.questionRemainingSeconds,
    required this.questionLocked,
    required this.integrityLocked,
    required this.isOffline,
    required this.timeWarningBanner,
    required this.pendingOfflineCount,
    required this.offlineSubmitQueued,
    required this.onDismissTimeWarning,
    required this.onOptionSelected,
    required this.onMatchingSelected,
    required this.onOrderingMoved,
    required this.onTextAnswerChanged,
    required this.onShowHint,
    required this.onPrevious,
    required this.onNext,
    required this.onJumpToQuestion,
    required this.onToggleMark,
    required this.onSaveNow,
    required this.onSubmit,
  });

  final QuizSummary quiz;
  final int questionIndex;
  final List<QuizQuestion> questions;
  final Set<int> answeredQuestions;
  final Map<int, List<String>> selectedOptionIds;
  final Set<int> markedQuestions;
  final Set<int> revealedHints;
  final Map<int, String> textAnswers;
  final String saveStatus;
  final Duration? remainingTime;
  final int? questionRemainingSeconds;
  final bool questionLocked;
  final bool integrityLocked;
  final bool isOffline;
  final String? timeWarningBanner;
  final int pendingOfflineCount;
  final bool offlineSubmitQueued;
  final VoidCallback onDismissTimeWarning;
  final void Function(String optionId, int questionTypeId) onOptionSelected;
  final void Function(int leftIndex, String? rightId) onMatchingSelected;
  final void Function(int index, int delta) onOrderingMoved;
  final ValueChanged<String> onTextAnswerChanged;
  final VoidCallback onShowHint;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final ValueChanged<int> onJumpToQuestion;
  final VoidCallback onToggleMark;
  final VoidCallback onSaveNow;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    if (questions.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final question = questions[questionIndex.clamp(0, questions.length - 1)];
    final progress = (questionIndex + 1) / questions.length;
    final quizTimerUrgent = remainingTime != null &&
        remainingTime! > Duration.zero &&
        remainingTime! <= const Duration(seconds: 60);
    final questionTimerUrgent = questionRemainingSeconds != null &&
        questionRemainingSeconds! > 0 &&
        questionRemainingSeconds! <= 10;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        quiz.title,
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                      ),
                    ),
                    _InfoChip(
                      icon: Icons.timer_outlined,
                      label: _attemptTimerLabel(
                        quiz: quiz,
                        remainingTime: remainingTime,
                      ),
                      urgent: quizTimerUrgent,
                    ),
                    if (questionRemainingSeconds != null)
                      _InfoChip(
                        icon: Icons.hourglass_bottom,
                        label: 'Q ${_formatSeconds(questionRemainingSeconds!)}',
                        warning: questionTimerUrgent,
                      ),
                  ],
                ),
                if (timeWarningBanner != null) ...[
                  const SizedBox(height: 8),
                  Material(
                    color: quizTimerUrgent
                        ? const Color(0xFFFEE2E2)
                        : const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(10),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 8,
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              timeWarningBanner!,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: quizTimerUrgent
                                        ? const Color(0xFF991B1B)
                                        : const Color(0xFF92400E),
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                          ),
                          IconButton(
                            tooltip: 'Dismiss',
                            visualDensity: VisualDensity.compact,
                            onPressed: onDismissTimeWarning,
                            icon: const Icon(Icons.close, size: 18),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                if (integrityLocked) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Integrity limit exceeded. Answers are locked — submit your attempt now.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFFB91C1C),
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ] else if (questionLocked) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Time is up for this question. Your last in-time answer is locked.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFFB45309),
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ],
                if (isOffline ||
                    offlineSubmitQueued ||
                    pendingOfflineCount > 0) ...[
                  const SizedBox(height: 8),
                  Text(
                    offlineSubmitQueued
                        ? 'Submit is queued on this device. It will sync automatically when you are back online.'
                        : isOffline
                            ? (pendingOfflineCount > 0
                                ? 'You are offline. $pendingOfflineCount change(s) waiting to sync.'
                                : 'You are offline. Answers are saved on this device and will sync when the connection returns.')
                            : '$pendingOfflineCount change(s) waiting to sync.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF92400E),
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ],
                const SizedBox(height: 10),
                LinearProgressIndicator(value: progress),
                const SizedBox(height: 8),
                Text('Question ${questionIndex + 1} of ${questions.length}'),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _InfoChip(
                      icon: Icons.check_circle_outline,
                      label: '${answeredQuestions.length} answered',
                    ),
                    _InfoChip(
                      icon: Icons.radio_button_unchecked,
                      label:
                          '${questions.length - answeredQuestions.length} unanswered',
                    ),
                    _InfoChip(
                      icon: Icons.flag_outlined,
                      label: '${markedQuestions.length} marked',
                    ),
                    _InfoChip(
                      icon: Icons.cloud_done_outlined,
                      label: saveStatus,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InfoChip(
                  icon: Icons.topic_outlined,
                  label: _fallback(quiz.topic, quiz.subject),
                ),
                const SizedBox(height: 14),
                Text(
                  'Q${questionIndex + 1}. ${question.text}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 14),
                AbsorbPointer(
                  absorbing: questionLocked,
                  child: Opacity(
                    opacity: questionLocked ? 0.65 : 1,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (question.options.isEmpty ||
                            question.questionTypeId == 44 ||
                            question.questionTypeId == 45)
                          TextFormField(
                            key: ValueKey(
                              'text-answer-$questionIndex-${textAnswers[questionIndex] ?? ''}',
                            ),
                            initialValue: textAnswers[questionIndex] ?? '',
                            minLines: question.questionTypeId == 44 ||
                                    question.questionTypeId == 45
                                ? 4
                                : 1,
                            maxLines: question.questionTypeId == 44 ||
                                    question.questionTypeId == 45
                                ? 6
                                : 1,
                            decoration: InputDecoration(
                              hintText: question.questionTypeId == 45
                                  ? 'Paste a file link or path (e.g. Drive/OneDrive URL)'
                                  : question.questionTypeId == 44
                                      ? 'Write your descriptive answer'
                                      : 'Type your answer',
                              helperText: question.questionTypeId == 45
                                  ? 'Link/path MVP — binary file upload is not available yet.'
                                  : 'Model answer is hidden until after submission.',
                            ),
                            textInputAction: question.questionTypeId == 44 ||
                                    question.questionTypeId == 45
                                ? TextInputAction.newline
                                : TextInputAction.done,
                            onChanged: onTextAnswerChanged,
                          )
                        else if (question.questionTypeId == 46) ...[
                          const Text(
                            'Match each left item to a right item.',
                            style: TextStyle(fontSize: 12),
                          ),
                          const SizedBox(height: 8),
                          ...() {
                            final half = question.options.length ~/ 2;
                            final lefts = question.options.take(half).toList();
                            final rights = question.options.skip(half).toList();
                            final selected = selectedOptionIds[questionIndex] ??
                                const <String>[];
                            return [
                              for (var i = 0; i < lefts.length; i++) ...[
                                Text(
                                  lefts[i].text,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                DropdownButtonFormField<String>(
                                  key: ValueKey(
                                    'match-$i-${i < selected.length ? selected[i] : ''}',
                                  ),
                                  initialValue: i < selected.length &&
                                          selected[i].isNotEmpty
                                      ? selected[i]
                                      : null,
                                  items: [
                                    for (final right in rights)
                                      DropdownMenuItem(
                                        value: right.id,
                                        child: Text(right.text),
                                      ),
                                  ],
                                  onChanged: questionLocked
                                      ? null
                                      : (value) => onMatchingSelected(i, value),
                                  decoration: const InputDecoration(
                                    hintText: 'Select match',
                                  ),
                                ),
                                const SizedBox(height: 10),
                              ],
                            ];
                          }(),
                        ] else if (question.questionTypeId == 47) ...[
                          const Text(
                            'Arrange items in the correct order (top = first).',
                            style: TextStyle(fontSize: 12),
                          ),
                          const SizedBox(height: 8),
                          ...() {
                            final orderedIds =
                                selectedOptionIds[questionIndex] ??
                                    question.options
                                        .map((option) => option.id)
                                        .toList();
                            final byId = {
                              for (final option in question.options)
                                option.id: option,
                            };
                            return [
                              for (var i = 0; i < orderedIds.length; i++)
                                Card(
                                  child: ListTile(
                                    leading: Text('${i + 1}'),
                                    title: Text(
                                      byId[orderedIds[i]]?.text ?? '',
                                    ),
                                    trailing: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          onPressed: questionLocked || i == 0
                                              ? null
                                              : () => onOrderingMoved(i, -1),
                                          icon: const Icon(Icons.arrow_upward),
                                        ),
                                        IconButton(
                                          onPressed: questionLocked ||
                                                  i == orderedIds.length - 1
                                              ? null
                                              : () => onOrderingMoved(i, 1),
                                          icon:
                                              const Icon(Icons.arrow_downward),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ];
                          }(),
                        ] else
                          for (final option in question.options) ...[
                            _AnswerOption(
                              label: option.text,
                              imageUrl: option.imageUrl,
                              selected:
                                  selectedOptionIds[questionIndex]?.contains(
                                        option.id,
                                      ) ??
                                      false,
                              multipleSelection: question.questionTypeId == 41,
                              onTap: () => onOptionSelected(
                                option.id,
                                question.questionTypeId,
                              ),
                            ),
                            const SizedBox(height: 8),
                          ],
                      ],
                    ),
                  ),
                ),
                if (quiz.hintsAllowed && (question.hint ?? '').isNotEmpty) ...[
                  const SizedBox(height: 8),
                  if (revealedHints.contains(questionIndex))
                    _InfoChip(
                      icon: Icons.lightbulb_outline,
                      label: 'Hint: ${question.hint}',
                    )
                  else
                    OutlinedButton.icon(
                      onPressed: onShowHint,
                      icon: const Icon(Icons.lightbulb_outline),
                      label: const Text('Show Hint'),
                    ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        _QuestionNavigator(
          totalQuestions: questions.length,
          currentIndex: questionIndex,
          answeredQuestions: answeredQuestions,
          markedQuestions: markedQuestions,
          navigationLocked: normalizeQuizNavigationMode(quiz.navigationMode) !=
              quizNavigationFree,
          onJumpToQuestion: onJumpToQuestion,
        ),
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(
            onPressed: onSaveNow,
            icon: const Icon(Icons.save_outlined),
            label: const Text('Save now'),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: normalizeQuizNavigationMode(quiz.navigationMode) ==
                        quizNavigationLocked
                    ? null
                    : onPrevious,
                icon: const Icon(Icons.chevron_left),
                label: const Text('Previous'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: questionLocked ? null : onToggleMark,
                icon: Icon(
                  markedQuestions.contains(questionIndex)
                      ? Icons.flag
                      : Icons.flag_outlined,
                ),
                label: const Text('Mark'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: FilledButton.icon(
                onPressed: questionIndex == questions.length - 1
                    ? (offlineSubmitQueued ? null : onSubmit)
                    : (quizNavigationRequiresAnswerBeforeNext(
                              quiz.navigationMode,
                            ) &&
                            !answeredQuestions.contains(questionIndex)
                        ? null
                        : onNext),
                icon: Icon(
                  questionIndex == questions.length - 1
                      ? Icons.send_outlined
                      : Icons.chevron_right,
                ),
                label: Text(
                  questionIndex == questions.length - 1
                      ? (offlineSubmitQueued ? 'Queued' : 'Submit')
                      : 'Next',
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _QuestionNavigator extends StatelessWidget {
  const _QuestionNavigator({
    required this.totalQuestions,
    required this.currentIndex,
    required this.answeredQuestions,
    required this.markedQuestions,
    required this.navigationLocked,
    required this.onJumpToQuestion,
  });

  final int totalQuestions;
  final int currentIndex;
  final Set<int> answeredQuestions;
  final Set<int> markedQuestions;
  final bool navigationLocked;
  final ValueChanged<int> onJumpToQuestion;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Question Navigator',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
                if (navigationLocked)
                  const _InfoChip(
                    icon: Icons.lock_outline,
                    label: 'Navigation locked',
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (var index = 0; index < totalQuestions; index++)
                  _QuestionDot(
                    number: index + 1,
                    selected: index == currentIndex,
                    answered: answeredQuestions.contains(index),
                    marked: markedQuestions.contains(index),
                    onTap:
                        navigationLocked ? null : () => onJumpToQuestion(index),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SubmissionConfirmationView extends StatelessWidget {
  const _SubmissionConfirmationView({
    required this.quiz,
    required this.answeredCount,
    required this.markedCount,
    required this.onReview,
    required this.onDone,
  });

  final QuizSummary quiz;
  final int answeredCount;
  final int markedCount;
  final VoidCallback? onReview;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Icon(
                  Icons.check_circle_outline,
                  size: 56,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 12),
                Text(
                  'Quiz submitted',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  quiz.title,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 16),
                _DetailRow(
                  label: 'Answered',
                  value: '$answeredCount of ${quiz.questionCount}',
                ),
                _DetailRow(
                  label: 'Marked for review',
                  value: markedCount.toString(),
                ),
                _DetailRow(
                  label: 'Result status',
                  value: _studentQuizResultLabel(quiz),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Your attempt was submitted successfully. Score, correct answers, and feedback will appear after review is completed.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                if (onReview != null)
                  FilledButton.icon(
                    onPressed: onReview,
                    icon: const Icon(Icons.rate_review_outlined),
                    label: const Text('View Review Status'),
                  ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: onDone,
                  icon: const Icon(Icons.list_alt_outlined),
                  label: const Text('Back to Quiz List'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _QuizReviewView extends StatelessWidget {
  const _QuizReviewView({
    required this.quiz,
    required this.result,
    required this.onBackToList,
  });

  final QuizSummary quiz;
  final QuizAttemptResult? result;
  final VoidCallback onBackToList;

  @override
  Widget build(BuildContext context) {
    final reviewComplete = result != null && result!.reviewAvailable;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        _HeroQuizHeader(quiz: quiz),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Review after submission',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  reviewComplete
                      ? 'Reviewed answers, explanations, and feedback are available for this quiz.'
                      : 'Your attempt has been submitted. Answers and feedback will appear after AI and teacher review are completed.',
                ),
                if (result != null) ...[
                  const SizedBox(height: 12),
                  _DetailRow(
                    label: 'Score',
                    value:
                        '${result!.percentage}% (${result!.obtainedMarks}/${result!.totalMarks})',
                  ),
                  _DetailRow(label: 'Status', value: result!.resultStatus),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        _ReviewFeedbackSection(quiz: quiz),
        const SizedBox(height: 12),
        if (result != null)
          for (var index = 0; index < result!.questions.length; index++) ...[
            _ReviewQuestionCard(
              index: index,
              question: result!.questions[index],
              reviewComplete: reviewComplete,
            ),
            const SizedBox(height: 12),
          ],
        FilledButton.icon(
          onPressed: onBackToList,
          icon: const Icon(Icons.list_alt_outlined),
          label: const Text('Back to Quiz List'),
        ),
      ],
    );
  }
}

class _ReviewQuestionCard extends StatelessWidget {
  const _ReviewQuestionCard({
    required this.index,
    required this.question,
    required this.reviewComplete,
  });

  final int index;
  final QuizResultQuestion question;
  final bool reviewComplete;

  @override
  Widget build(BuildContext context) {
    final answerState = _answerReviewState(
      question,
      reviewComplete: reviewComplete,
    );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Question ${index + 1}',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
                _AnswerResultChip(state: answerState),
              ],
            ),
            const SizedBox(height: 8),
            Text(question.text),
            const SizedBox(height: 8),
            Text(
              'Your answer: ${question.submittedText ?? question.selectedOptionId ?? 'No Answer'}',
            ),
            if (reviewComplete && question.correctOptionId != null)
              Text('Correct option: ${question.correctOptionId}'),
            if (reviewComplete && (question.explanation ?? '').isNotEmpty)
              Text('Explanation: ${question.explanation}'),
            if (reviewComplete) ...[
              const SizedBox(height: 8),
              Text('Feedback: ${answerState.feedback}'),
            ],
          ],
        ),
      ),
    );
  }
}

class _ReviewFeedbackSection extends StatelessWidget {
  const _ReviewFeedbackSection({required this.quiz});

  final QuizSummary quiz;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Review feedback',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 12),
            _FeedbackTile(
              icon: Icons.auto_awesome_outlined,
              title: 'AI Feedback',
              message: _aiFeedbackMessage(quiz),
            ),
            const SizedBox(height: 10),
            _FeedbackTile(
              icon: Icons.person_search_outlined,
              title: 'Teacher Feedback',
              message: _teacherFeedbackMessage(quiz),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeedbackTile extends StatelessWidget {
  const _FeedbackTile({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              Text(message),
            ],
          ),
        ),
      ],
    );
  }
}

class _AnswerResultChip extends StatelessWidget {
  const _AnswerResultChip({required this.state});

  final _AnswerReviewState state;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: state.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(state.icon, size: 14, color: state.color),
          const SizedBox(width: 5),
          Text(
            state.label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: state.color,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

class _AttemptHistoryView extends ConsumerStatefulWidget {
  const _AttemptHistoryView({
    required this.quizzes,
    required this.onOpenHistoryItem,
  });

  final List<QuizSummary> quizzes;
  final ValueChanged<StudentQuizHistoryItemModel> onOpenHistoryItem;

  @override
  ConsumerState<_AttemptHistoryView> createState() =>
      _AttemptHistoryViewState();
}

class _AttemptHistoryViewState extends ConsumerState<_AttemptHistoryView> {
  final _searchController = TextEditingController();

  String _searchQuery = '';
  String _statusFilter = '';
  String _typeFilter = '';
  DateTimeRange? _dateRange;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final historyAsync = ref.watch(studentQuizHistoryProvider);

    return historyAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => ListView(
        padding: const EdgeInsets.all(24),
        children: [
          AppEmptyState(
            icon: Icons.error_outline,
            title: 'Quiz history unavailable',
            message: error.toString(),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () => ref.invalidate(studentQuizHistoryProvider),
            child: const Text('Retry'),
          ),
        ],
      ),
      data: (history) {
        final items =
            history.items.where(_matchesHistoryFilters).toList(growable: false);

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(studentQuizHistoryProvider);
            await ref.read(studentQuizHistoryProvider.future);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              _HistoryFilterPanel(
                searchController: _searchController,
                searchQuery: _searchQuery,
                statusFilter: _statusFilter,
                typeFilter: _typeFilter,
                dateRange: _dateRange,
                onSearchChanged: (value) {
                  setState(() => _searchQuery = value.trim());
                },
                onStatusChanged: (value) {
                  setState(() => _statusFilter = value);
                },
                onTypeChanged: (value) {
                  setState(() => _typeFilter = value);
                },
                onPickDateRange: _pickHistoryDateRange,
                onClear: () {
                  setState(() {
                    _searchController.clear();
                    _searchQuery = '';
                    _statusFilter = '';
                    _typeFilter = '';
                    _dateRange = null;
                  });
                },
              ),
              const SizedBox(height: 12),
              if (items.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: AppEmptyState(
                    icon: Icons.history_outlined,
                    title: 'No attempt history found',
                    message:
                        'Try another filter or check completed attempts later.',
                  ),
                )
              else
                for (final item in items) ...[
                  _HistoryQuizCard(
                    item: item,
                    quiz: _matchingQuiz(item),
                    onReview: () => widget.onOpenHistoryItem(item),
                  ),
                  const SizedBox(height: 12),
                ],
            ],
          ),
        );
      },
    );
  }

  QuizSummary? _matchingQuiz(StudentQuizHistoryItemModel item) {
    for (final quiz in widget.quizzes) {
      if (quiz.id == '${item.quizId}') {
        return quiz;
      }
    }
    return null;
  }

  Future<void> _pickHistoryDateRange() async {
    final now = DateTime.now();
    final selected = await showDateRangePicker(
      context: context,
      initialDateRange: _dateRange ??
          DateTimeRange(
            start: now.subtract(const Duration(days: 30)),
            end: now,
          ),
      firstDate: DateTime(now.year - 3),
      lastDate: now,
    );

    if (selected != null) {
      setState(() => _dateRange = selected);
    }
  }

  bool _matchesHistoryFilters(StudentQuizHistoryItemModel item) {
    final query = _searchQuery.toLowerCase();
    final matchesSearch =
        query.isEmpty || item.quizTitle.toLowerCase().contains(query);
    final matchesStatus = _statusFilter.isEmpty ||
        item.resultStatus.toLowerCase() == _statusFilter.toLowerCase();
    final matchedQuiz = _matchingQuiz(item);
    final matchesType = _typeFilter.isEmpty ||
        (matchedQuiz != null && matchedQuiz.quizType.startsWith(_typeFilter));
    final matchesDateRange = item.lastSubmittedAt == null
        ? _dateRange == null
        : _matchesDateRange(item.lastSubmittedAt!, _dateRange);

    return matchesSearch && matchesStatus && matchesType && matchesDateRange;
  }
}

class _HistoryFilterPanel extends StatefulWidget {
  const _HistoryFilterPanel({
    required this.searchController,
    required this.searchQuery,
    required this.statusFilter,
    required this.typeFilter,
    required this.dateRange,
    required this.onSearchChanged,
    required this.onStatusChanged,
    required this.onTypeChanged,
    required this.onPickDateRange,
    required this.onClear,
  });

  final TextEditingController searchController;
  final String searchQuery;
  final String statusFilter;
  final String typeFilter;
  final DateTimeRange? dateRange;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String> onStatusChanged;
  final ValueChanged<String> onTypeChanged;
  final VoidCallback onPickDateRange;
  final VoidCallback onClear;

  @override
  State<_HistoryFilterPanel> createState() => _HistoryFilterPanelState();
}

class _HistoryFilterPanelState extends State<_HistoryFilterPanel> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 44,
                    child: TextFormField(
                      controller: widget.searchController,
                      decoration: InputDecoration(
                        isDense: true,
                        hintText: 'Search by quiz title',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: widget.searchQuery.isEmpty
                            ? null
                            : IconButton(
                                tooltip: 'Clear search',
                                onPressed: () {
                                  widget.searchController.clear();
                                  widget.onSearchChanged('');
                                },
                                icon: const Icon(Icons.close),
                              ),
                      ),
                      textInputAction: TextInputAction.search,
                      onChanged: widget.onSearchChanged,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filledTonal(
                  tooltip: 'Filters',
                  onPressed: () => setState(() => _expanded = !_expanded),
                  icon: Icon(
                    _expanded
                        ? Icons.filter_list_off_outlined
                        : Icons.filter_list_outlined,
                  ),
                ),
              ],
            ),
            if (_expanded) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.manage_history_outlined, size: 18),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'History Filters',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                  TextButton(
                    onPressed: widget.onClear,
                    child: const Text('Reset'),
                  ),
                ],
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _FilterDropdown(
                      label: 'Type',
                      value: widget.typeFilter,
                      values: const [
                        '',
                        'Practice',
                        'Assessment',
                        'Competition',
                        'Surprise',
                      ],
                      onChanged: widget.onTypeChanged,
                    ),
                    const SizedBox(width: 10),
                    _FilterDropdown(
                      label: 'Status',
                      value: widget.statusFilter,
                      values: const [
                        '',
                        'Expired',
                        'Completed',
                        'Under Review',
                      ],
                      onChanged: widget.onStatusChanged,
                    ),
                    const SizedBox(width: 10),
                    _DateRangeControl(
                      dateRange: widget.dateRange,
                      onPressed: widget.onPickDateRange,
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DateRangeControl extends StatelessWidget {
  const _DateRangeControl({
    required this.dateRange,
    required this.onPressed,
  });

  final DateTimeRange? dateRange;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 230,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Date range',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 4),
          OutlinedButton.icon(
            onPressed: onPressed,
            icon: const Icon(Icons.date_range_outlined),
            label: SizedBox(
              width: 158,
              child: Text(
                _dateRangeLabel(dateRange),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            style: OutlinedButton.styleFrom(
              alignment: AlignmentDirectional.centerStart,
              minimumSize: const Size.fromHeight(48),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryQuizCard extends StatelessWidget {
  const _HistoryQuizCard({
    required this.item,
    required this.quiz,
    required this.onReview,
  });

  final StudentQuizHistoryItemModel item;
  final QuizSummary? quiz;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final canOpen = item.attemptId != null;
    final submittedLabel = item.lastSubmittedAt == null
        ? '—'
        : _dateLabel(item.lastSubmittedAt, fallback: '—');

    return Card(
      child: InkWell(
        onTap: canOpen ? onReview : null,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (quiz != null) ...[
                    _QuizTypeIcon(quiz: quiz!),
                    const SizedBox(width: 12),
                  ] else ...[
                    CircleAvatar(
                      backgroundColor: theme.colorScheme.primaryContainer,
                      child: Icon(
                        Icons.history_edu_outlined,
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.quizTitle,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          quiz == null
                              ? item.resultStatus
                              : '${quiz!.subject} - ${_fallback(quiz!.topic, quiz!.quizType)}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Chip(
                        label: Text(item.resultStatus),
                        visualDensity: VisualDensity.compact,
                      ),
                      if (canOpen) ...[
                        const SizedBox(height: 6),
                        TextButton.icon(
                          onPressed: onReview,
                          icon: const Icon(Icons.open_in_new, size: 18),
                          label: const Text('View result'),
                          style: TextButton.styleFrom(
                            visualDensity: VisualDensity.compact,
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _InfoChip(
                      icon: Icons.replay_outlined,
                      label: '${item.attemptCount} attempts',
                    ),
                    const SizedBox(width: 8),
                    _InfoChip(
                      icon: Icons.fact_check_outlined,
                      label: item.bestPercentage == null
                          ? 'Best: —'
                          : 'Best: ${item.bestPercentage}%',
                    ),
                    const SizedBox(width: 8),
                    _InfoChip(
                      icon: Icons.event_available_outlined,
                      label: submittedLabel,
                    ),
                    if (item.isReviewDone) ...[
                      const SizedBox(width: 8),
                      const _InfoChip(
                        icon: Icons.verified_outlined,
                        label: 'Reviewed',
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroQuizHeader extends StatelessWidget {
  const _HeroQuizHeader({required this.quiz});

  final QuizSummary quiz;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _QuizTypeIcon(quiz: quiz),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  quiz.title,
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: theme.colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            _fallback(quiz.description, 'Quiz instructions and attempt rules.'),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onPrimaryContainer,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _StatusChip(label: studentQuizStatus(quiz), status: quiz.status),
              _InfoChip(icon: Icons.subject_outlined, label: quiz.subject),
              _InfoChip(
                icon: Icons.topic_outlined,
                label: _fallback(quiz.topic, 'Mixed topics'),
              ),
              _InfoChip(
                icon: Icons.schedule_outlined,
                label: quiz.timeLimitMinutes == null
                    ? 'No time limit'
                    : '${quiz.timeLimitMinutes} minutes',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DetailSection extends StatelessWidget {
  const _DetailSection({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 10),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 132,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _RuleTile extends StatelessWidget {
  const _RuleTile({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(message),
    );
  }
}

class _AnswerOption extends StatelessWidget {
  const _AnswerOption({
    required this.label,
    required this.selected,
    required this.multipleSelection,
    required this.onTap,
    this.imageUrl,
  });

  final String label;
  final String? imageUrl;
  final bool selected;
  final bool multipleSelection;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final trimmedImage = imageUrl?.trim();
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.outlineVariant,
          ),
          color: selected
              ? Theme.of(context)
                  .colorScheme
                  .primaryContainer
                  .withValues(alpha: 0.45)
              : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              multipleSelection
                  ? selected
                      ? Icons.check_box
                      : Icons.check_box_outline_blank
                  : selected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_off,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (label.trim().isNotEmpty) Text(label),
                  if (trimmedImage != null && trimmedImage.isNotEmpty) ...[
                    if (label.trim().isNotEmpty) const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        trimmedImage,
                        height: 120,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => Text(
                          'Image unavailable',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuestionDot extends StatelessWidget {
  const _QuestionDot({
    required this.number,
    required this.selected,
    required this.answered,
    required this.marked,
    required this.onTap,
  });

  final int number;
  final bool selected;
  final bool answered;
  final bool marked;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = selected
        ? theme.colorScheme.primary
        : marked
            ? const Color(0xFFD97706)
            : answered
                ? const Color(0xFF16A34A)
                : theme.colorScheme.surfaceContainerHighest;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: CircleAvatar(
        radius: 18,
        backgroundColor: color,
        child: Text(
          number.toString(),
          style: TextStyle(
            color: selected || answered || marked
                ? Colors.white
                : theme.colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _QuizTypeIcon extends StatelessWidget {
  const _QuizTypeIcon({required this.quiz});

  final QuizSummary quiz;

  @override
  Widget build(BuildContext context) {
    final color = switch (quiz.quizType) {
      'Assessment Quiz' => const Color(0xFF2563EB),
      'Competition Quiz' => const Color(0xFFB45309),
      'Surprise Quiz' => Theme.of(context).colorScheme.error,
      _ => const Color(0xFF16A34A),
    };

    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(Icons.quiz_outlined, color: color),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.status});

  final String label;
  final QuizStatus status;

  @override
  Widget build(BuildContext context) {
    final color = switch (label) {
      'Expired' => Theme.of(context).colorScheme.error,
      'Completed' => const Color(0xFF15803D),
      'Under Review' => const Color(0xFF92400E),
      'InProgress' => const Color(0xFF2563EB),
      'Up Coming' => Theme.of(context).colorScheme.onSurfaceVariant,
      'Not Attempted' => const Color(0xFF1D4ED8),
      _ => switch (status) {
          QuizStatus.assigned => const Color(0xFF2563EB),
          QuizStatus.available => const Color(0xFF16A34A),
          QuizStatus.upcoming => const Color(0xFFD97706),
          QuizStatus.completed => Theme.of(context).colorScheme.outline,
        },
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
    this.urgent = false,
    this.warning = false,
  });

  final IconData icon;
  final String label;
  final bool urgent;
  final bool warning;

  @override
  Widget build(BuildContext context) {
    final Color background;
    final Color foreground;
    if (urgent) {
      background = const Color(0xFFFEE2E2);
      foreground = const Color(0xFFB91C1C);
    } else if (warning) {
      background = const Color(0xFFFEF3C7);
      foreground = const Color(0xFFB45309);
    } else {
      background = Theme.of(context).colorScheme.surfaceContainerHighest;
      foreground = Theme.of(context).colorScheme.onSurface;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: foreground),
          const SizedBox(width: 5),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 220),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: foreground,
                    fontWeight:
                        urgent || warning ? FontWeight.w800 : FontWeight.w500,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OfflineSyncTile extends ConsumerWidget {
  const _OfflineSyncTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(quizzesControllerProvider);
    final pending = state.pendingOfflineCount;
    final queuedSubmit = state.offlineSubmitQueued;
    final icon = queuedSubmit || pending > 0
        ? Icons.cloud_upload_outlined
        : Icons.cloud_done_outlined;
    final message = queuedSubmit
        ? 'Submit queued offline — will sync when online.'
        : pending > 0
            ? '$pending change(s) waiting to sync when online.'
            : 'Online. Answers autosave during attempts; offline drafts sync here.';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(
              icon,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
            if (pending > 0 || queuedSubmit)
              TextButton(
                onPressed: () async {
                  final result = await ref
                      .read(quizzesControllerProvider.notifier)
                      .flushPendingOfflineQueue();
                  if (!context.mounted) {
                    return;
                  }
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        result != null
                            ? 'Offline submit synced successfully.'
                            : pending > 0
                                ? 'Sync attempted. Remaining items will retry when online.'
                                : 'Nothing pending to sync.',
                      ),
                    ),
                  );
                },
                child: const Text('Sync now'),
              ),
          ],
        ),
      ),
    );
  }
}

class _QuizSkeleton extends StatelessWidget {
  const _QuizSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var index = 0; index < 3; index++) ...[
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SkeletonBox(width: 180, height: 18),
                  SizedBox(height: 12),
                  _SkeletonBox(width: double.infinity, height: 58),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _SkeletonBox extends StatelessWidget {
  const _SkeletonBox({required this.width, required this.height});

  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
    );
  }
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(
              Icons.error_outline,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AnswerReviewState {
  const _AnswerReviewState({
    required this.label,
    required this.color,
    required this.icon,
    required this.feedback,
  });

  final String label;
  final Color color;
  final IconData icon;
  final String feedback;
}

_AnswerReviewState _answerReviewState(
  QuizResultQuestion question, {
  required bool reviewComplete,
}) {
  if (!reviewComplete) {
    return const _AnswerReviewState(
      label: 'Review Pending',
      color: Color(0xFF7C3AED),
      icon: Icons.pending_actions_outlined,
      feedback: 'Review is pending.',
    );
  }

  if (question.isCorrect) {
    return const _AnswerReviewState(
      label: 'Correct',
      color: Color(0xFF16A34A),
      icon: Icons.check_circle_outline,
      feedback: 'Answer marked correct.',
    );
  }

  if (question.awardedMarks > 0 && question.awardedMarks < question.marks) {
    return const _AnswerReviewState(
      label: 'Partial',
      color: Color(0xFFD97706),
      icon: Icons.rule_outlined,
      feedback: 'Partial marks awarded.',
    );
  }

  return const _AnswerReviewState(
    label: 'Wrong Answer',
    color: Color(0xFFDC2626),
    icon: Icons.cancel_outlined,
    feedback: 'Answer marked incorrect.',
  );
}

List<String> _instructionsFor(QuizSummary quiz) {
  if (quiz.instructions.isNotEmpty) {
    return quiz.instructions;
  }

  return const [
    'Read the instructions before starting.',
    'Answers are saved automatically.',
    'Submit before the quiz closes.',
  ];
}

String _fallback(String value, String fallback) {
  return value.trim().isEmpty ? fallback : value;
}

String _subjectTopic(QuizSummary quiz) {
  final subject = _fallback(quiz.subject, 'Subject not specified');
  final topic = quiz.topic.trim();

  if (topic.isEmpty) {
    return subject;
  }

  return '$subject / $topic';
}

String _createdByLabel(QuizSummary quiz) {
  final creator = _fallback(quiz.createdBy, 'Teacher');
  final school = quiz.schoolName.trim();

  if (school.isEmpty) {
    return creator;
  }

  return '$creator - $school';
}

String _attemptTimerLabel({
  required QuizSummary quiz,
  required Duration? remainingTime,
}) {
  if (quiz.timeLimitMinutes == null) {
    return 'No timer';
  }

  final remaining = remainingTime ?? Duration(minutes: quiz.timeLimitMinutes!);
  if (remaining <= Duration.zero) {
    return 'Time ended';
  }

  final label = '${_formatSeconds(remaining.inSeconds)} left';
  return label;
}

String _formatSeconds(int totalSeconds) {
  final safe = totalSeconds < 0 ? 0 : totalSeconds;
  final minutes = (safe ~/ 60).toString().padLeft(2, '0');
  final seconds = (safe % 60).toString().padLeft(2, '0');
  return '$minutes:$seconds';
}

String _actionLabelForStatus(String status) {
  if (status == 'Up Coming' || status == 'Completed') {
    return 'View';
  }

  if (status == 'Under Review') {
    return 'Review';
  }

  return 'Start';
}

bool _isReviewComplete(QuizSummary quiz) {
  final normalizedStatus = quiz.resultStatus.toLowerCase().replaceAll(' ', '');
  return quiz.resultPercent != null &&
      (normalizedStatus == 'reviewed' ||
          normalizedStatus == 'completed' ||
          normalizedStatus == 'reviewcompleted');
}

String _aiFeedbackMessage(QuizSummary quiz) {
  final normalizedStatus = quiz.resultStatus.toLowerCase().replaceAll(' ', '');

  if (_isReviewComplete(quiz)) {
    return 'AI review completed. Automated checks are available with the answer review.';
  }

  if (normalizedStatus == 'aireview' || normalizedStatus == 'autosubmitted') {
    return 'AI review is in progress.';
  }

  return 'AI initial review is pending or not required for this quiz.';
}

String _teacherFeedbackMessage(QuizSummary quiz) {
  final normalizedStatus = quiz.resultStatus.toLowerCase().replaceAll(' ', '');

  if (_isReviewComplete(quiz)) {
    return 'Teacher review completed. Final feedback is available.';
  }

  if (normalizedStatus == 'underteacherreview' ||
      normalizedStatus == 'teacherreview' ||
      normalizedStatus == 'pendingteacherreview' ||
      normalizedStatus == 'submitted') {
    return 'Teacher feedback is pending.';
  }

  return 'Teacher feedback will appear after review is completed.';
}

String _studentQuizResultLabel(QuizSummary quiz) {
  final now = DateTime.now();
  final resultStatus = quiz.resultStatus.trim();
  final normalizedStatus = resultStatus.toLowerCase().replaceAll(' ', '');

  if (quiz.status == QuizStatus.upcoming ||
      (quiz.startAt != null && quiz.startAt!.isAfter(now))) {
    return '-';
  }

  if (quiz.dueAt != null &&
      quiz.dueAt!.isBefore(now) &&
      normalizedStatus == 'notstarted') {
    return '-';
  }

  if (quiz.resultPercent != null &&
      (normalizedStatus == 'reviewed' ||
          normalizedStatus == 'completed' ||
          normalizedStatus == 'reviewcompleted')) {
    return '${quiz.resultPercent}%';
  }

  if (normalizedStatus == 'submitted') {
    return 'Under Teacher Review';
  }

  if (normalizedStatus == 'autosubmitted') {
    return 'AI Review';
  }

  if (normalizedStatus == 'underteacherreview' ||
      normalizedStatus == 'aireview' ||
      normalizedStatus == 'teacherreview' ||
      normalizedStatus == 'pendingteacherreview') {
    return resultStatus;
  }

  if (normalizedStatus == 'inprogress') {
    return 'In Progress';
  }

  return resultStatus.isEmpty || normalizedStatus == 'notstarted'
      ? studentQuizStatus(quiz)
      : resultStatus;
}

String _dateLabel(DateTime? value, {required String fallback}) {
  if (value == null) {
    return fallback;
  }

  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  final hour = value.hour.toString().padLeft(2, '0');
  final minute = value.minute.toString().padLeft(2, '0');
  return '$day/$month/${value.year} $hour:$minute';
}

String _dateRangeLabel(DateTimeRange? dateRange) {
  if (dateRange == null) {
    return 'From date - To date';
  }

  return '${_compactDateLabel(dateRange.start)} - ${_compactDateLabel(dateRange.end)}';
}

String _compactDateLabel(DateTime value) {
  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  return '$day/$month/${value.year}';
}

bool _matchesDateRange(DateTime date, DateTimeRange? dateRange) {
  if (dateRange == null) {
    return true;
  }

  final start = DateTime(
    dateRange.start.year,
    dateRange.start.month,
    dateRange.start.day,
  );
  final endExclusive = DateTime(
    dateRange.end.year,
    dateRange.end.month,
    dateRange.end.day,
  ).add(const Duration(days: 1));

  return !date.isBefore(start) && date.isBefore(endExclusive);
}
