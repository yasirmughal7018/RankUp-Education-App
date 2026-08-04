import { Link } from "react-router-dom";
import { Card } from "@/core/components/Card";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { canApproveQuizzes } from "@/features/quizzes/domain/quizTypes";

const adminLinks = [
  {
    title: "Registration approvals",
    description:
      "Approve account access requests from in-app notifications (Portal Admin, School Admin, and Campus Admin).",
    href: "/admin/registrations",
    requiresQuizApproval: false,
  },
  {
    title: "Question bank",
    description: "Create, approve, and manage assessment questions.",
    href: "/questions",
    requiresQuizApproval: false,
  },
  {
    title: "Quiz approvals",
    description: "Approve teacher quizzes submitted for school review.",
    href: "/admin/quiz-approvals",
    requiresQuizApproval: true,
  },
  {
    title: "School directory",
    description:
      "Browse schools, campuses, students, teachers, parents, admins, and school/campus change requests.",
    href: "/admin/directory",
    requiresQuizApproval: false,
  },
];

/** Admin landing page with links to registrations, questions, quizzes, and directory. */
export function AdminOverviewPage() {
  const { user } = useAuth();
  const showQuizApprovals = user != null && canApproveQuizzes(user.role);
  const links = adminLinks.filter(
    (item) => !item.requiresQuizApproval || showQuizApprovals,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Administration"
        description="Manage school accounts, registrations, and platform operations."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {links.map((item) => (
          <Card key={item.href} title={item.title} description={item.description}>
            <Link
              to={item.href}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Open
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
