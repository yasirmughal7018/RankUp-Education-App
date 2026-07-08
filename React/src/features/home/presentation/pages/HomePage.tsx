import { Link } from "react-router-dom";
import { environment } from "@/app/environment";
import { Card } from "@/core/components/Card";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

const modules = [
  {
    title: "Authentication",
    description: "Login, logout, token refresh, password reset, and account requests.",
    status: "Ready",
  },
  {
    title: "Administration",
    description: "Pending registrations and quiz approvals for school admins.",
    status: "Ready",
  },
  {
    title: "Question Bank",
    description: "Create, approve, activate, and manage assessment questions.",
    status: "Ready",
  },
  {
    title: "Quiz Management",
    description: "Build, assign, monitor, and review quizzes for students.",
    status: "Ready",
  },
  {
    title: "Student Attempts",
    description: "Take assigned quizzes on the web with timed attempts.",
    status: "Ready",
  },
  {
    title: "Reports",
    description: "Quiz summary metrics, rankings, and performance insights.",
    status: "Ready",
  },
  {
    title: "School Directory",
    description: "Browse schools, campuses, students, teachers, and parent links.",
    status: "Ready",
  },
];

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="RankUp Education Web"
        description="React web application for school administration, quiz management, and student attempts. Connected to the RankUp Education .NET API."
        action={
          isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Open Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Go to Login
            </Link>
          )
        }
      />

      <section className="mb-8 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
          Project status
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Core web modules are live
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Auth, admin registrations, question bank, quiz management, monitoring,
          reviews, assignment board, student attempts, reports, and school
          directory management are available.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          API base URL:{" "}
          <code className="rounded bg-white px-2 py-1 text-brand-700">
            {environment.apiBaseUrl}
          </code>
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <Card
            key={module.title}
            title={module.title}
            description={module.description}
          >
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                module.status === "Ready"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {module.status}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
