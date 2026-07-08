import { Link } from "react-router-dom";
import { Card } from "@/core/components/Card";
import { PageHeader } from "@/core/components/PageHeader";

const adminLinks = [
  {
    title: "Pending registrations",
    description: "Review and approve Student, Parent, and Teacher account requests.",
    href: "/admin/registrations",
  },
  {
    title: "Question bank",
    description: "Create, approve, and manage assessment questions.",
    href: "/questions",
  },
  {
    title: "Quiz approvals",
    description: "Approve teacher quizzes submitted for school review.",
    href: "/admin/quiz-approvals",
  },
  {
    title: "School directory",
    description: "Browse schools, campuses, students, teachers, and parent links.",
    href: "/admin/directory",
  },
];

export function AdminOverviewPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Administration"
        description="Manage school accounts, registrations, and platform operations."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {adminLinks.map((item) => (
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
