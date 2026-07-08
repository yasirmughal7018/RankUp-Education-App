import { Link } from "react-router-dom";
import { Card } from "@/core/components/Card";
import { PageHeader } from "@/core/components/PageHeader";

const directoryLinks = [
  {
    title: "Schools",
    description: "Browse schools and their campuses.",
    href: "/admin/directory/schools",
  },
  {
    title: "Students",
    description: "Search students by name, roll number, or username.",
    href: "/admin/directory/students",
  },
  {
    title: "Teachers",
    description: "Search teachers across schools and campuses.",
    href: "/admin/directory/teachers",
  },
  {
    title: "Parents",
    description: "Manage parent accounts and linked students.",
    href: "/admin/directory/parents",
  },
];

export function DirectoryOverviewPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="School directory"
        description="Browse schools, campuses, students, teachers, and parent links."
        action={
          <Link
            to="/admin"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to admin
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {directoryLinks.map((item) => (
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
