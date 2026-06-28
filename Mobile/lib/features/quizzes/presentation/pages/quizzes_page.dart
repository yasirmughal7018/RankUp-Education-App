import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/quizzes/data/local/quiz_local_memory.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/presentation/controllers/quizzes_controller.dart';
import 'package:rankup_education/features/quizzes/presentation/providers/quiz_providers.dart';

enum _QuizView { list, details, attempt, submitted, review, history }

class QuizzesPage extends ConsumerStatefulWidget {
  const QuizzesPage({super.key});

  @override
  ConsumerState<QuizzesPage> createState() => _QuizzesPageState();
}

class _QuizzesPageState extends ConsumerState<QuizzesPage> {
  final _searchController = TextEditingController();
  final Set<int> _answeredQuestions = {};
  final Set<int> _markedQuestions = {};
  final Map<int, Set<String>> _selectedOptionAnswers = {};
  Timer? _attemptTimer;

  _QuizView _view = _QuizView.list;
  QuizSummary? _selectedQuiz;
  String _quizType = '';
  String _status = '';
  String _dateFilter = '';
  int _questionIndex = 0;
  String _saveStatus = 'All answers saved';
  Duration? _remainingTime;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_load);
  }

  @override
  void dispose() {
    _attemptTimer?.cancel();
    _searchController.dispose();
    super.dispose();
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
          if (_view == _QuizView.list)
            IconButton(
              tooltip: 'Attempt history',
              onPressed: () => setState(() => _view = _QuizView.history),
              icon: const Icon(Icons.history_outlined),
            ),
        ],
      ),
      body: switch (_view) {
        _QuizView.list => _QuizListView(
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
        _QuizView.details => _QuizDetailsView(
            quiz: _selectedQuiz!,
            onStart: _startAttempt,
            onReview: () => setState(() => _view = _QuizView.review),
            onCancel: () => setState(() => _view = _QuizView.list),
          ),
        _QuizView.attempt => _QuizAttemptView(
            quiz: _selectedQuiz!,
            questionIndex: _questionIndex,
            answeredQuestions: _answeredQuestions,
            selectedOptionAnswers: _selectedOptionAnswers,
            markedQuestions: _markedQuestions,
            saveStatus: _saveStatus,
            remainingTime: _remainingTime,
            onOptionSelected: _answerOptionQuestion,
            onTextAnswerChanged: _answerTextQuestion,
            onPrevious: _previousQuestion,
            onNext: _nextQuestion,
            onJumpToQuestion: _jumpToQuestion,
            onToggleMark: _toggleMarkForReview,
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
            onBackToList: () => setState(() => _view = _QuizView.list),
          ),
        _QuizView.history => _AttemptHistoryView(
            quizzes: state.allQuizzes,
            onOpenReview: (quiz) {
              setState(() {
                _selectedQuiz = quiz;
                _view = _QuizView.review;
              });
            },
          ),
      },
    );
  }

  String get _appBarTitle {
    return switch (_view) {
      _QuizView.list => 'Student Quizzes',
      _QuizView.details => 'Quiz Details',
      _QuizView.attempt => 'Quiz Attempt',
      _QuizView.submitted => 'Submitted',
      _QuizView.review => 'Review',
      _QuizView.history => 'Attempt History',
    };
  }

  Future<void> _load() {
    return ref.read(quizzesControllerProvider.notifier).load(
          search: _searchController.text.trim(),
          quizType: _quizType,
          status: _status,
          dateFilter: _dateFilter,
        );
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

  void _openDetails(QuizSummary quiz) {
    _stopAttemptTimer();
    setState(() {
      _selectedQuiz = quiz;
      _view = _QuizView.details;
    });
  }

  void _startAttempt() {
    final timeLimitMinutes = _selectedQuiz?.timeLimitMinutes;
    _stopAttemptTimer();

    setState(() {
      _questionIndex = 0;
      _answeredQuestions.clear();
      _selectedOptionAnswers.clear();
      _markedQuestions.clear();
      _saveStatus = 'Answer autosaved just now';
      _remainingTime =
          timeLimitMinutes == null ? null : Duration(minutes: timeLimitMinutes);
      _view = _QuizView.attempt;
    });

    if (timeLimitMinutes != null) {
      _attemptTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        final remaining = _remainingTime;
        if (!mounted || _view != _QuizView.attempt || remaining == null) {
          _stopAttemptTimer();
          return;
        }

        if (remaining <= const Duration(seconds: 1)) {
          setState(() => _remainingTime = Duration.zero);
          unawaited(_submitAttempt(autoSubmitted: true));
          return;
        }

        setState(() {
          _remainingTime = remaining - const Duration(seconds: 1);
        });
      });
    }
  }

  Future<void> _submitAttempt({bool autoSubmitted = false}) async {
    final quiz = _selectedQuiz;
    if (quiz == null) {
      return;
    }

    final submittedQuiz = quiz.copyWith(
      status: QuizStatus.completed,
      resultStatus: autoSubmitted ? 'AI Review' : 'Under Teacher Review',
      reviewAvailable: true,
    );

    _stopAttemptTimer();
    await ref
        .read(quizzesControllerProvider.notifier)
        .updateQuiz(submittedQuiz);
    if (!mounted) {
      return;
    }

    setState(() {
      _selectedQuiz = submittedQuiz;
      _saveStatus = autoSubmitted
          ? 'Time ended. Quiz submitted automatically.'
          : 'Quiz submitted';
      _view = _QuizView.submitted;
    });
  }

  void _stopAttemptTimer() {
    _attemptTimer?.cancel();
    _attemptTimer = null;
  }

  void _answerOptionQuestion(String answer, int questionTypeId) {
    setState(() {
      final selected = _selectedOptionAnswers.putIfAbsent(
        _questionIndex,
        () => <String>{},
      );

      if (questionTypeId == 41) {
        if (selected.contains(answer)) {
          selected.remove(answer);
        } else {
          selected.add(answer);
        }
      } else {
        selected
          ..clear()
          ..add(answer);
      }

      if (selected.isEmpty) {
        _answeredQuestions.remove(_questionIndex);
      } else {
        _answeredQuestions.add(_questionIndex);
      }

      _saveStatus = 'Answer autosaved just now';
    });
  }

  void _answerTextQuestion(String answer) {
    setState(() {
      if (answer.trim().isEmpty) {
        _answeredQuestions.remove(_questionIndex);
      } else {
        _answeredQuestions.add(_questionIndex);
      }
      _saveStatus = 'Answer autosaved just now';
    });
  }

  void _previousQuestion() {
    if (_questionIndex == 0 ||
        _selectedQuiz?.navigationMode == 'Locked Navigation') {
      return;
    }
    setState(() {
      _questionIndex -= 1;
      _saveStatus = 'Saved before moving';
    });
  }

  void _nextQuestion() {
    final quiz = _selectedQuiz;
    if (quiz == null || _questionIndex >= quiz.questionCount - 1) {
      return;
    }
    setState(() {
      _questionIndex += 1;
      _saveStatus = 'Saved before moving';
    });
  }

  void _jumpToQuestion(int index) {
    final quiz = _selectedQuiz;
    if (quiz == null || quiz.navigationMode != 'Free Navigation') {
      return;
    }
    setState(() {
      _questionIndex = index;
      _saveStatus = 'Saved before moving';
    });
  }

  void _toggleMarkForReview() {
    setState(() {
      if (_markedQuestions.contains(_questionIndex)) {
        _markedQuestions.remove(_questionIndex);
      } else {
        _markedQuestions.add(_questionIndex);
      }
    });
  }

  void _goBack() {
    if (_view == _QuizView.attempt) {
      _stopAttemptTimer();
      _remainingTime = null;
    }
    setState(() {
      _view = switch (_view) {
        _QuizView.details => _QuizView.list,
        _QuizView.attempt => _QuizView.details,
        _QuizView.submitted => _QuizView.list,
        _QuizView.review => _QuizView.details,
        _QuizView.history => _QuizView.list,
        _QuizView.list => _QuizView.list,
      };
    });
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
          TextField(
            controller: searchController,
            decoration: InputDecoration(
              labelText: 'Search by title or topic',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                tooltip: 'Search',
                onPressed: onSearch,
                icon: const Icon(Icons.arrow_forward),
              ),
            ),
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => onSearch(),
          ),
          const SizedBox(height: 12),
          _FilterPanel(
            quizType: quizType,
            status: status,
            dateFilter: dateFilter,
            onQuizTypeChanged: onQuizTypeChanged,
            onStatusChanged: onStatusChanged,
            onDateFilterChanged: onDateFilterChanged,
            onResetFilters: onResetFilters,
          ),
          const SizedBox(height: 16),
          _QuizSummaryStrip(quizzes: state.quizzes),
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

class _FilterPanel extends StatelessWidget {
  const _FilterPanel({
    required this.quizType,
    required this.status,
    required this.dateFilter,
    required this.onQuizTypeChanged,
    required this.onStatusChanged,
    required this.onDateFilterChanged,
    required this.onResetFilters,
  });

  final String quizType;
  final String status;
  final String dateFilter;
  final ValueChanged<String> onQuizTypeChanged;
  final ValueChanged<String> onStatusChanged;
  final ValueChanged<String> onDateFilterChanged;
  final VoidCallback onResetFilters;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                const Icon(Icons.tune_outlined),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Filters',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
                TextButton(
                  onPressed: onResetFilters,
                  child: const Text('Reset'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterDropdown(
                    label: 'Type',
                    value: quizType,
                    values: const [
                      '',
                      'Practice',
                      'Assessment',
                      'Competition',
                      'Surprise',
                    ],
                    onChanged: onQuizTypeChanged,
                  ),
                  const SizedBox(width: 10),
                  _FilterDropdown(
                    label: 'Status',
                    value: status,
                    values: const [
                      '',
                      'Expired',
                      'Completed',
                      'Not Started',
                      'InProgress',
                    ],
                    onChanged: onStatusChanged,
                  ),
                  const SizedBox(width: 10),
                  _FilterDropdown(
                    label: 'Date',
                    value: dateFilter,
                    values: const [
                      '',
                      'Today',
                      'Current Week',
                      'Upcoming',
                    ],
                    onChanged: onDateFilterChanged,
                  ),
                ],
              ),
            ),
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
    final assigned =
        quizzes.where((quiz) => quiz.status == QuizStatus.assigned).length;
    final upcoming =
        quizzes.where((quiz) => quiz.status == QuizStatus.upcoming).length;
    final review =
        quizzes.where((quiz) => quiz.resultStatus.contains('Review')).length;

    return Row(
      children: [
        Expanded(
          child: _MiniMetricCard(
            icon: Icons.assignment_outlined,
            label: 'Assigned',
            value: assigned.toString(),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MiniMetricCard(
            icon: Icons.event_outlined,
            label: 'Upcoming',
            value: upcoming.toString(),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MiniMetricCard(
            icon: Icons.rate_review_outlined,
            label: 'Review',
            value: review.toString(),
          ),
        ),
      ],
    );
  }
}

class _MiniMetricCard extends StatelessWidget {
  const _MiniMetricCard({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: theme.colorScheme.primary),
            const SizedBox(height: 8),
            Text(
              value,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            Text(label, overflow: TextOverflow.ellipsis),
          ],
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

    return Card(
      child: InkWell(
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(14),
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
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${quiz.subject} - ${_fallback(quiz.topic, quiz.grade)}',
                        ),
                      ],
                    ),
                  ),
                  _StatusChip(
                    label: studentQuizStatus(quiz),
                    status: quiz.status,
                  ),
                ],
              ),
              const SizedBox(height: 12),
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
                  _InfoChip(
                    icon: Icons.event_available_outlined,
                    label: _dateLabel(quiz.dueAt, fallback: 'No due date'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Result: ${_studentQuizResultLabel(quiz)}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                  FilledButton(
                    onPressed: onOpen,
                    child: Text(_primaryActionLabel(quiz)),
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

class _QuizDetailsView extends StatelessWidget {
  const _QuizDetailsView({
    required this.quiz,
    required this.onStart,
    required this.onReview,
    required this.onCancel,
  });

  final QuizSummary quiz;
  final VoidCallback onStart;
  final VoidCallback onReview;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final canStart = quiz.status != QuizStatus.completed &&
        quiz.status != QuizStatus.upcoming;

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
          ],
        ),
        const SizedBox(height: 12),
        _DetailSection(
          title: 'Attempt Rules',
          children: [
            _RuleTile(
              icon: Icons.route_outlined,
              title: quiz.navigationMode,
              message: _navigationMessage(quiz.navigationMode),
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
            label: const Text('Review Answers'),
          )
        else
          FilledButton.icon(
            onPressed: canStart ? onStart : null,
            icon: const Icon(Icons.play_arrow),
            label: Text(
              quiz.resultStatus == 'In Progress'
                  ? 'Continue Quiz'
                  : 'Start Quiz',
            ),
          ),
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
    required this.answeredQuestions,
    required this.selectedOptionAnswers,
    required this.markedQuestions,
    required this.saveStatus,
    required this.remainingTime,
    required this.onOptionSelected,
    required this.onTextAnswerChanged,
    required this.onPrevious,
    required this.onNext,
    required this.onJumpToQuestion,
    required this.onToggleMark,
    required this.onSubmit,
  });

  final QuizSummary quiz;
  final int questionIndex;
  final Set<int> answeredQuestions;
  final Map<int, Set<String>> selectedOptionAnswers;
  final Set<int> markedQuestions;
  final String saveStatus;
  final Duration? remainingTime;
  final void Function(String answer, int questionTypeId) onOptionSelected;
  final ValueChanged<String> onTextAnswerChanged;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final ValueChanged<int> onJumpToQuestion;
  final VoidCallback onToggleMark;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final question = _sampleQuestion(quiz, questionIndex);
    final progress = (questionIndex + 1) / quiz.questionCount;

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
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                LinearProgressIndicator(value: progress),
                const SizedBox(height: 8),
                Text('Question ${questionIndex + 1} of ${quiz.questionCount}'),
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
                          '${quiz.questionCount - answeredQuestions.length} unanswered',
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
                  question.prompt,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 14),
                if (question.options.isEmpty)
                  TextField(
                    minLines: question.questionTypeId == 44 ? 4 : 1,
                    maxLines: question.questionTypeId == 44 ? 6 : 1,
                    decoration: InputDecoration(
                      hintText: question.questionTypeId == 44
                          ? 'Write your descriptive answer'
                          : 'Type your answer',
                      helperText:
                          'Model answer is hidden until after submission.',
                    ),
                    textInputAction: question.questionTypeId == 44
                        ? TextInputAction.newline
                        : TextInputAction.done,
                    onChanged: onTextAnswerChanged,
                  )
                else
                  for (final option in question.options) ...[
                    _AnswerOption(
                      label: option,
                      selected: selectedOptionAnswers[questionIndex]?.contains(
                            option,
                          ) ??
                          false,
                      multipleSelection: question.questionTypeId == 41,
                      onTap: () => onOptionSelected(
                        option,
                        question.questionTypeId,
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                if (question.hint.isNotEmpty && question.options.isEmpty) ...[
                  const SizedBox(height: 10),
                  _InfoChip(
                    icon: Icons.lightbulb_outline,
                    label: 'Hint: ${question.hint}',
                  ),
                ],
                if (quiz.hintsAllowed) ...[
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () {},
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
          totalQuestions: quiz.questionCount,
          currentIndex: questionIndex,
          answeredQuestions: answeredQuestions,
          markedQuestions: markedQuestions,
          navigationLocked: quiz.navigationMode != 'Free Navigation',
          onJumpToQuestion: onJumpToQuestion,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: onPrevious,
                icon: const Icon(Icons.chevron_left),
                label: const Text('Previous'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: onToggleMark,
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
                onPressed:
                    questionIndex == quiz.questionCount - 1 ? onSubmit : onNext,
                icon: Icon(
                  questionIndex == quiz.questionCount - 1
                      ? Icons.send_outlined
                      : Icons.chevron_right,
                ),
                label: Text(
                  questionIndex == quiz.questionCount - 1 ? 'Submit' : 'Next',
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
                const _DetailRow(
                  label: 'Result status',
                  value: 'Under Teacher Review',
                ),
                const SizedBox(height: 12),
                Text(
                  quiz.reviewAvailable
                      ? 'Objective answers may be checked automatically. Teacher or AI feedback can appear later.'
                      : 'Review is locked until the result is published.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                if (onReview != null)
                  FilledButton.icon(
                    onPressed: onReview,
                    icon: const Icon(Icons.rate_review_outlined),
                    label: const Text('Review Permitted Answers'),
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
  const _QuizReviewView({required this.quiz, required this.onBackToList});

  final QuizSummary quiz;
  final VoidCallback onBackToList;

  @override
  Widget build(BuildContext context) {
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
                  quiz.reviewAvailable
                      ? 'Correct answers, explanations, and feedback are visible when permitted by quiz settings.'
                      : 'This quiz does not allow review until results are published.',
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        for (var index = 0; index < 3; index++) ...[
          _ReviewQuestionCard(index: index, quiz: quiz),
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
  const _ReviewQuestionCard({required this.index, required this.quiz});

  final int index;
  final QuizSummary quiz;

  @override
  Widget build(BuildContext context) {
    final question = _sampleQuestion(quiz, index);
    final correct = index != 2;

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
                _InfoChip(
                  icon:
                      correct ? Icons.check_circle_outline : Icons.info_outline,
                  label: correct ? 'Correct' : 'Needs review',
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(question.prompt),
            const SizedBox(height: 8),
            Text('Your answer: ${_reviewAnswerLabel(question)}'),
            Text('Explanation: ${question.explanation}'),
            const SizedBox(height: 8),
            const Text('Teacher feedback: Keep practicing similar questions.'),
            const Text(
              'AI feedback: Review the topic notes before the next attempt.',
            ),
          ],
        ),
      ),
    );
  }
}

class _AttemptHistoryView extends StatefulWidget {
  const _AttemptHistoryView({
    required this.quizzes,
    required this.onOpenReview,
  });

  final List<QuizSummary> quizzes;
  final ValueChanged<QuizSummary> onOpenReview;

  @override
  State<_AttemptHistoryView> createState() => _AttemptHistoryViewState();
}

class _AttemptHistoryViewState extends State<_AttemptHistoryView> {
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
    final history = widget.quizzes
        .where(_isOlderThanOneMonth)
        .where(_matchesHistoryFilters)
        .toList();

    return ListView(
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
        if (history.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24),
            child: AppEmptyState(
              icon: Icons.history_outlined,
              title: 'No attempt history found',
              message:
                  'Only quizzes older than one month appear here. Try another filter.',
            ),
          )
        else
          for (final quiz in history) ...[
            _HistoryQuizCard(
              quiz: quiz,
              onReview: () => widget.onOpenReview(quiz),
            ),
            const SizedBox(height: 12),
          ],
      ],
    );
  }

  Future<void> _pickHistoryDateRange() async {
    final now = DateTime.now();
    final selected = await showDateRangePicker(
      context: context,
      initialDateRange: _dateRange ??
          DateTimeRange(
            start: now.subtract(const Duration(days: 60)),
            end: now.subtract(const Duration(days: 31)),
          ),
      firstDate: DateTime(now.year - 3),
      lastDate: now,
    );

    if (selected != null) {
      setState(() => _dateRange = selected);
    }
  }

  bool _matchesHistoryFilters(QuizSummary quiz) {
    final studentStatus = studentQuizStatus(quiz);
    final date = _quizDate(quiz);
    final historyStatus =
        studentStatus == 'Expired' || studentStatus == 'Completed';
    final query = _searchQuery.toLowerCase();
    final searchableText = '${quiz.title} ${quiz.topic}'.toLowerCase();
    final matchesSearch = query.isEmpty || searchableText.contains(query);
    final matchesStatus =
        _statusFilter.isEmpty || studentStatus == _statusFilter;
    final matchesType =
        _typeFilter.isEmpty || quiz.quizType.startsWith(_typeFilter);
    final matchesFrom = _dateRange == null ||
        !date.isBefore(
          DateTime(
            _dateRange!.start.year,
            _dateRange!.start.month,
            _dateRange!.start.day,
          ),
        );
    final matchesTo = _dateRange == null ||
        date.isBefore(
          DateTime(
            _dateRange!.end.year,
            _dateRange!.end.month,
            _dateRange!.end.day,
          ).add(const Duration(days: 1)),
        );

    return historyStatus &&
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesFrom &&
        matchesTo;
  }
}

class _HistoryFilterPanel extends StatelessWidget {
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
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                const Icon(Icons.manage_history_outlined),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'History Filters',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
                TextButton(onPressed: onClear, child: const Text('Reset')),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: searchController,
              decoration: InputDecoration(
                hintText: 'Search by title or topic',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: searchQuery.isEmpty
                    ? null
                    : IconButton(
                        tooltip: 'Clear search',
                        onPressed: () {
                          searchController.clear();
                          onSearchChanged('');
                        },
                        icon: const Icon(Icons.close),
                      ),
              ),
              textInputAction: TextInputAction.search,
              onChanged: onSearchChanged,
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterDropdown(
                    label: 'Status',
                    value: statusFilter,
                    values: const [
                      '',
                      'Expired',
                      'Completed',
                    ],
                    onChanged: onStatusChanged,
                  ),
                  const SizedBox(width: 10),
                  _FilterDropdown(
                    label: 'Type',
                    value: typeFilter,
                    values: const [
                      '',
                      'Practice',
                      'Assessment',
                      'Competition',
                      'Surprise',
                    ],
                    onChanged: onTypeChanged,
                  ),
                  const SizedBox(width: 10),
                  _DateRangeControl(
                    dateRange: dateRange,
                    onPressed: onPickDateRange,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DateRangeControl extends StatelessWidget {
  const _DateRangeControl({required this.dateRange, required this.onPressed});

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
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryQuizCard extends StatelessWidget {
  const _HistoryQuizCard({required this.quiz, required this.onReview});

  final QuizSummary quiz;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = studentQuizStatus(quiz);

    return Card(
      child: InkWell(
        onTap: onReview,
        child: Padding(
          padding: const EdgeInsets.all(14),
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
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _fallback(
                            quiz.description,
                            '${quiz.subject} - ${_fallback(quiz.topic, quiz.quizType)}',
                          ),
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
                      _StatusChip(label: status, status: quiz.status),
                      const SizedBox(height: 6),
                      TextButton.icon(
                        onPressed: onReview,
                        icon: const Icon(Icons.rate_review_outlined, size: 18),
                        label: const Text('Review'),
                        style: TextButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                      ),
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
                      icon: Icons.category_outlined,
                      label: _shortQuizType(quiz.quizType),
                    ),
                    const SizedBox(width: 8),
                    _InfoChip(
                      icon: Icons.fact_check_outlined,
                      label: 'Result: ${_resultLabel(quiz)}',
                    ),
                    const SizedBox(width: 8),
                    _InfoChip(
                      icon: Icons.event_outlined,
                      label: _shortDateLabel(_quizDate(quiz)),
                    ),
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

String _shortQuizType(String quizType) {
  if (quizType.startsWith('Practice')) {
    return 'Practice';
  }
  if (quizType.startsWith('Assessment')) {
    return 'Assessment';
  }
  if (quizType.startsWith('Competition')) {
    return 'Competition';
  }
  if (quizType.startsWith('Surprise')) {
    return 'Surprise';
  }

  return quizType;
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
  });

  final String label;
  final bool selected;
  final bool multipleSelection;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
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
            Expanded(child: Text(label)),
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
      'Completed' => Theme.of(context).colorScheme.outline,
      'InProgress' => const Color(0xFF2563EB),
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
        color: color.withValues(alpha: 0.12),
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
  const _InfoChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14),
          const SizedBox(width: 5),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 220),
            child: Text(label, style: Theme.of(context).textTheme.labelSmall),
          ),
        ],
      ),
    );
  }
}

class _OfflineSyncTile extends StatelessWidget {
  const _OfflineSyncTile();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(
              Icons.cloud_done_outlined,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Online. Answers autosave during attempts and offline sync status will appear here.',
              ),
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

class _SampleQuestion {
  const _SampleQuestion({
    required this.prompt,
    required this.questionTypeId,
    required this.options,
    required this.explanation,
    required this.hint,
  });

  final String prompt;
  final int questionTypeId;
  final List<String> options;
  final String explanation;
  final String hint;
}

_SampleQuestion _sampleQuestion(QuizSummary quiz, int index) {
  final mappedQuestions = questionsForQuiz(quiz.id);
  if (index < mappedQuestions.length) {
    final question = mappedQuestions[index];
    final options = optionsForQuestion(question.id)
        .map((option) => option.optionText)
        .toList(growable: false);

    return _SampleQuestion(
      prompt: 'Q${index + 1}. ${question.questionText}',
      questionTypeId: question.questionTypeId,
      options: options,
      explanation: question.explanation,
      hint: question.hint,
    );
  }

  final number = index + 1;

  return _SampleQuestion(
    prompt: 'Q$number. No local-memory question is mapped for this quiz.',
    questionTypeId: 44,
    options: const [],
    explanation: 'No question explanation is available.',
    hint: '',
  );
}

String _reviewAnswerLabel(_SampleQuestion question) {
  if (question.options.isNotEmpty) {
    return question.options.first;
  }

  if (question.questionTypeId == 44) {
    return 'Submitted descriptive answer pending review';
  }

  return 'Submitted text answer';
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

  final hours = remaining.inHours;
  final minutes = remaining.inMinutes.remainder(60).toString().padLeft(2, '0');
  final seconds = remaining.inSeconds.remainder(60).toString().padLeft(2, '0');

  if (hours > 0) {
    return '$hours:$minutes:$seconds left';
  }

  return '$minutes:$seconds left';
}

String _primaryActionLabel(QuizSummary quiz) {
  if (quiz.status == QuizStatus.completed) {
    return 'Review';
  }
  if (quiz.status == QuizStatus.upcoming) {
    return 'View';
  }
  if (quiz.resultStatus == 'In Progress') {
    return 'Continue';
  }
  return 'Start';
}

String _resultLabel(QuizSummary quiz) {
  if (quiz.resultPercent != null) {
    return '${quiz.resultPercent}% - ${quiz.resultStatus}';
  }
  return quiz.resultStatus.isEmpty ? 'Not Started' : quiz.resultStatus;
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

  return resultStatus.isEmpty ? 'Not Started' : resultStatus;
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

String _shortDateLabel(DateTime value) {
  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  return '$day/$month/${value.year}';
}

String _dateRangeLabel(DateTimeRange? dateRange) {
  if (dateRange == null) {
    return 'From date - To date';
  }

  return '${_shortDateLabel(dateRange.start)} - ${_shortDateLabel(dateRange.end)}';
}

bool _isOlderThanOneMonth(QuizSummary quiz) {
  return _quizDate(quiz).isBefore(
    DateTime.now().subtract(const Duration(days: 30)),
  );
}

DateTime _quizDate(QuizSummary quiz) {
  return quiz.dueAt ?? quiz.startAt ?? DateTime.now();
}

String _navigationMessage(String mode) {
  return switch (mode) {
    'Sequential Navigation' => 'Answer questions in order before moving ahead.',
    'Locked Navigation' =>
      'You cannot return after moving to the next question.',
    _ => 'Move freely between all questions.',
  };
}
