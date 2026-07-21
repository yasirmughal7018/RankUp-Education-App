import { Link } from "react-router-dom";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { Card } from "@/core/components/Card";
import { PageHeader } from "@/core/components/PageHeader";
import {
  getDashboardLabel,
  isAdminRole,
  type UserRole,
} from "@/core/api/types";
import { canManageQuestions } from "@/features/questions/domain/questionTypes";
import { canManageQuizzes } from "@/features/quizzes/domain/quizTypes";
import { canTakeStudentQuizzes } from "@/features/student/domain/studentQuizTypes";

const roleModules: Record<UserRole, string[]> = {
  PortalAdmin: [
    "Approve registration requests",
    "Approve questions and quizzes",
    "Manage the school directory",
    "View quiz reports and rankings",
  ],
  SchoolAdmin: [
    "Approve account requests",
    "Approve teacher quizzes",
    "Manage the school directory",
    "View quiz reports and rankings",
  ],
  CampusAdmin: [
    "Approve account requests",
    "Manage campus directory (students, teachers, parents)",
    "Approve teacher quizzes",
  ],
  Teacher: [
    "Create and assign quizzes",
    "Monitor live quiz attempts",
    "Review student submissions",
    "View quiz reports and rankings",
  ],
  Student: [
    "View assigned quizzes",
    "Start timed quiz attempts",
    "Review attempt results",
  ],
  Parent: [
    "View linked children",
    "View child quiz history and results",
    "Create and assign quizzes",
    "Monitor child assignments",
  ],
};

function quickLinksForRole(role: UserRole): Array<{ label: string; href: string }> {
  if (role === "PortalAdmin" || role === "SchoolAdmin") {
    return [
      { label: "Registrations", href: "/admin/registrations" },
      { label: "Directory", href: "/admin/directory" },
      { label: "Reports", href: "/reports" },
      { label: "Question bank", href: "/questions" },
    ];
  }

  if (role === "CampusAdmin") {
    return [
      { label: "Registrations", href: "/admin/registrations" },
      { label: "Directory", href: "/admin/directory" },
      { label: "Question bank", href: "/questions" },
    ];
  }

  if (role === "Teacher") {
    return [
      { label: "Quizzes", href: "/quizzes" },
      { label: "Question bank", href: "/questions" },
      { label: "Assignments", href: "/quizzes/assignments" },
      { label: "Pending reviews", href: "/quizzes/reviews/pending" },
      { label: "Reports", href: "/reports" },
    ];
  }

  if (role === "Parent") {
    return [
      { label: "Children", href: "/parent/children" },
      { label: "Quizzes", href: "/quizzes" },
      { label: "Question bank", href: "/questions" },
      { label: "Assignments", href: "/quizzes/assignments" },
    ];
  }

  if (role === "Student") {
    return [{ label: "My quizzes", href: "/student/quizzes" }];
  }

  return [{ label: "Question bank", href: "/questions" }];
}

/** Role-based landing page with quick links and permissions. */
export function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const modules = roleModules[user.role] ?? [];
  const quickLinks = quickLinksForRole(user.role);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title={getDashboardLabel(user.role)}
        description={`Welcome back, ${user.fullName || user.name}. Your role is resolved by the backend after login.`}
        action={
          isAdminRole(user.role) ? (
            <Link
              to="/admin/registrations"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Registration approvals
            </Link>
          ) : canManageQuizzes(user.role) ? (
            <Link
              to="/quizzes"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Manage quizzes
            </Link>
          ) : canTakeStudentQuizzes(user.role) ? (
            <Link
              to="/student/quizzes"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              My quizzes
            </Link>
          ) : canManageQuestions(user.role) ? (
            <Link
              to="/questions"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Open question bank
            </Link>
          ) : undefined
        }
      />

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Signed in as
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {user.username}
          </p>
          <p className="mt-1 text-sm text-slate-600">{user.fullName}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Role
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {user.role}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {isAdminRole(user.role)
              ? "Web administration access"
              : "Role-based web access"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Scope
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {user.schoolId ?? "—"} / {user.campusId ?? "—"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            School ID / Campus ID
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title="Available now"
          description="Capabilities enabled for your role in the web app."
        >
          <ul className="space-y-2 text-sm text-slate-700">
            {modules.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Card>

        <Card
          title="Permissions"
          description="Claims returned by the API for this account."
        >
          {user.permissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                >
                  {permission}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No explicit permissions were returned for this user.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
