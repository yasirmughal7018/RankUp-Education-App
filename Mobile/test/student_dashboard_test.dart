import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';
import 'package:rankup_education/features/student_dashboard/domain/repositories/student_dashboard_repository.dart';
import 'package:rankup_education/features/student_dashboard/domain/usecases/get_student_dashboard_usecase.dart';
import 'package:rankup_education/features/student_dashboard/presentation/controllers/student_dashboard_controller.dart';
import 'package:rankup_education/features/student_dashboard/presentation/pages/student_dashboard_page.dart';
import 'package:rankup_education/features/student_dashboard/presentation/providers/student_dashboard_provider.dart';

void main() {
  testWidgets('student dashboard renders priority sections', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          studentDashboardRepositoryProvider.overrideWithValue(
            _FakeStudentDashboardRepository(),
          ),
        ],
        child: MaterialApp.router(
          routerConfig: GoRouter(
            initialLocation: '/',
            routes: [
              GoRoute(
                path: '/',
                builder: (context, state) => const StudentDashboardPage(),
              ),
              GoRoute(
                path: '/quizzes',
                builder: (context, state) => const Scaffold(),
              ),
              GoRoute(
                path: '/worksheets',
                builder: (context, state) => const Scaffold(),
              ),
              GoRoute(
                path: '/messages',
                builder: (context, state) => const Scaffold(),
              ),
              GoRoute(
                path: '/settings',
                builder: (context, state) => const Scaffold(),
              ),
              GoRoute(
                path: '/ai-assistant',
                builder: (context, state) => const Scaffold(),
              ),
              GoRoute(
                path: '/reports',
                builder: (context, state) => const Scaffold(),
              ),
              GoRoute(
                path: '/rankings',
                builder: (context, state) => const Scaffold(),
              ),
            ],
          ),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.textContaining('Ayan Khan'), findsOneWidget);

    final dashboardScroll = find.byType(Scrollable).first;

    await tester.scrollUntilVisible(
      find.text("Today's Learning Plan"),
      400,
      scrollable: dashboardScroll,
    );
    expect(find.text("Today's Learning Plan"), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('AI Recommendation'),
      400,
      scrollable: dashboardScroll,
    );
    expect(find.text('AI Recommendation'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Subject Performance'),
      400,
      scrollable: dashboardScroll,
    );
    expect(find.text('Subject Performance'), findsOneWidget);
  });
}

class _FakeStudentDashboardRepository implements StudentDashboardRepository {
  @override
  Future<StudentDashboardModel> getDashboard() async {
    return StudentDashboardModel.mock();
  }
}
