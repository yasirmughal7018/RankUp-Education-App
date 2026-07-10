import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/features/admin/presentation/pages/admin_dashboard_page.dart';
import 'package:rankup_education/features/admin/presentation/pages/pending_registrations_page.dart';
import 'package:rankup_education/features/ai_assistant/presentation/pages/ai_assistant_page.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:rankup_education/features/authentication/presentation/pages/change_password_page.dart';
import 'package:rankup_education/features/authentication/presentation/pages/login_page.dart';
import 'package:rankup_education/features/authentication/presentation/pages/splash_page.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';
import 'package:rankup_education/features/discussions/presentation/pages/discussions_page.dart';
import 'package:rankup_education/features/messaging/presentation/pages/messages_page.dart';
import 'package:rankup_education/features/notifications/presentation/pages/notifications_page.dart';
import 'package:rankup_education/features/parent_dashboard/presentation/pages/parent_dashboard_page.dart';
import 'package:rankup_education/features/profile/presentation/pages/profile_page.dart';
import 'package:rankup_education/features/questions/presentation/pages/questions_page.dart';
import 'package:rankup_education/features/quizzes/presentation/pages/quizzes_page.dart';
import 'package:rankup_education/features/rankings/presentation/pages/rankings_page.dart';
import 'package:rankup_education/features/reports/presentation/pages/reports_page.dart';
import 'package:rankup_education/features/settings/presentation/pages/settings_page.dart';
import 'package:rankup_education/features/student_dashboard/presentation/pages/student_dashboard_page.dart';
import 'package:rankup_education/features/teacher_dashboard/presentation/pages/teacher_dashboard_page.dart';
import 'package:rankup_education/features/worksheets/presentation/pages/worksheets_page.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      final user = authState.user;
      final isAuthenticated = user != null;
      final location = state.uri.path;
      final isAuthRoute = location == '/login' || location == '/';
      final isChangePasswordRoute = location == '/change-password';

      if (!isAuthenticated && !isAuthRoute) {
        return '/login';
      }

      if (isAuthenticated && user.mustChangePassword) {
        return isChangePasswordRoute ? null : '/change-password';
      }

      if (isAuthenticated && isChangePasswordRoute) {
        return _dashboardPath(user.role);
      }

      if (isAuthenticated && isAuthRoute) {
        return _dashboardPath(user.role);
      }

      if (isAuthenticated &&
          (location.startsWith('/admin') || location == '/notifications') &&
          !isAdminRole(user.role)) {
        return _dashboardPath(user.role);
      }

      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const SplashPage()),
      GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
      GoRoute(
        path: '/change-password',
        builder: (context, state) => const ChangePasswordPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => _RoleShell(child: child),
        routes: [
          GoRoute(
            path: '/student',
            builder: (context, state) => const StudentDashboardPage(),
          ),
          GoRoute(
            path: '/parent',
            builder: (context, state) => const ParentDashboardPage(),
          ),
          GoRoute(
            path: '/teacher',
            builder: (context, state) => const TeacherDashboardPage(),
          ),
          GoRoute(
            path: '/admin',
            builder: (context, state) => const AdminDashboardPage(),
          ),
          GoRoute(
            path: '/admin/registrations',
            builder: (context, state) => const PendingRegistrationsPage(),
          ),
          GoRoute(
            path: '/notifications',
            builder: (context, state) => const NotificationsPage(),
          ),
          GoRoute(
            path: '/quizzes',
            builder: (context, state) => const QuizzesPage(),
          ),
          GoRoute(
            path: '/questions',
            builder: (context, state) => const QuestionsPage(),
          ),
          GoRoute(
            path: '/worksheets',
            builder: (context, state) => const WorksheetsPage(),
          ),
          GoRoute(
            path: '/discussions',
            builder: (context, state) => const DiscussionsPage(),
          ),
          GoRoute(
            path: '/rankings',
            builder: (context, state) => const RankingsPage(),
          ),
          GoRoute(
            path: '/ai-assistant',
            builder: (context, state) => const AiAssistantPage(),
          ),
          GoRoute(
            path: '/messages',
            builder: (context, state) => const MessagesPage(),
          ),
          GoRoute(
            path: '/reports',
            builder: (context, state) => const ReportsPage(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfilePage(),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsPage(),
          ),
        ],
      ),
    ],
  );

  ref
    ..listen<AuthState>(authControllerProvider, (_, __) => router.refresh())
    ..onDispose(router.dispose);

  return router;
});

String _dashboardPath(UserRole role) {
  return switch (role) {
    UserRole.student => '/student',
    UserRole.parent => '/parent',
    UserRole.teacher => '/teacher',
    UserRole.schoolAdmin || UserRole.superAdmin => '/admin',
  };
}

class _RoleShell extends ConsumerWidget {
  const _RoleShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final destinations = _destinationsFor(user?.role ?? UserRole.student);
    final location = GoRouterState.of(context).uri.path;
    var selectedIndex = destinations.indexWhere((item) => location == item.path);
    if (selectedIndex < 0) {
      selectedIndex = destinations.indexWhere(
        (item) => item.path != '/' && location.startsWith('${item.path}/'),
      );
    }
    if (selectedIndex < 0) {
      selectedIndex = 0;
    }

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) => context.go(destinations[index].path),
        destinations: [
          for (final item in destinations)
            NavigationDestination(
              icon: Icon(item.icon),
              selectedIcon: Icon(item.selectedIcon),
              label: item.label,
            ),
        ],
      ),
    );
  }
}

List<_NavDestination> _destinationsFor(UserRole role) {
  return switch (role) {
    UserRole.student => const [
        _NavDestination('Home', '/student', Icons.home_outlined, Icons.home),
        _NavDestination(
          'Learn',
          '/quizzes',
          Icons.school_outlined,
          Icons.school,
        ),
        _NavDestination(
          'AI',
          '/ai-assistant',
          Icons.auto_awesome_outlined,
          Icons.auto_awesome,
        ),
        _NavDestination(
          'Ranks',
          '/rankings',
          Icons.leaderboard_outlined,
          Icons.leaderboard,
        ),
        _NavDestination(
          'Profile',
          '/profile',
          Icons.person_outline,
          Icons.person,
        ),
      ],
    UserRole.parent => const [
        _NavDestination('Home', '/parent', Icons.home_outlined, Icons.home),
        _NavDestination(
          'Children',
          '/reports',
          Icons.family_restroom_outlined,
          Icons.family_restroom,
        ),
        _NavDestination(
          'Messages',
          '/messages',
          Icons.chat_bubble_outline,
          Icons.chat_bubble,
        ),
        _NavDestination(
          'Reports',
          '/rankings',
          Icons.assessment_outlined,
          Icons.assessment,
        ),
        _NavDestination(
          'Profile',
          '/profile',
          Icons.person_outline,
          Icons.person,
        ),
      ],
    UserRole.teacher => const [
        _NavDestination('Home', '/teacher', Icons.home_outlined, Icons.home),
        _NavDestination(
          'Classes',
          '/reports',
          Icons.groups_outlined,
          Icons.groups,
        ),
        _NavDestination(
          'Activities',
          '/quizzes',
          Icons.assignment_outlined,
          Icons.assignment,
        ),
        _NavDestination(
          'Messages',
          '/messages',
          Icons.chat_bubble_outline,
          Icons.chat_bubble,
        ),
        _NavDestination(
          'Profile',
          '/profile',
          Icons.person_outline,
          Icons.person,
        ),
      ],
    UserRole.schoolAdmin || UserRole.superAdmin => const [
        _NavDestination('Home', '/admin', Icons.home_outlined, Icons.home),
        _NavDestination(
          'Approvals',
          '/admin/registrations',
          Icons.how_to_reg_outlined,
          Icons.how_to_reg,
        ),
        _NavDestination(
          'Alerts',
          '/notifications',
          Icons.notifications_outlined,
          Icons.notifications,
        ),
        _NavDestination(
          'Profile',
          '/profile',
          Icons.person_outline,
          Icons.person,
        ),
      ],
  };
}

class _NavDestination {
  const _NavDestination(this.label, this.path, this.icon, this.selectedIcon);

  final String label;
  final String path;
  final IconData icon;
  final IconData selectedIcon;
}
