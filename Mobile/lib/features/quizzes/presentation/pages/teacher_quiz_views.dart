import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/lookups/lookup_item.dart';
import 'package:rankup_education/core/lookups/lookup_providers.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/questions/data/models/question_summary_model.dart';
import 'package:rankup_education/features/questions/presentation/providers/question_providers.dart';
import 'package:rankup_education/features/quizzes/data/models/quiz_manage_models.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_status.dart';
import 'package:rankup_education/features/quizzes/domain/entities/quiz_summary.dart';
import 'package:rankup_education/features/quizzes/presentation/controllers/quizzes_controller.dart';
import 'package:rankup_education/features/quizzes/presentation/controllers/teacher_quiz_manage_controller.dart';
import 'package:rankup_education/features/quizzes/presentation/providers/quiz_providers.dart';

/// Teacher-facing quiz list with search, create, and pending reviews.
class TeacherQuizListView extends StatelessWidget {
  const TeacherQuizListView({
    required this.state,
    required this.searchController,
    required this.onSearch,
    required this.onRefresh,
    required this.onOpenQuiz,
    required this.onCreateQuiz,
    required this.onOpenPendingReviews,
    super.key,
  });

  final QuizzesState state;
  final TextEditingController searchController;
  final VoidCallback onSearch;
  final Future<void> Function() onRefresh;
  final ValueChanged<QuizSummary> onOpenQuiz;
  final VoidCallback onCreateQuiz;
  final VoidCallback onOpenPendingReviews;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: FilledButton.icon(
              onPressed: onCreateQuiz,
              icon: const Icon(Icons.add),
              label: const Text('Create quiz'),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: searchController,
            decoration: InputDecoration(
              hintText: 'Search quizzes',
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
          OutlinedButton.icon(
            onPressed: onOpenPendingReviews,
            icon: const Icon(Icons.rate_review_outlined),
            label: const Text('Pending reviews'),
          ),
          const SizedBox(height: 16),
          if (state.isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ),
            )
          else if (state.errorMessage != null)
            AppEmptyState(
              icon: Icons.error_outline,
              title: 'Could not load quizzes',
              message: state.errorMessage!,
            )
          else if (state.quizzes.isEmpty)
            const AppEmptyState(
              icon: Icons.assignment_outlined,
              title: 'No quizzes yet',
              message: 'Create a quiz to get started.',
            )
          else
            for (final quiz in state.quizzes) ...[
              Card(
                child: ListTile(
                  leading: const Icon(Icons.assignment_outlined),
                  title: Text(quiz.title),
                  subtitle: Text(
                    '${quiz.subject} · ${quiz.grade} · ${quiz.questionCount} questions'
                    ' · ${quiz.status.label}',
                  ),
                  trailing: Chip(
                    label: Text(quiz.status.label),
                    visualDensity: VisualDensity.compact,
                  ),
                  onTap: () => onOpenQuiz(quiz),
                ),
              ),
              const SizedBox(height: 8),
            ],
        ],
      ),
    );
  }
}

/// Create quiz metadata form (lookups for class/subject/topic/type).
class TeacherQuizCreateView extends ConsumerStatefulWidget {
  const TeacherQuizCreateView({
    required this.isSaving,
    required this.errorMessage,
    required this.onCancel,
    required this.onSubmit,
    super.key,
  });

  final bool isSaving;
  final String? errorMessage;
  final VoidCallback onCancel;
  final Future<void> Function(CreateQuizInput input) onSubmit;

  @override
  ConsumerState<TeacherQuizCreateView> createState() =>
      _TeacherQuizCreateViewState();
}

class _TeacherQuizCreateViewState extends ConsumerState<TeacherQuizCreateView> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _instructionsController = TextEditingController(
    text: 'Read all questions carefully before answering.',
  );
  int? _classId;
  int? _subjectId;
  int? _topicId;
  int? _difficultyId;
  int? _quizTypeId;
  int _allowedAttempts = 1;
  bool _shuffleQuestions = false;
  bool _shuffleOptions = true;
  bool _isReviewRequired = true;
  String? _localError;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _localError = null);
    if (_titleController.text.trim().isEmpty) {
      setState(() => _localError = 'Title is required.');
      return;
    }
    if (_classId == null ||
        _subjectId == null ||
        _topicId == null ||
        _difficultyId == null ||
        _quizTypeId == null) {
      setState(
        () => _localError =
            'Class, subject, topic, difficulty, and type are required.',
      );
      return;
    }
    if (_instructionsController.text.trim().isEmpty) {
      setState(() => _localError = 'Instructions are required.');
      return;
    }

    await widget.onSubmit(
      CreateQuizInput(
        title: _titleController.text,
        description: _descriptionController.text,
        classId: _classId!,
        subjectId: _subjectId!,
        topicId: _topicId!,
        difficultyLevelId: _difficultyId!,
        quizTypeId: _quizTypeId!,
        instructions: _instructionsController.text,
        allowedAttempts: _allowedAttempts,
        shuffleQuestions: _shuffleQuestions,
        shuffleOptions: _shuffleOptions,
        isReviewRequired: _isReviewRequired,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final classes = ref.watch(
      lookupsProvider((type: LookupTypes.classType, parentId: null)),
    );
    final subjects = ref.watch(
      lookupsProvider((type: LookupTypes.subject, parentId: null)),
    );
    final topics = ref.watch(
      lookupsProvider((type: LookupTypes.topic, parentId: _subjectId)),
    );
    final difficulties = ref.watch(
      lookupsProvider((type: LookupTypes.difficulty, parentId: null)),
    );
    final quizTypes = ref.watch(
      lookupsProvider((type: LookupTypes.quizType, parentId: null)),
    );

    final error = _localError ?? widget.errorMessage;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (error != null) ...[
          _MessageBanner(message: error, isError: true),
          const SizedBox(height: 12),
        ],
        TextField(
          controller: _titleController,
          enabled: !widget.isSaving,
          decoration: const InputDecoration(labelText: 'Title *'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _descriptionController,
          enabled: !widget.isSaving,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Description'),
        ),
        const SizedBox(height: 12),
        _LookupDropdown(
          label: 'Class *',
          async: classes,
          value: _classId,
          enabled: !widget.isSaving,
          onChanged: (value) => setState(() => _classId = value),
        ),
        const SizedBox(height: 12),
        _LookupDropdown(
          label: 'Subject *',
          async: subjects,
          value: _subjectId,
          enabled: !widget.isSaving,
          onChanged: (value) => setState(() {
            _subjectId = value;
            _topicId = null;
          }),
        ),
        const SizedBox(height: 12),
        _LookupDropdown(
          label: 'Topic *',
          async: topics,
          value: _topicId,
          enabled: !widget.isSaving && _subjectId != null,
          onChanged: (value) => setState(() => _topicId = value),
        ),
        const SizedBox(height: 12),
        _LookupDropdown(
          label: 'Difficulty *',
          async: difficulties,
          value: _difficultyId,
          enabled: !widget.isSaving,
          onChanged: (value) => setState(() => _difficultyId = value),
        ),
        const SizedBox(height: 12),
        _LookupDropdown(
          label: 'Quiz type *',
          async: quizTypes,
          value: _quizTypeId,
          enabled: !widget.isSaving,
          onChanged: (value) => setState(() => _quizTypeId = value),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _instructionsController,
          enabled: !widget.isSaving,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Instructions *'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          initialValue: _allowedAttempts.toString(),
          enabled: !widget.isSaving,
          decoration: const InputDecoration(labelText: 'Attempts'),
          keyboardType: TextInputType.number,
          onChanged: (value) {
            _allowedAttempts = int.tryParse(value) ?? 1;
          },
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Shuffle questions'),
          value: _shuffleQuestions,
          onChanged: widget.isSaving
              ? null
              : (value) => setState(() => _shuffleQuestions = value),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Shuffle options'),
          value: _shuffleOptions,
          onChanged: widget.isSaving
              ? null
              : (value) => setState(() => _shuffleOptions = value),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Review required'),
          value: _isReviewRequired,
          onChanged: widget.isSaving
              ? null
              : (value) => setState(() => _isReviewRequired = value),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: widget.isSaving ? null : widget.onCancel,
                child: const Text('Cancel'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                onPressed: widget.isSaving ? null : _submit,
                child: Text(widget.isSaving ? 'Creating…' : 'Create quiz'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// Manage hub: questions, publish, assign, and bank attach.
class TeacherQuizManageView extends StatelessWidget {
  const TeacherQuizManageView({
    required this.state,
    required this.onBack,
    required this.onRefresh,
    required this.onPublish,
    required this.onAssign,
    required this.onAddQuestion,
    required this.onAttachFromBank,
    required this.onRemoveQuestion,
    this.onDuplicate,
    this.onArchive,
    this.onCancel,
    this.onMonitor,
    this.onAllowRetry,
    super.key,
  });

  final TeacherQuizManageState state;
  final VoidCallback onBack;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onPublish;
  final VoidCallback onAssign;
  final VoidCallback onAddQuestion;
  final VoidCallback onAttachFromBank;
  final Future<void> Function(String questionId) onRemoveQuestion;
  final VoidCallback? onDuplicate;
  final VoidCallback? onArchive;
  final VoidCallback? onCancel;
  final VoidCallback? onMonitor;
  final ValueChanged<String>? onAllowRetry;

  @override
  Widget build(BuildContext context) {
    if (state.isLoading && state.manageQuiz == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final quiz = state.manageQuiz;
    if (quiz == null) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          AppEmptyState(
            icon: Icons.error_outline,
            title: 'Quiz unavailable',
            message: state.errorMessage ?? 'Unable to load manage view.',
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back),
            label: const Text('Back to list'),
          ),
        ],
      );
    }

    final canEditQuestions = quiz.isDraft || quiz.isPublished;
    final canPublish = quiz.isDraft && quiz.questionCount > 0;
    final canAssign = (quiz.isPublished || quiz.isAssigned) && quiz.isApproved;

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (state.errorMessage != null) ...[
            _MessageBanner(message: state.errorMessage!, isError: true),
            const SizedBox(height: 12),
          ],
          if (state.successMessage != null) ...[
            _MessageBanner(message: state.successMessage!, isError: false),
            const SizedBox(height: 12),
          ],
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    quiz.title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      Chip(label: Text(quiz.lifecycleStatus)),
                      Chip(label: Text(quiz.approvalStatus)),
                      Chip(label: Text(quiz.quizType)),
                      Chip(label: Text('${quiz.questionCount} questions')),
                      Chip(label: Text('${quiz.totalMarks} marks')),
                    ],
                  ),
                  if (quiz.rejectionReason != null &&
                      quiz.rejectionReason!.trim().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Rejection: ${quiz.rejectionReason}',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  if (quiz.description.trim().isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(quiz.description),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (canPublish)
                FilledButton.icon(
                  onPressed: state.isSaving ? null : onPublish,
                  icon: const Icon(Icons.publish_outlined),
                  label: Text(state.isSaving ? 'Working…' : 'Publish'),
                ),
              if (canAssign)
                FilledButton.tonalIcon(
                  onPressed: state.isSaving ? null : onAssign,
                  icon: const Icon(Icons.group_add_outlined),
                  label: const Text('Assign'),
                ),
              if (onDuplicate != null)
                OutlinedButton.icon(
                  onPressed: state.isSaving ? null : onDuplicate,
                  icon: const Icon(Icons.copy_outlined),
                  label: const Text('Duplicate'),
                ),
              if (quiz.isPublished && onArchive != null)
                OutlinedButton.icon(
                  onPressed: state.isSaving ? null : onArchive,
                  icon: const Icon(Icons.archive_outlined),
                  label: const Text('Archive'),
                ),
              if (quiz.isAssigned && onCancel != null)
                OutlinedButton.icon(
                  onPressed: state.isSaving ? null : onCancel,
                  icon: const Icon(Icons.cancel_outlined),
                  label: const Text('Cancel assignments'),
                ),
              if (quiz.isAssigned && onMonitor != null)
                OutlinedButton.icon(
                  onPressed: onMonitor,
                  icon: const Icon(Icons.monitor_heart_outlined),
                  label: const Text('Monitor'),
                ),
              if (canEditQuestions) ...[
                OutlinedButton.icon(
                  onPressed: state.isSaving ? null : onAddQuestion,
                  icon: const Icon(Icons.add),
                  label: const Text('Add question'),
                ),
                OutlinedButton.icon(
                  onPressed: state.isSaving ? null : onAttachFromBank,
                  icon: const Icon(Icons.library_add_outlined),
                  label: const Text('From bank'),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Questions',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          if (quiz.questions.isEmpty)
            const AppEmptyState(
              icon: Icons.help_outline,
              title: 'No questions yet',
              message: 'Add an inline question or attach one from the bank.',
            )
          else
            for (final question in quiz.questions) ...[
              Card(
                child: ListTile(
                  title: Text(question.questionText),
                  subtitle: Text(
                    '${question.questionType} · ${question.marks} marks',
                  ),
                  trailing: canEditQuestions
                      ? IconButton(
                          tooltip: 'Remove',
                          onPressed: state.isSaving
                              ? null
                              : () => onRemoveQuestion(question.questionId),
                          icon: const Icon(Icons.delete_outline),
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 8),
            ],
          const SizedBox(height: 16),
          Text(
            'Assignments (${state.assignments.length})',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          if (state.assignments.isEmpty)
            const Text('No assignments yet.')
          else
            for (final assignment in state.assignments.take(20)) ...[
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(assignment.studentName),
                subtitle: Text(
                  '${assignment.resultStatus} · attempts ${assignment.attemptCount}/${assignment.allowedAttempts}',
                ),
                trailing: assignment.isReviewDone && onAllowRetry != null
                    ? TextButton(
                        onPressed: state.isSaving
                            ? null
                            : () => onAllowRetry!(assignment.assignmentId),
                        child: const Text('Allow retry'),
                      )
                    : null,
              ),
            ],
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back),
            label: const Text('Back to list'),
          ),
        ],
      ),
    );
  }
}

/// Pending subjective reviews queue.
class TeacherPendingReviewsView extends StatelessWidget {
  const TeacherPendingReviewsView({
    required this.state,
    required this.onRefresh,
    required this.onOpenReview,
    super.key,
  });

  final TeacherQuizManageState state;
  final Future<void> Function() onRefresh;
  final void Function(PendingReviewItem item) onOpenReview;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (state.errorMessage != null) ...[
            _MessageBanner(message: state.errorMessage!, isError: true),
            const SizedBox(height: 12),
          ],
          if (state.isLoading)
            const Center(child: CircularProgressIndicator())
          else if (state.pendingReviews.isEmpty)
            const AppEmptyState(
              icon: Icons.rate_review_outlined,
              title: 'No pending reviews',
              message: 'Submitted attempts that need marking will appear here.',
            )
          else
            for (final item in state.pendingReviews) ...[
              Card(
                child: ListTile(
                  title: Text(item.quizTitle),
                  subtitle: Text(
                    '${item.studentName} · attempt ${item.attemptNumber}'
                    '\n${item.obtainedMarks}/${item.totalMarks} marks',
                  ),
                  isThreeLine: true,
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => onOpenReview(item),
                ),
              ),
              const SizedBox(height: 8),
            ],
        ],
      ),
    );
  }
}

/// Mark and finalize a subjective attempt.
class TeacherAttemptReviewView extends StatelessWidget {
  const TeacherAttemptReviewView({
    required this.state,
    required this.onSaveMarks,
    required this.onFinalize,
    required this.onMarksChanged,
    super.key,
  });

  final TeacherQuizManageState state;
  final Future<void> Function() onSaveMarks;
  final Future<void> Function() onFinalize;
  final void Function({
    required String questionId,
    required int awardedMarks,
    String? feedback,
  }) onMarksChanged;

  @override
  Widget build(BuildContext context) {
    if (state.isLoading && state.attemptReview == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final review = state.attemptReview;
    if (review == null) {
      return AppEmptyState(
        icon: Icons.error_outline,
        title: 'Review unavailable',
        message: state.errorMessage ?? 'Unable to load attempt review.',
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (state.errorMessage != null) ...[
          _MessageBanner(message: state.errorMessage!, isError: true),
          const SizedBox(height: 12),
        ],
        if (state.successMessage != null) ...[
          _MessageBanner(message: state.successMessage!, isError: false),
          const SizedBox(height: 12),
        ],
        Text(
          review.quizTitle,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 4),
        Text(
          '${review.studentName} · attempt ${review.attemptNumber}'
          ' · ${review.obtainedMarks}/${review.totalMarks}',
        ),
        if (review.isReviewDone)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Chip(label: Text('Review done')),
          ),
        const SizedBox(height: 16),
        for (final question in review.questions) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    question.questionText,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${question.questionType} · max ${question.maxMarks}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if (question.submittedText != null &&
                      question.submittedText!.trim().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Answer: ${question.submittedText}'),
                  ],
                  if (question.aiFeedback != null &&
                      question.aiFeedback!.trim().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'AI suggestion: ${question.aiFeedback}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                  if (question.requiresReview && !review.isReviewDone) ...[
                    const SizedBox(height: 8),
                    TextFormField(
                      initialValue: question.awardedMarks.toString(),
                      decoration: const InputDecoration(
                        labelText: 'Awarded marks',
                      ),
                      keyboardType: TextInputType.number,
                      onChanged: (value) {
                        final marks = int.tryParse(value) ?? 0;
                        onMarksChanged(
                          questionId: question.questionId,
                          awardedMarks: marks.clamp(0, question.maxMarks),
                          feedback: question.parentFeedback,
                        );
                      },
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      initialValue: question.parentFeedback ?? '',
                      decoration: const InputDecoration(labelText: 'Feedback'),
                      maxLines: 2,
                      onChanged: (value) {
                        onMarksChanged(
                          questionId: question.questionId,
                          awardedMarks: question.awardedMarks,
                          feedback: value,
                        );
                      },
                    ),
                  ] else ...[
                    const SizedBox(height: 8),
                    Text('Awarded: ${question.awardedMarks}'),
                    if (question.parentFeedback != null &&
                        question.parentFeedback!.trim().isNotEmpty)
                      Text('Feedback: ${question.parentFeedback}'),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
        if (!review.isReviewDone) ...[
          const SizedBox(height: 8),
          FilledButton(
            onPressed: state.isSaving ? null : onSaveMarks,
            child: Text(state.isSaving ? 'Saving…' : 'Save marks'),
          ),
          const SizedBox(height: 8),
          FilledButton.tonal(
            onPressed: state.isSaving ? null : onFinalize,
            child: const Text('Finalize review'),
          ),
        ],
      ],
    );
  }
}

/// Bottom sheet to assign selected students or all in grade.
Future<AssignQuizInput?> showTeacherAssignSheet(
  BuildContext context, {
  required UserRole role,
  required String defaultGradeLabel,
  int? defaultAllowedAttempts,
}) {
  return showModalBottomSheet<AssignQuizInput>(
    context: context,
    isScrollControlled: true,
    builder: (context) {
      return _AssignSheet(
        role: role,
        defaultGradeLabel: defaultGradeLabel,
        defaultAllowedAttempts: defaultAllowedAttempts ?? 1,
      );
    },
  );
}

/// Dialog to add a simple inline question.
Future<AddInlineQuestionInput?> showAddInlineQuestionDialog(
  BuildContext context,
) {
  return showDialog<AddInlineQuestionInput>(
    context: context,
    builder: (context) => const _AddInlineQuestionDialog(),
  );
}

/// Dialog to pick an approved bank question.
Future<QuestionSummaryModel?> showAttachBankQuestionDialog(
  BuildContext context,
) {
  return showDialog<QuestionSummaryModel>(
    context: context,
    builder: (context) => const _AttachBankQuestionDialog(),
  );
}

class _AssignSheet extends ConsumerStatefulWidget {
  const _AssignSheet({
    required this.role,
    required this.defaultGradeLabel,
    required this.defaultAllowedAttempts,
  });

  final UserRole role;
  final String defaultGradeLabel;
  final int defaultAllowedAttempts;

  @override
  ConsumerState<_AssignSheet> createState() => _AssignSheetState();
}

class _AssignSheetState extends ConsumerState<_AssignSheet> {
  late String _mode;
  final _searchController = TextEditingController();
  final _groupController = TextEditingController();
  final _sectionController = TextEditingController();
  final _schoolIdsController = TextEditingController();
  final Set<String> _selectedIds = {};
  late DateTime _startAt;
  late DateTime _endAt;
  late int _allowedAttempts;
  String? _error;

  @override
  void initState() {
    super.initState();
    _mode = assignModesForRole(widget.role).first.value;
    final now = DateTime.now();
    _startAt = now.add(const Duration(hours: 1));
    _endAt = now.add(const Duration(hours: 25));
    _allowedAttempts = widget.defaultAllowedAttempts;
    Future.microtask(
      () =>
          ref.read(teacherQuizManageControllerProvider.notifier).loadStudents(),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    _groupController.dispose();
    _sectionController.dispose();
    _schoolIdsController.dispose();
    super.dispose();
  }

  int? _parseGrade() {
    final match = RegExp(r'\d+').firstMatch(widget.defaultGradeLabel);
    return match == null ? null : int.tryParse(match.group(0)!);
  }

  void _submit() {
    setState(() => _error = null);
    if (!_endAt.isAfter(_startAt)) {
      setState(() => _error = 'End must be after start.');
      return;
    }
    if ((_mode == 'one' || _mode == 'selected') && _selectedIds.isEmpty) {
      setState(() => _error = 'Select at least one student.');
      return;
    }
    if (_mode == 'one' && _selectedIds.length != 1) {
      setState(() => _error = 'Select exactly one student.');
      return;
    }
    if ((_mode == 'allingrade' || _mode == 'allinsection') &&
        _parseGrade() == null) {
      setState(() => _error = 'Could not determine grade from quiz.');
      return;
    }
    final groupId = int.tryParse(_groupController.text.trim());
    if (_mode == 'group' && groupId == null) {
      setState(() => _error = 'Enter a valid group ID.');
      return;
    }
    if (_mode == 'allinsection' && _sectionController.text.trim().isEmpty) {
      setState(() => _error = 'Section is required.');
      return;
    }
    final schoolIds = _schoolIdsController.text
        .split(',')
        .map((value) => int.tryParse(value.trim()))
        .toList();
    if (_mode == 'multischool' &&
        (schoolIds.isEmpty || schoolIds.any((id) => id == null))) {
      setState(() => _error = 'Enter valid comma-separated school IDs.');
      return;
    }

    Navigator.of(context).pop(
      AssignQuizInput(
        mode: _mode,
        studentIds:
            _mode == 'one' || _mode == 'selected' ? _selectedIds.toList() : [],
        groupId: _mode == 'group' ? groupId : null,
        startAt: _startAt,
        endAt: _endAt,
        allowedAttempts: _allowedAttempts,
        gradeId: _mode == 'allingrade' || _mode == 'allinsection'
            ? _parseGrade()
            : null,
        section:
            _mode == 'allinsection' ? _sectionController.text.trim() : null,
        schoolIds: _mode == 'multischool'
            ? schoolIds.whereType<int>().toList()
            : const [],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(teacherQuizManageControllerProvider);
    final manage = ref.read(teacherQuizManageControllerProvider.notifier);
    final bottom = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Assign quiz',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              key: ValueKey(_mode),
              initialValue: _mode,
              decoration: const InputDecoration(labelText: 'Assignment mode'),
              items: [
                for (final mode in assignModesForRole(widget.role))
                  DropdownMenuItem(value: mode.value, child: Text(mode.label)),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _mode = value;
                    _selectedIds.clear();
                  });
                }
              },
            ),
            const SizedBox(height: 12),
            if (_mode == 'one' || _mode == 'selected') ...[
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  labelText: 'Search students',
                  suffixIcon: IconButton(
                    onPressed: () {
                      manage.loadStudents(
                        search: _searchController.text.trim(),
                      );
                    },
                    icon: const Icon(Icons.search),
                  ),
                ),
                onSubmitted: (value) {
                  manage.loadStudents(search: value.trim());
                },
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 220,
                child: state.students.isEmpty
                    ? const Center(child: Text('No students found.'))
                    : ListView.builder(
                        itemCount: state.students.length,
                        itemBuilder: (context, index) {
                          final student = state.students[index];
                          final selected =
                              _selectedIds.contains(student.studentId);
                          return CheckboxListTile(
                            value: selected,
                            title: Text(student.fullName),
                            subtitle: Text(
                              'Grade ${student.grade} · ${student.section}',
                            ),
                            onChanged: (value) {
                              setState(() {
                                if (value ?? false) {
                                  if (_mode == 'one') {
                                    _selectedIds.clear();
                                  }
                                  _selectedIds.add(student.studentId);
                                } else {
                                  _selectedIds.remove(student.studentId);
                                }
                              });
                            },
                          );
                        },
                      ),
              ),
            ] else if (_mode == 'group')
              TextField(
                controller: _groupController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Group ID'),
              )
            else if (_mode == 'allinsection') ...[
              Text(
                'Grade is taken from ${widget.defaultGradeLabel}.',
              ),
              TextField(
                controller: _sectionController,
                decoration: const InputDecoration(labelText: 'Section'),
              ),
            ] else if (_mode == 'multischool')
              TextField(
                controller: _schoolIdsController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'School IDs',
                  hintText: '12, 18, 24',
                ),
              )
            else if (_mode == 'allingrade')
              Text(
                'Assigns to all active students in ${widget.defaultGradeLabel}.',
              )
            else
              Text(
                switch (_mode) {
                  'allinschool' =>
                    'Assigns to all active students in your school.',
                  'public' => 'Publishes this quiz to the public catalog.',
                  'alllinked' =>
                    'Assigns to all children linked to your account.',
                  _ => 'The selected audience will receive this quiz.',
                },
              ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Start'),
              subtitle: Text(_startAt.toLocal().toString()),
              trailing: IconButton(
                icon: const Icon(Icons.edit_calendar),
                onPressed: () async {
                  final picked = await _pickDateTime(context, _startAt);
                  if (picked != null) {
                    setState(() => _startAt = picked);
                  }
                },
              ),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('End'),
              subtitle: Text(_endAt.toLocal().toString()),
              trailing: IconButton(
                icon: const Icon(Icons.edit_calendar),
                onPressed: () async {
                  final picked = await _pickDateTime(context, _endAt);
                  if (picked != null) {
                    setState(() => _endAt = picked);
                  }
                },
              ),
            ),
            TextFormField(
              initialValue: _allowedAttempts.toString(),
              decoration: const InputDecoration(labelText: 'Allowed attempts'),
              keyboardType: TextInputType.number,
              onChanged: (value) {
                _allowedAttempts = int.tryParse(value) ?? 1;
              },
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _submit,
              child: const Text('Assign'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddInlineQuestionDialog extends StatefulWidget {
  const _AddInlineQuestionDialog();

  @override
  State<_AddInlineQuestionDialog> createState() =>
      _AddInlineQuestionDialogState();
}

class _AddInlineQuestionDialogState extends State<_AddInlineQuestionDialog> {
  final _textController = TextEditingController();
  final _optionControllers = [
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
  ];
  final _imageControllers = [
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
  ];
  final _acceptedController = TextEditingController();
  String _type = 'Single Choice';
  int _marks = 1;
  int _correctIndex = 0;
  final Set<int> _correctIndexes = {};
  bool _allowTeacherReview = false;
  bool _allowAiReview = false;
  String? _error;

  @override
  void dispose() {
    _textController.dispose();
    for (final controller in _optionControllers) {
      controller.dispose();
    }
    for (final controller in _imageControllers) {
      controller.dispose();
    }
    _acceptedController.dispose();
    super.dispose();
  }

  void _submit() {
    setState(() => _error = null);
    final text = _textController.text.trim();
    if (text.isEmpty) {
      setState(() => _error = 'Question text is required.');
      return;
    }

    if (_type == 'Fill in the Blanks') {
      final accepted = _acceptedController.text.trim();
      if (accepted.isEmpty) {
        setState(() => _error = 'Accepted answer is required.');
        return;
      }
      Navigator.of(context).pop(
        AddInlineQuestionInput(
          questionText: text,
          questionType: _type,
          marks: _marks,
          estimatedTimeSeconds: 60,
          acceptedAnswers: [
            InlineAcceptedAnswerInput(
              answerText: accepted,
              allowAiReview: _allowAiReview,
              allowTeacherReview: _allowTeacherReview,
            ),
          ],
        ),
      );
      return;
    }

    if (_type == 'Descriptive' || _type == 'File Upload') {
      Navigator.of(context).pop(
        AddInlineQuestionInput(
          questionText: text,
          questionType: _type,
          marks: _marks,
          estimatedTimeSeconds: 120,
        ),
      );
      return;
    }

    final options = <InlineQuestionOptionInput>[];
    if (_type == 'True/False') {
      options.addAll([
        InlineQuestionOptionInput(
          optionText: 'True',
          isCorrect: _correctIndex == 0,
        ),
        InlineQuestionOptionInput(
          optionText: 'False',
          isCorrect: _correctIndex == 1,
        ),
      ]);
    } else {
      for (var i = 0; i < _optionControllers.length; i++) {
        final optionText = _optionControllers[i].text.trim();
        if (optionText.isEmpty) {
          continue;
        }
        options.add(
          InlineQuestionOptionInput(
            optionText: optionText,
            isCorrect: _type == 'Multiple Choice'
                ? _correctIndexes.contains(i)
                : _type != 'Matching' &&
                    _type != 'Ordering' &&
                    i == _correctIndex,
            optionImageUrl:
                _type == 'Media' ? _imageControllers[i].text.trim() : null,
          ),
        );
      }
    }
    final minimum = _type == 'Matching' ? 4 : 2;
    if (options.length < minimum) {
      setState(() => _error = 'Add at least $minimum options.');
      return;
    }
    if (_type == 'Matching' && options.length.isOdd) {
      setState(() => _error = 'Matching requires an even number of options.');
      return;
    }
    if (_type == 'Media' &&
        options.any((option) => (option.optionImageUrl ?? '').isEmpty)) {
      setState(() => _error = 'Each media option needs an image URL.');
      return;
    }
    if (_type != 'Matching' &&
        _type != 'Ordering' &&
        !options.any((option) => option.isCorrect)) {
      setState(() => _error = 'Mark at least one correct option.');
      return;
    }

    Navigator.of(context).pop(
      AddInlineQuestionInput(
        questionText: text,
        questionType: _type,
        marks: _marks,
        estimatedTimeSeconds: 60,
        options: options,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add question'),
      content: SingleChildScrollView(
        child: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _textController,
                decoration: const InputDecoration(labelText: 'Question text'),
                maxLines: 3,
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                key: ValueKey(_type),
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Type'),
                items: const [
                  DropdownMenuItem(
                    value: 'Single Choice',
                    child: Text('Single Choice'),
                  ),
                  DropdownMenuItem(
                    value: 'Multiple Choice',
                    child: Text('Multiple Choice'),
                  ),
                  DropdownMenuItem(
                    value: 'True/False',
                    child: Text('True/False'),
                  ),
                  DropdownMenuItem(
                    value: 'Fill in the Blanks',
                    child: Text('Fill in the Blanks'),
                  ),
                  DropdownMenuItem(
                    value: 'Descriptive',
                    child: Text('Descriptive'),
                  ),
                  DropdownMenuItem(
                    value: 'File Upload',
                    child: Text('File Upload'),
                  ),
                  DropdownMenuItem(
                    value: 'Matching',
                    child: Text('Matching'),
                  ),
                  DropdownMenuItem(
                    value: 'Ordering',
                    child: Text('Ordering'),
                  ),
                  DropdownMenuItem(
                    value: 'Media',
                    child: Text('Media'),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _type = value);
                  }
                },
              ),
              const SizedBox(height: 8),
              TextFormField(
                initialValue: _marks.toString(),
                decoration: const InputDecoration(labelText: 'Marks'),
                keyboardType: TextInputType.number,
                onChanged: (value) => _marks = int.tryParse(value) ?? 1,
              ),
              if (_type == 'Single Choice' ||
                  _type == 'Multiple Choice' ||
                  _type == 'Matching' ||
                  _type == 'Ordering' ||
                  _type == 'Media') ...[
                const SizedBox(height: 8),
                if (_type == 'Multiple Choice' ||
                    _type == 'Matching' ||
                    _type == 'Ordering')
                  for (var i = 0; i < _optionControllers.length; i++)
                    Column(
                      children: [
                        if (_type == 'Multiple Choice')
                          CheckboxListTile(
                            value: _correctIndexes.contains(i),
                            onChanged: (value) => setState(() {
                              (value ?? false)
                                  ? _correctIndexes.add(i)
                                  : _correctIndexes.remove(i);
                            }),
                            title: TextField(
                              controller: _optionControllers[i],
                              decoration: InputDecoration(
                                labelText: 'Option ${i + 1}',
                              ),
                            ),
                          )
                        else
                          TextField(
                            controller: _optionControllers[i],
                            decoration: InputDecoration(
                              labelText: _type == 'Matching'
                                  ? const ['L1', 'L2', 'R1', 'R2'][i]
                                  : 'Ordered item ${i + 1}',
                            ),
                          ),
                      ],
                    )
                else
                  RadioGroup<int>(
                    groupValue: _correctIndex,
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _correctIndex = value);
                      }
                    },
                    child: Column(
                      children: [
                        for (var i = 0; i < _optionControllers.length; i++)
                          Column(
                            children: [
                              RadioListTile<int>(
                                value: i,
                                title: TextField(
                                  controller: _optionControllers[i],
                                  decoration: InputDecoration(
                                    labelText: 'Option ${i + 1}',
                                  ),
                                ),
                              ),
                              if (_type == 'Media')
                                Padding(
                                  padding: const EdgeInsets.only(
                                    left: 16,
                                    right: 16,
                                    bottom: 8,
                                  ),
                                  child: TextField(
                                    controller: _imageControllers[i],
                                    decoration: InputDecoration(
                                      labelText: 'Image URL ${i + 1}',
                                    ),
                                    keyboardType: TextInputType.url,
                                  ),
                                ),
                            ],
                          ),
                      ],
                    ),
                  ),
              ],
              if (_type == 'True/False')
                RadioGroup<int>(
                  groupValue: _correctIndex,
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _correctIndex = value);
                    }
                  },
                  child: const Column(
                    children: [
                      RadioListTile<int>(
                        value: 0,
                        title: Text('True is correct'),
                      ),
                      RadioListTile<int>(
                        value: 1,
                        title: Text('False is correct'),
                      ),
                    ],
                  ),
                ),
              if (_type == 'Fill in the Blanks') ...[
                const SizedBox(height: 8),
                TextField(
                  controller: _acceptedController,
                  decoration:
                      const InputDecoration(labelText: 'Accepted answer'),
                ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _allowTeacherReview,
                  onChanged: (value) {
                    setState(() => _allowTeacherReview = value ?? false);
                  },
                  title: const Text('Allow teacher review'),
                ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _allowAiReview,
                  onChanged: (value) {
                    setState(() => _allowAiReview = value ?? false);
                  },
                  title: const Text('Allow AI review'),
                ),
              ],
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    _error!,
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _submit,
          child: const Text('Add'),
        ),
      ],
    );
  }
}

class _AttachBankQuestionDialog extends ConsumerWidget {
  const _AttachBankQuestionDialog();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(eligibleBankQuestionsProvider);

    return AlertDialog(
      title: const Text('Attach from bank'),
      content: SizedBox(
        width: 420,
        height: 360,
        child: async.when(
          data: (items) {
            final eligible = items.where((item) => item.isQuizReady).toList();
            if (eligible.isEmpty) {
              return const Center(
                child: Text('No Public+Active bank questions.'),
              );
            }
            return ListView.builder(
              itemCount: eligible.length,
              itemBuilder: (context, index) {
                final item = eligible[index];
                return ListTile(
                  title: Text(item.text),
                  subtitle: Text('${item.questionType} · ${item.marks} marks'),
                  onTap: () => Navigator.of(context).pop(item),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text(error.toString())),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
      ],
    );
  }
}

class _LookupDropdown extends StatelessWidget {
  const _LookupDropdown({
    required this.label,
    required this.async,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final String label;
  final AsyncValue<List<LookupItem>> async;
  final int? value;
  final ValueChanged<int?> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return async.when(
      data: (items) {
        return DropdownButtonFormField<int>(
          key: ValueKey(value),
          initialValue: items.any((item) => item.id == value) ? value : null,
          decoration: InputDecoration(labelText: label),
          items: [
            for (final item in items)
              DropdownMenuItem(value: item.id, child: Text(item.name)),
          ],
          onChanged: enabled ? onChanged : null,
        );
      },
      loading: () => InputDecorator(
        decoration: InputDecoration(labelText: label),
        child: const LinearProgressIndicator(),
      ),
      error: (error, _) => InputDecorator(
        decoration: InputDecoration(labelText: label, errorText: '$error'),
        child: const Text('Failed to load'),
      ),
    );
  }
}

class _MessageBanner extends StatelessWidget {
  const _MessageBanner({required this.message, required this.isError});

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isError
            ? scheme.errorContainer
            : scheme.primaryContainer.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        message,
        style: TextStyle(
          color: isError ? scheme.onErrorContainer : scheme.onPrimaryContainer,
        ),
      ),
    );
  }
}

Future<DateTime?> _pickDateTime(BuildContext context, DateTime initial) async {
  final date = await showDatePicker(
    context: context,
    initialDate: initial,
    firstDate: DateTime.now().subtract(const Duration(days: 1)),
    lastDate: DateTime.now().add(const Duration(days: 365)),
  );
  if (date == null || !context.mounted) {
    return null;
  }
  final time = await showTimePicker(
    context: context,
    initialTime: TimeOfDay.fromDateTime(initial),
  );
  if (time == null) {
    return null;
  }
  return DateTime(date.year, date.month, date.day, time.hour, time.minute);
}
