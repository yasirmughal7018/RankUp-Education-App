import { useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { useMyRankingsQuery } from "@/features/reports/presentation/hooks/useReportQueries";
import type { RankingScope } from "@/features/reports/domain/reportTypes";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppCard } from "@/components/ui/app-card";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCOPES: { id: RankingScope; label: string }[] = [
  { id: "class", label: "Class" },
  { id: "school", label: "School" },
];

/** Student peer leaderboard from submitted quiz best percentages. */
export function StudentRankingsPage() {
  const [scope, setScope] = useState<RankingScope>("class");
  const { data, isLoading, error, refetch, isFetching } =
    useMyRankingsQuery(scope);

  return (
    <div className="space-y-6">
      <AppPageHeader
        studentFacing
        title="Rankings"
        subtitle="Based on your best quiz scores among classmates or school peers."
        backTo="/student/dashboard"
        backAriaLabel="Back to learning"
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {SCOPES.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={scope === item.id ? "default" : "outline"}
            onClick={() => setScope(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {error ? (
        <AppErrorState message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {isLoading ? <AppLoadingSkeleton count={4} /> : null}

      {!isLoading && data ? (
        <>
          <AppCard className="flex flex-wrap items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">{data.title}</p>
              <p className="font-display text-xl font-semibold text-foreground">
                {data.myRank != null
                  ? `Your rank #${data.myRank}`
                  : "No submitted quizzes yet"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.myBestPercentage != null
                  ? `Best score ${data.myBestPercentage}% · ${data.myAttemptCount} attempt(s)`
                  : "Submit a quiz to appear on the board."}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/student/quizzes">My quizzes</Link>
            </Button>
          </AppCard>

          <section>
            <AppSectionHeader
              title="Leaderboard"
              description="Top scores from submitted attempts in this scope."
            />
            {data.items.length === 0 ? (
              <AppEmptyState
                title="No rankings yet"
                description="When classmates submit quizzes, their best scores will show here."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Rank</th>
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Best %</th>
                      <th className="px-4 py-3 font-medium">Attempts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {data.items.map((item) => {
                      const isMe = item.studentId === data.viewerStudentId;
                      return (
                        <tr
                          key={`${item.rank}-${item.studentId}`}
                          className={cn(isMe && "bg-primary/5")}
                        >
                          <td className="px-4 py-3 font-semibold text-foreground">
                            #{item.rank}
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {item.studentName}
                            {isMe ? (
                              <span className="ml-2 text-xs font-medium text-primary">
                                You
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{item.bestPercentage}%</td>
                          <td className="px-4 py-3">{item.attemptCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
