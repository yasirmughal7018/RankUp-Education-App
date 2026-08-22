import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AdminRoute } from "@/features/admin/presentation/components/AdminRoute";
import { AdminOverviewPage } from "@/features/admin/presentation/pages/AdminOverviewPage";
import { PendingRegistrationsPage } from "@/features/admin/presentation/pages/PendingRegistrationsPage";
import { PendingRoleRequestsPage } from "@/features/admin/presentation/pages/PendingRoleRequestsPage";
import { PendingSchoolChangesPage } from "@/features/admin/presentation/pages/PendingSchoolChangesPage";
import {
  GuestRoute,
  ProtectedRoute,
} from "@/features/authentication/presentation/components/RouteGuards";
import { AccountLockedPage } from "@/features/authentication/presentation/pages/AccountLockedPage";
import { AccountPage } from "@/features/authentication/presentation/pages/AccountPage";
import { ForgotPasswordPage } from "@/features/authentication/presentation/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/authentication/presentation/pages/ResetPasswordPage";
import { LoginPage } from "@/features/authentication/presentation/pages/LoginPage";
import { RequestAccessPage } from "@/features/authentication/presentation/pages/RequestAccessPage";
import { DashboardPage } from "@/features/dashboard/presentation/pages/DashboardPage";
import { DirectoryOverviewPage } from "@/features/directory/presentation/pages/DirectoryOverviewPage";
import { DirectoryCampusAdminsPage } from "@/features/directory/presentation/pages/DirectoryCampusAdminsPage";
import { DirectoryCoordinatorsPage } from "@/features/directory/presentation/pages/DirectoryCoordinatorsPage";
import { DirectoryParentsPage } from "@/features/directory/presentation/pages/DirectoryParentsPage";
import { DirectorySchoolAdminsPage } from "@/features/directory/presentation/pages/DirectorySchoolAdminsPage";
import { DirectorySchoolsPage } from "@/features/directory/presentation/pages/DirectorySchoolsPage";
import { DirectoryStudentsRoute } from "@/features/directory/presentation/components/DirectoryStudentsRoute";
import { DirectoryStudentsPage } from "@/features/directory/presentation/pages/DirectoryStudentsPage";
import { DirectoryTeachersPage } from "@/features/directory/presentation/pages/DirectoryTeachersPage";
import { HomePage } from "@/features/home/presentation/pages/HomePage";
import { NotFoundPage } from "@/features/home/presentation/pages/NotFoundPage";
import { ParentRoute } from "@/features/parent/presentation/components/ParentRoute";
import { ParentChildHistoryPage } from "@/features/parent/presentation/pages/ParentChildHistoryPage";
import { ParentChildResultPage } from "@/features/parent/presentation/pages/ParentChildResultPage";
import { ParentChildrenPage } from "@/features/parent/presentation/pages/ParentChildrenPage";
import { ParentQuizDashboardPage } from "@/features/parent/presentation/pages/ParentQuizDashboardPage";
import { TeacherRoute } from "@/features/teacher/presentation/components/TeacherRoute";
import { TeacherRosterPage } from "@/features/teacher/presentation/pages/TeacherRosterPage";
import { QuestionManageRoute } from "@/features/questions/presentation/components/QuestionManageRoute";
import { QuestionCreatePage } from "@/features/questions/presentation/pages/QuestionCreatePage";
import { QuestionSessionReviewPage } from "@/features/questions/presentation/pages/QuestionSessionReviewPage";
import { QuestionDetailPage } from "@/features/questions/presentation/pages/QuestionDetailPage";
import { QuestionEditPage } from "@/features/questions/presentation/pages/QuestionEditPage";
import { QuestionEditRequestsPage } from "@/features/questions/presentation/pages/QuestionEditRequestsPage";
import { QuestionImportPage } from "@/features/questions/presentation/pages/QuestionImportPage";
import { QuestionsPage } from "@/features/questions/presentation/pages/QuestionsPage";
import { QuizManageRoute } from "@/features/quizzes/presentation/components/QuizManageRoute";
import { AssignmentBoardPage } from "@/features/quizzes/presentation/pages/AssignmentBoardPage";
import { AttemptReviewPage } from "@/features/quizzes/presentation/pages/AttemptReviewPage";
import { PendingReviewsPage } from "@/features/quizzes/presentation/pages/PendingReviewsPage";
import { QuizCreatePage } from "@/features/quizzes/presentation/pages/QuizCreatePage";
import { QuizEditPage } from "@/features/quizzes/presentation/pages/QuizEditPage";
import { QuizManageDetailPage } from "@/features/quizzes/presentation/pages/QuizManageDetailPage";
import { QuizMonitoringPage } from "@/features/quizzes/presentation/pages/QuizMonitoringPage";
import { QuizzesPage } from "@/features/quizzes/presentation/pages/QuizzesPage";
import { ReportsRoute } from "@/features/reports/presentation/components/ReportsRoute";
import { ReportsPage } from "@/features/reports/presentation/pages/ReportsPage";
import { StudentRoute } from "@/features/student/presentation/components/StudentRoute";
import { StudentDashboardPage } from "@/features/student/presentation/pages/StudentDashboardPage";
import { StudentMyClassPage } from "@/features/student/presentation/pages/StudentMyClassPage";
import { StudentQuizAttemptPage } from "@/features/student/presentation/pages/StudentQuizAttemptPage";
import { StudentQuizDetailPage } from "@/features/student/presentation/pages/StudentQuizDetailPage";
import { StudentQuizHistoryPage } from "@/features/student/presentation/pages/StudentQuizHistoryPage";
import { StudentQuizResultPage } from "@/features/student/presentation/pages/StudentQuizResultPage";
import { StudentRankingsPage } from "@/features/student/presentation/pages/StudentRankingsPage";
import { StudentQuizzesPage } from "@/features/student/presentation/pages/StudentQuizzesPage";

/** Application route tree with role-based nested guards. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />

          <Route element={<GuestRoute />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="account-locked" element={<AccountLockedPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="request-access" element={<RequestAccessPage />} />
          </Route>

          {/* Token link must work even if the user already has a session. */}
          <Route path="reset-password" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="account" element={<AccountPage />} />

            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminOverviewPage />} />
              <Route
                path="admin/registrations"
                element={<PendingRegistrationsPage />}
              />
              <Route
                path="admin/quiz-approvals"
                element={<Navigate to="/quizzes" replace />}
              />
              <Route
                path="admin/school-changes"
                element={<Navigate to="/admin/directory/school-changes" replace />}
              />
              <Route path="admin/directory" element={<DirectoryOverviewPage />} />
              <Route
                path="admin/directory/school-changes"
                element={<PendingSchoolChangesPage />}
              />
              <Route
                path="admin/directory/role-requests"
                element={<PendingRoleRequestsPage />}
              />
              <Route
                path="admin/directory/schools"
                element={<DirectorySchoolsPage />}
              />
              <Route
                path="admin/directory/teachers"
                element={<DirectoryTeachersPage />}
              />
              <Route
                path="admin/directory/coordinators"
                element={<DirectoryCoordinatorsPage />}
              />
              <Route
                path="admin/directory/parents"
                element={<DirectoryParentsPage />}
              />
              <Route
                path="admin/directory/school-admins"
                element={<DirectorySchoolAdminsPage />}
              />
              <Route
                path="admin/directory/campus-admins"
                element={<DirectoryCampusAdminsPage />}
              />
            </Route>

            <Route element={<DirectoryStudentsRoute />}>
              <Route
                path="admin/directory/students"
                element={<DirectoryStudentsPage />}
              />
            </Route>

            <Route element={<ReportsRoute />}>
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            <Route element={<QuestionManageRoute />}>
              <Route path="questions" element={<QuestionsPage />} />
              <Route path="questions/import" element={<QuestionImportPage />} />
              <Route path="questions/new" element={<QuestionCreatePage />} />
              <Route
                path="questions/new/review"
                element={<QuestionSessionReviewPage />}
              />
              <Route
                path="questions/edit-requests"
                element={<QuestionEditRequestsPage />}
              />
              <Route path="questions/:questionId" element={<QuestionDetailPage />} />
              <Route
                path="questions/:questionId/edit"
                element={<QuestionEditPage />}
              />
            </Route>

            <Route element={<QuizManageRoute />}>
              <Route path="quizzes" element={<QuizzesPage />} />
              <Route path="quizzes/assignments" element={<AssignmentBoardPage />} />
              <Route path="quizzes/reviews/pending" element={<PendingReviewsPage />} />
              <Route path="quizzes/new" element={<QuizCreatePage />} />
              <Route
                path="quizzes/:quizId/monitoring"
                element={<QuizMonitoringPage />}
              />
              <Route
                path="quizzes/:quizId/attempts/:attemptId/review"
                element={<AttemptReviewPage />}
              />
              <Route path="quizzes/:quizId/edit" element={<QuizEditPage />} />
              <Route path="quizzes/:quizId" element={<QuizManageDetailPage />} />
            </Route>

            <Route element={<ParentRoute />}>
              <Route path="parent/children" element={<ParentChildrenPage />} />
              <Route
                path="parent/quiz-dashboard"
                element={<ParentQuizDashboardPage />}
              />
              <Route
                path="parent/children/:studentId/history"
                element={<ParentChildHistoryPage />}
              />
              <Route
                path="parent/children/:studentId/quizzes/:quizId/attempts/:attemptId/result"
                element={<ParentChildResultPage />}
              />
            </Route>

            <Route element={<TeacherRoute />}>
              <Route path="teacher/students" element={<TeacherRosterPage />} />
            </Route>

            <Route element={<StudentRoute />}>
              <Route path="student/dashboard" element={<StudentDashboardPage />} />
              <Route path="student/my-class" element={<StudentMyClassPage />} />
              <Route path="student/quizzes" element={<StudentQuizzesPage />} />
              <Route path="student/history" element={<StudentQuizHistoryPage />} />
              <Route path="student/rankings" element={<StudentRankingsPage />} />
              <Route
                path="student/quizzes/:quizId"
                element={<StudentQuizDetailPage />}
              />
              <Route
                path="student/quizzes/:quizId/attempts/:attemptId"
                element={<StudentQuizAttemptPage />}
              />
              <Route
                path="student/quizzes/:quizId/attempts/:attemptId/result"
                element={<StudentQuizResultPage />}
              />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
