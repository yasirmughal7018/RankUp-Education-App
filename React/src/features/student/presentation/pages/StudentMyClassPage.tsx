import { Link } from "react-router-dom";
import {
  BookOpen,
  Building2,
  GraduationCap,
  Hash,
  IdCard,
  RefreshCw,
  School,
  Users,
  UserCog,
} from "lucide-react";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppCard } from "@/components/ui/app-card";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { Button } from "@/components/ui/button";
import {
  formatStudentClassLabel,
  personInitials,
  type StudentMeOverview,
  type StudentMePerson,
} from "@/features/student/domain/studentMeTypes";
import { useStudentMeOverviewQuery } from "@/features/student/presentation/hooks/useStudentMeQueries";
import type { LucideIcon } from "lucide-react";

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className="mt-1.5 break-words text-sm font-semibold text-foreground sm:text-base">
        {value}
      </p>
    </div>
  );
}

function PeoplePanel({
  title,
  description,
  emptyTitle,
  emptyDescription,
  icon: Icon,
  people,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: LucideIcon;
  people: StudentMePerson[];
}) {
  return (
    <AppCard animate className="h-full">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--primary-light))] text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <AppSectionHeader title={title} description={description} />
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
          {people.length}
        </span>
      </div>

      {people.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          <span className="block font-medium text-foreground">{emptyTitle}</span>
          <span className="mt-1 block">{emptyDescription}</span>
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {people.map((person) => (
            <li
              key={`${title}-${person.fullName}-${person.detail ?? ""}`}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-3 py-3"
            >
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                aria-hidden
              >
                {personInitials(person.fullName)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-foreground">
                  {person.fullName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {person.detail?.trim() || title.slice(0, -1)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  );
}

function ClassProfileCard({ data }: { data: StudentMeOverview }) {
  const section = data.section?.trim() || "—";
  const roll = data.rollNumber?.trim() || "—";
  const school = data.schoolName?.trim() || "Not set";
  const campus = data.campusName?.trim() || "Not set";

  return (
    <AppCard animate>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
            {personInitials(data.fullName)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Class profile
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
              {data.fullName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatStudentClassLabel(data)}
              <span className="mx-1.5 text-border" aria-hidden>
                ·
              </span>
              Roll {roll}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/student/quizzes">Open my quizzes</Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DetailField icon={School} label="School" value={school} />
        <DetailField icon={Building2} label="Campus" value={campus} />
        <DetailField
          icon={GraduationCap}
          label="Grade"
          value={`Grade ${data.grade}`}
        />
        <DetailField icon={BookOpen} label="Section" value={section} />
        <DetailField icon={Hash} label="Roll number" value={roll} />
        <DetailField icon={IdCard} label="Username" value={data.username} />
      </div>
    </AppCard>
  );
}

/** Student self-view: class/section and assigned parents, coordinators, and teachers. */
export function StudentMyClassPage() {
  const { data, isLoading, error, refetch, isFetching } =
    useStudentMeOverviewQuery(true);

  const totalPeople = data
    ? data.parents.length + data.coordinators.length + data.teachers.length
    : 0;

  return (
    <div className="space-y-6">
      <AppPageHeader
        studentFacing
        title="My class"
        subtitle="Your school placement and the parents, coordinators, and teachers linked to you."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Refresh
          </Button>
        }
      />

      {error ? (
        <AppErrorState message={error.message} onRetry={() => void refetch()} />
      ) : null}

      {isLoading ? (
        <AppLoadingSkeleton count={4} />
      ) : data ? (
        <>
          <ClassProfileCard data={data} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AppStatCard
              title="Parents"
              value={data.parents.length}
              icon={Users}
              colorVariant="primary"
              description="Linked to your account"
            />
            <AppStatCard
              title="Coordinators"
              value={data.coordinators.length}
              icon={UserCog}
              colorVariant="ai"
              description="Assigned to your grade"
            />
            <AppStatCard
              title="Teachers"
              value={data.teachers.length}
              icon={GraduationCap}
              colorVariant="success"
              description="Teaching your section"
            />
          </div>

          <section className="space-y-4">
            <AppSectionHeader
              title="People around you"
              description={
                totalPeople === 0
                  ? "No one is linked yet. Ask your school or parent to complete assignments."
                  : `${totalPeople} people are currently linked or assigned to your class.`
              }
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <PeoplePanel
                title="Parents"
                description="Guardians linked to your student account."
                emptyTitle="No parents linked"
                emptyDescription="A parent can link you from their Children page using your CNIC or username."
                icon={Users}
                people={data.parents}
              />
              <PeoplePanel
                title="Coordinators"
                description="Campus coordinators responsible for your grade."
                emptyTitle="No coordinator yet"
                emptyDescription="Your campus admin assigns coordinators by grade."
                icon={UserCog}
                people={data.coordinators}
              />
              <PeoplePanel
                title="Teachers"
                description="Teachers assigned to your grade and section."
                emptyTitle="No teachers yet"
                emptyDescription="Teachers appear here once your class/section is on their roster."
                icon={GraduationCap}
                people={data.teachers}
              />
            </div>
          </section>

          <AppCard>
            <AppSectionHeader
              title="What you can do next"
              description="Use your class details to stay on track with assigned learning."
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/student/dashboard">Go to learning</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/student/quizzes">View quizzes</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/student/rankings">Check rankings</Link>
              </Button>
            </div>
          </AppCard>
        </>
      ) : null}
    </div>
  );
}
