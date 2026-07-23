import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  FileCheck2,
  BookOpenCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { useQuizzesQuery } from "@/features/quizzes/presentation/hooks/useQuizQueries";
import { useLinkedStudentsQuery } from "@/features/parent/presentation/hooks/useParentQueries";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppCard } from "@/components/ui/app-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { Button } from "@/components/ui/button";

function normalizeQuizStatus(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("draft")) return "Draft";
  if (s.includes("publish")) return "Published";
  if (s.includes("assign")) return "Assigned";
  if (s.includes("progress")) return "In Progress";
  if (s.includes("complete")) return "Completed";
  if (s.includes("cancel")) return "Cancelled";
  if (s.includes("approv")) return "Approved";
  if (s.includes("reject")) return "Rejected";
  if (s.includes("review") || s.includes("pending")) return "Under Review";
  return status;
}

/**
 * Parent Quiz Dashboard — design-system example.
 * Summary cards + quiz list with status badges. Data still scoped by API auth.
 */
export function ParentQuizDashboardPage() {
  const { user } = useAuth();
  const quizzesQuery = useQuizzesQuery("");
  const childrenQuery = useLinkedStudentsQuery(true);

  const quizzes = quizzesQuery.data ?? [];
  const stats = useMemo(() => {
    let published = 0;
    let notAssigned = 0;
    let pendingReviews = 0;
    for (const quiz of quizzes) {
      const status = quiz.status?.toLowerCase() ?? "";
      if (status.includes("publish") || status.includes("assign")) {
        published += 1;
      }
      if (status.includes("draft") || status.includes("pending")) {
        notAssigned += 1;
      }
      if (
        status.includes("review") ||
        status.includes("pending")
      ) {
        pendingReviews += 1;
      }
    }
    return {
      total: quizzes.length,
      published,
      notAssigned,
      pendingReviews,
      children: childrenQuery.data?.length ?? 0,
    };
  }, [quizzes, childrenQuery.data]);

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Parent quiz dashboard"
        subtitle={`Track quizzes and reviews for your children${user ? ` · ${user.fullName}` : ""}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/parent/children">Children</Link>
            </Button>
            <Button asChild>
              <Link to="/quizzes/assignments">Assignments</Link>
            </Button>
          </div>
        }
      />

      {quizzesQuery.error ? (
        <AppErrorState
          message={quizzesQuery.error.message}
          onRetry={() => void quizzesQuery.refetch()}
        />
      ) : null}

      {quizzesQuery.isLoading ? (
        <AppLoadingSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AppStatCard
            title="Total quizzes"
            value={stats.total}
            icon={ClipboardList}
            colorVariant="primary"
            description="In your manage scope"
          />
          <AppStatCard
            title="Not assigned"
            value={stats.notAssigned}
            icon={BookOpenCheck}
            colorVariant="neutral"
            description="Draft / pending"
          />
          <AppStatCard
            title="Published"
            value={stats.published}
            icon={Sparkles}
            colorVariant="success"
            description="Ready or assigned"
          />
          <AppStatCard
            title="Pending reviews"
            value={stats.pendingReviews}
            icon={FileCheck2}
            colorVariant="ai"
            description="Needs attention"
            onClick={() => {
              window.location.href = "/quizzes/reviews/pending";
            }}
          />
        </div>
      )}

      <section>
        <AppSectionHeader
          title="Recent quizzes"
          description="Status badges use the shared RankUp status system."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/quizzes">View all</Link>
            </Button>
          }
        />

        {quizzesQuery.isLoading ? (
          <AppLoadingSkeleton variant="table" count={5} />
        ) : quizzes.length === 0 ? (
          <AppEmptyState
            title="No quizzes yet"
            description="Create a quiz or wait for school assignments to appear here."
            actionLabel="Create quiz"
            onAction={() => {
              window.location.href = "/quizzes/new";
            }}
          />
        ) : (
          <div className="space-y-3">
            {quizzes.slice(0, 8).map((quiz) => (
              <AppCard key={quiz.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{quiz.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    #{quiz.id} · {quiz.subject} · {quiz.grade}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <AppStatusBadge status={normalizeQuizStatus(quiz.status)} />
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/quizzes/${quiz.id}`}>Open</Link>
                  </Button>
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </section>

      <AppCard>
        <AppSectionHeader
          title="Linked children"
          description={`${stats.children} student link(s)`}
        />
        {childrenQuery.isLoading ? (
          <AppLoadingSkeleton variant="detail" />
        ) : (childrenQuery.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            No linked children on this account.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {childrenQuery.data!.map((child) => (
              <li
                key={child.studentId}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <span className="font-medium text-foreground">
                  {child.fullName ?? `Student #${child.studentId}`}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/parent/children/${child.studentId}/history`}>
                    History
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </AppCard>
    </div>
  );
}
