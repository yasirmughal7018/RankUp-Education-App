import { Link } from "react-router-dom";
import { GraduationCap, ArrowRight } from "lucide-react";
import { AppCard } from "@/components/ui/app-card";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { Button } from "@/components/ui/button";
import { buildRosterGradeBuckets } from "@/features/teacher/domain/teacherTypes";
import { useTeacherRosterQuery } from "@/features/teacher/presentation/hooks/useTeacherQueries";

/** Teacher/Coordinator: assigned grade–section pairs from the roster API. */
export function TeacherAssignedClassesCard() {
  const rosterQuery = useTeacherRosterQuery(true);
  const classSections = rosterQuery.data?.classSections ?? [];
  const students = rosterQuery.data?.students ?? [];
  const gradeBuckets = buildRosterGradeBuckets(classSections, students);
  const studentCount = students.length;

  return (
    <AppCard>
      <AppSectionHeader
        title="My classes & sections"
        description="Classes an admin assigned to you. Open My students to browse the roster."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/teacher/students">
              My students
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        }
      />

      {rosterQuery.isLoading ? (
        <AppLoadingSkeleton variant="detail" count={2} className="max-w-xl" />
      ) : rosterQuery.isError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
          Unable to load your class assignments. Try refreshing the page.
        </p>
      ) : classSections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
          <GraduationCap
            className="mx-auto h-8 w-8 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-2 text-sm font-medium text-foreground">
            No classes assigned yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask a school or campus admin to assign your grade and section pairs
            in the directory.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {classSections.length} class
            {classSections.length === 1 ? "" : "es"} · {studentCount} student
            {studentCount === 1 ? "" : "s"} on your roster
          </p>
          <div className="space-y-3">
            {gradeBuckets.map((grade) => (
              <div key={grade.grade}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Grade {grade.grade}
                  <span className="ml-1.5 font-normal normal-case tracking-normal">
                    · {grade.studentCount} student
                    {grade.studentCount === 1 ? "" : "s"}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {grade.sections.map((section) => (
                    <Link
                      key={`${section.grade}|${section.section}`}
                      to="/teacher/students"
                      className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="font-semibold text-foreground">
                        Section {section.section}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {section.students.length} student
                        {section.students.length === 1 ? "" : "s"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppCard>
  );
}
