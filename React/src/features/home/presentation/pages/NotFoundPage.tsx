import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
      <PageHeader
        title="Page not found"
        description="The page you requested does not exist in this starter build."
      />
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Back to Home
      </Link>
    </div>
  );
}
