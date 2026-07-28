import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/features/admin/presentation/providers/registration_providers.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';
import 'package:rankup_education/features/product_stubs/data/product_stub_models.dart';
import 'package:rankup_education/features/product_stubs/presentation/providers/product_stub_providers.dart';
import 'package:rankup_education/features/product_stubs/presentation/widgets/async_product_page.dart';

const _quizNotificationCategories = {
  'QuizAssigned',
  'QuizSubmitted',
  'QuizAutoSubmitted',
  'QuizReviewed',
};

bool _isQuizCategory(String category) =>
    _quizNotificationCategories.contains(category);

IconData _iconForCategory(String category, {required bool isRead}) {
  if (_isQuizCategory(category)) {
    return isRead ? Icons.quiz_outlined : Icons.quiz;
  }
  if (category == 'RegistrationRequest') {
    return isRead ? Icons.how_to_reg_outlined : Icons.how_to_reg;
  }
  return isRead ? Icons.notifications_none : Icons.notifications_active;
}

String _categoryLabel(String category) {
  return switch (category) {
    'QuizAssigned' => 'Quiz assigned',
    'QuizSubmitted' => 'Quiz submitted',
    'QuizAutoSubmitted' => 'Quiz auto-submitted',
    'QuizReviewed' => 'Quiz reviewed',
    'RegistrationRequest' => 'Registration',
    _ => category,
  };
}

/// In-app notification inbox (admin registration + student/teacher quiz alerts).
class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _pollTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      ref.invalidate(notificationsProvider);
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _onTap(NotificationItem item) async {
    final role =
        ref.read(authControllerProvider).user?.role ?? UserRole.student;
    final isAdmin = isAdminRole(role);
    final remote = ref.read(productStubRemoteDataSourceProvider);

    try {
      if (!item.isRead) {
        await remote.markNotificationRead(item.id);
      }
    } catch (_) {}

    if (!mounted) {
      return;
    }

    if (item.category == 'RegistrationRequest' && isAdmin) {
      try {
        await ref
            .read(registrationRemoteDataSourceProvider)
            .markRegistrationNotificationsRead();
      } catch (_) {}
      if (mounted) {
        context.go('/admin/registrations');
      }
      return;
    }

    if (_isQuizCategory(item.category)) {
      context.go('/quizzes');
      return;
    }

    ref.invalidate(notificationsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(notificationsProvider);
    final role =
        ref.watch(authControllerProvider).user?.role ?? UserRole.student;
    final isAdmin = isAdminRole(role);

    return AsyncProductPage(
      title: 'Notifications',
      asyncValue: async,
      onRefresh: () => ref.invalidate(notificationsProvider),
      icon: Icons.notifications_outlined,
      emptyTitle: 'No notifications',
      emptyMessage: isAdmin
          ? 'Registration and platform alerts appear here.'
          : 'Quiz assignments, submissions, and review updates appear here.',
      isEmpty: (data) => (data as List<NotificationItem>).isEmpty,
      builder: (context, data) {
        final items = data as List<NotificationItem>;
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final item = items[index];
            return Card(
              child: ListTile(
                leading: Icon(
                  _iconForCategory(item.category, isRead: item.isRead),
                ),
                title: Text(
                  item.title,
                  style: TextStyle(
                    fontWeight:
                        item.isRead ? FontWeight.w500 : FontWeight.w700,
                  ),
                ),
                subtitle: Text(item.body),
                trailing: Text(
                  _categoryLabel(item.category),
                  style: Theme.of(context).textTheme.labelSmall,
                ),
                onTap: () => unawaited(_onTap(item)),
              ),
            );
          },
        );
      },
    );
  }
}
