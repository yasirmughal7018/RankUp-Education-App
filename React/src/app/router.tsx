import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AdminRoute } from "@/features/admin/presentation/components/AdminRoute";
import { AdminOverviewPage } from "@/features/admin/presentation/pages/AdminOverviewPage";
import { AdminQuizApprovalsPage } from "@/features/admin/presentation/pages/AdminQuizApprovalsPage";
import { PendingRegistrationsPage } from "@/features/admin/presentation/pages/PendingRegistrationsPage";
import {
  GuestRoute,
  ProtectedRoute,
} from "@/features/authentication/presentation/components/RouteGuards";
import { ForgotPasswordPage } from "@/features/authentication/presentation/pages/ForgotPasswordPage";
import { LoginPage } from "@/features/authentication/presentation/pages/LoginPage";
import { RequestAccessPage } from "@/features/authentication/presentation/pages/RequestAccessPage";
import { DashboardPage } from "@/features/dashboard/presentation/pages/DashboardPage";
import { DirectoryOverviewPage } from "@/features/directory/presentation/pages/DirectoryOverviewPage";
import { DirectoryParentsPage } from "@/features/directory/presentation/pages/DirectoryParentsPage";
import { DirectorySchoolsPage } from "@/features/directory/presentation/pages/DirectorySchoolsPage";
import { DirectoryStudentsPage } from "@/features/directory/presentation/pages/DirectoryStudentsPage";
import { DirectoryTeachersPage } from "@/features/directory/presentation/pages/DirectoryTeachersPage";
import { HomePage } from "@/features/home/presentation/pages/HomePage";
import { NotFoundPage } from "@/features/home/presentation/pages/NotFoundPage";
import { ParentRoute } from "@/features/parent/presentation/components/ParentRoute";
import { ParentChildHistoryPage } from "@/features/parent/presentation/pages/ParentChildHistoryPage";
import { ParentChildResultPage } from "@/features/parent/presentation/pages/ParentChildResultPage";
import { ParentChildrenPage } from "@/features/parent/presentation/pages/ParentChildrenPage";
import { QuestionManageRoute } from "@/features/questions/presentation/components/QuestionManageRoute";
import { QuestionCreatePage } from "@/features/questions/presentation/pages/QuestionCreatePage";
import { QuestionDetailPage } from "@/features/questions/presentation/pages/QuestionDetailPage";
import { QuestionEditPage } from "@/features/questions/presentation/pages/QuestionEditPage";
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
import { StudentQuizAttemptPage } from "@/features/student/presentation/pages/StudentQuizAttemptPage";
import { StudentQuizDetailPage } from "@/features/student/presentation/pages/StudentQuizDetailPage";
import { StudentQuizResultPage } from "@/features/student/presentation/pages/StudentQuizResultPage";
import { StudentQuizzesPage } from "@/features/student/presentation/pages/StudentQuizzesPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />

          <Route element={<GuestRoute />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="request-access" element={<RequestAccessPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<DashboardPage />} />

            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminOverviewPage />} />
              <Route
                path="admin/registrations"
                element={<PendingRegistrationsPage />}
              />
              <Route
                path="admin/quiz-approvals"
                element={<AdminQuizApprovalsPage />}
              />
              <Route path="admin/directory" element={<DirectoryOverviewPage />} />
              <Route
                path="admin/directory/schools"
                element={<DirectorySchoolsPage />}
              />
              <Route
                path="admin/directory/students"
                element={<DirectoryStudentsPage />}
              />
              <Route
                path="admin/directory/teachers"
                element={<DirectoryTeachersPage />}
              />
              <Route
                path="admin/directory/parents"
                element={<DirectoryParentsPage />}
              />
            </Route>

            <Route element={<ReportsRoute />}>
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            <Route element={<QuestionManageRoute />}>
              <Route path="questions" element={<QuestionsPage />} />
              <Route path="questions/new" element={<QuestionCreatePage />} />
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
                path="parent/children/:studentId/history"
                element={<ParentChildHistoryPage />}
              />
              <Route
                path="parent/children/:studentId/quizzes/:quizId/attempts/:attemptId/result"
                element={<ParentChildResultPage />}
              />
            </Route>

            <Route element={<StudentRoute />}>
              <Route path="student/quizzes" element={<StudentQuizzesPage />} />
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
