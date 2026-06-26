import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/features/ai_assistant/presentation/pages/ai_assistant_page.dart';
import 'package:rankup_education/features/authentication/domain/entities/user_role.dart';
import 'package:rankup_education/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:rankup_education/features/authentication/presentation/pages/login_page.dart';
import 'package:rankup_education/features/authentication/presentation/pages/splash_page.dart';
import 'package:rankup_education/features/authentication/presentation/providers/auth_providers.dart';
import 'package:rankup_education/features/discussions/presentation/pages/discussions_page.dart';
import 'package:rankup_education/features/messaging/presentation/pages/messages_page.dart';
import 'package:rankup_education/features/parent_dashboard/presentation/pages/parent_dashboard_page.dart';
import 'package:rankup_education/features/profile/presentation/pages/profile_page.dart';
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
      final isAuthenticated = authState.user != null;
      final location = state.uri.path;
      final isAuthRoute = location == '/login' || location == '/';

      if (!isAuthenticated && !isAuthRoute) {
        return '/login';
      }

      if (isAuthenticated && isAuthRoute) {
        return _dashboardPath(authState.user!.role);
      }

      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const SplashPage()),
      GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
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
            path: '/quizzes',
            builder: (context, state) => const QuizzesPage(),
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
    final matchedIndex = destinations.indexWhere((item) {
      return location == item.path;
    });
    final selectedIndex = matchedIndex < 0 ? 0 : matchedIndex;

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
  };
}

class _NavDestination {
  const _NavDestination(this.label, this.path, this.icon, this.selectedIcon);

  final String label;
  final String path;
  final IconData icon;
  final IconData selectedIcon;
}
