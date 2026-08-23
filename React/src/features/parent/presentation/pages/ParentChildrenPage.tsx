import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Building2, GraduationCap, Plus, RefreshCw } from "lucide-react";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { Button } from "@/components/ui/button";
import { AccountStatusBadge } from "@/features/directory/presentation/components/AccountStatusBadge";
import { formatStudentLabel } from "@/features/parent/domain/parentTypes";
import { AddChildDialog } from "@/features/parent/presentation/components/AddChildDialog";
import { ParentGroupsPanel } from "@/features/parent/presentation/components/ParentGroupsPanel";
import {
  useLinkMyChildMutation,
  useLinkedStudentsQuery,
  useParentGroupsQuery,
} from "@/features/parent/presentation/hooks/useParentQueries";
import { cn } from "@/lib/utils";

type ChildrenTab = "children" | "groups";

export function ParentChildrenPage() {
  const { data: students = [], isLoading, error, refetch, isFetching } =
    useLinkedStudentsQuery(true);
  const groupsQuery = useParentGroupsQuery(true);
  const linkMutation = useLinkMyChildMutation();
  const [tab, setTab] = useState<ChildrenTab>("children");
  const [showAddChild, setShowAddChild] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const groupCount = groupsQuery.data?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <AppPageHeader
        title="My children"
        subtitle="Add children by CNIC or username, group them, then assign quizzes and monitor progress."
        className="mb-4"
        action={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetching || groupsQuery.isFetching}
              onClick={() => {
                void refetch();
                void groupsQuery.refetch();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setSuccessMessage(null);
                setShowAddChild(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add child
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/quizzes/assignments">Assignment board</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6">
        <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1">
          <TabButton
            active={tab === "children"}
            onClick={() => setTab("children")}
          >
            Children
            {students.length > 0 ? (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {students.length}
              </span>
            ) : null}
          </TabButton>
          <TabButton
            active={tab === "groups"}
            onClick={() => setTab("groups")}
          >
            Groups
            {groupCount > 0 ? (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {groupCount}
              </span>
            ) : null}
          </TabButton>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {tab === "children" ? (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          {isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Loading linked students...
            </div>
          ) : students.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No linked students yet. Use{" "}
              <button
                type="button"
                onClick={() => setShowAddChild(true)}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Add child
              </button>{" "}
              with their CNIC or username.
            </div>
          ) : (
            <div className="divide-y divide-border/70">
              {students.map((student) => (
                <article
                  key={student.studentId}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {formatStudentLabel(student)}
                      </p>
                      <span className="inline-flex max-w-full truncate rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {student.relationship?.trim() || "Guardian"}
                      </span>
                      <AccountStatusBadge
                        accountStatus={student.accountStatus}
                        isActive={student.isActive}
                        size="sm"
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {student.username}
                      <span className="mx-1.5 text-border" aria-hidden>
                        ·
                      </span>
                      Roll {student.rollNumber?.trim() || "—"}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Building2
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        <span className="truncate">
                          {student.schoolName?.trim() || "School not assigned"}
                        </span>
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <GraduationCap
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        <span className="truncate">
                          {student.campusName?.trim() || "Campus not assigned"}
                        </span>
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/parent/children/${student.studentId}/history`}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                    >
                      Quiz history
                    </Link>
                    <Link
                      to={`/quizzes/assignments?studentId=${student.studentId}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/60"
                    >
                      View assignments
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ParentGroupsPanel students={students} />
      )}

      {showAddChild ? (
        <AddChildDialog
          isSubmitting={linkMutation.isPending}
          onClose={() => {
            if (!linkMutation.isPending) {
              setShowAddChild(false);
            }
          }}
          onSubmit={async (identifier, relationship) => {
            const result = await linkMutation.mutateAsync({
              identifier,
              relationship,
            });
            setShowAddChild(false);
            setTab("children");
            setSuccessMessage(
              result.alreadyLinked
                ? `${result.fullName} was already linked to your account.`
                : `${result.fullName} was linked successfully.`,
            );
          }}
        />
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
