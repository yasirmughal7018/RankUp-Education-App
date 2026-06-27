import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/features/student_dashboard/data/models/student_dashboard_model.dart';
import 'package:rankup_education/features/student_dashboard/domain/usecases/get_student_dashboard_usecase.dart';

class StudentDashboardState {
  const StudentDashboardState({
    this.dashboard,
    this.isLoading = false,
    this.isRefreshing = false,
    this.errorMessage,
  });

  final StudentDashboardModel? dashboard;
  final bool isLoading;
  final bool isRefreshing;
  final String? errorMessage;

  StudentDashboardState copyWith({
    StudentDashboardModel? dashboard,
    bool? isLoading,
    bool? isRefreshing,
    String? errorMessage,
    bool clearError = false,
  }) {
    return StudentDashboardState(
      dashboard: dashboard ?? this.dashboard,
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

class StudentDashboardController extends StateNotifier<StudentDashboardState> {
  StudentDashboardController(this._getDashboard)
      : super(const StudentDashboardState());

  final GetStudentDashboardUseCase _getDashboard;

  Future<void> load() async {
    if (state.dashboard == null) {
      state = state.copyWith(isLoading: true, clearError: true);
    } else {
      state = state.copyWith(isRefreshing: true, clearError: true);
    }

    try {
      final dashboard = await _getDashboard();
      state = state.copyWith(
        dashboard: dashboard,
        isLoading: false,
        isRefreshing: false,
      );
    } on Exception catch (error) {
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        errorMessage: error.toString(),
      );
    }
  }

  Future<void> refresh() => load();
}
