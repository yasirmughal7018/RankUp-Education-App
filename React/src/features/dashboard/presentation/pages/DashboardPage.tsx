import { Link } from "react-router-dom";
import {
  ClipboardList,
  BookOpenCheck,
  School,
  GraduationCap,
  Users,
  ShieldCheck,
  FileCheck2,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import {
  getDashboardLabel,
  isAdminRole,
  type UserRole,
} from "@/core/api/types";
import { canManageQuestions } from "@/features/questions/domain/questionTypes";
import { canManageQuizzes } from "@/features/quizzes/domain/quizTypes";
import { canTakeStudentQuizzes } from "@/features/student/domain/studentQuizTypes";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppCard } from "@/components/ui/app-card";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { Button } from "@/components/ui/button";

const roleModules: Record<UserRole, string[]> = {
  PortalAdmin: [
    "Approve registration requests",
    "Approve questions and quizzes",
    "Manage the school directory",
    "View quiz reports and rankings",
  ],
  SchoolAdmin: [
    "Approve account requests",
    "Approve teacher quizzes",
    "Manage the school directory",
    "View quiz reports and rankings",
  ],
  CampusAdmin: [
    "Approve account requests",
    "Manage campus directory (students, teachers, parents)",
    "Approve teacher quizzes",
  ],
  Teacher: [
    "Create and assign quizzes",
    "Monitor live quiz attempts",
    "Review student submissions",
    "View quiz reports and rankings",
  ],
  Student: [
    "View assigned quizzes",
    "Start timed quiz attempts",
    "Review attempt results",
  ],
  Parent: [
    "View linked children",
    "View child quiz history and results",
    "Create and assign quizzes",
    "Monitor child assignments",
  ],
};

function quickLinksForRole(
  role: UserRole,
): Array<{ label: string; href: string; icon: typeof School; hint: string }> {
  if (role === "PortalAdmin" || role === "SchoolAdmin") {
    return [
      { label: "Registrations", href: "/admin/registrations", icon: ShieldCheck, hint: "Approve access" },
      { label: "Directory", href: "/admin/directory", icon: School, hint: "People & schools" },
      { label: "Reports", href: "/reports", icon: BarChart3, hint: "Performance" },
      { label: "Question bank", href: "/questions", icon: BookOpenCheck, hint: "Assessments" },
    ];
  }
  if (role === "CampusAdmin") {
    return [
      { label: "Registrations", href: "/admin/registrations", icon: ShieldCheck, hint: "Approve access" },
      { label: "Directory", href: "/admin/directory", icon: School, hint: "Campus people" },
      { label: "Question bank", href: "/questions", icon: BookOpenCheck, hint: "Assessments" },
    ];
  }
  if (role === "Teacher") {
    return [
      { label: "Quizzes", href: "/quizzes", icon: ClipboardList, hint: "Create & assign" },
      { label: "Question bank", href: "/questions", icon: BookOpenCheck, hint: "Build items" },
      { label: "Assignments", href: "/quizzes/assignments", icon: Users, hint: "Class board" },
      { label: "Reviews", href: "/quizzes/reviews/pending", icon: FileCheck2, hint: "Mark work" },
      { label: "Reports", href: "/reports", icon: BarChart3, hint: "Insights" },
    ];
  }
  if (role === "Parent") {
    return [
      { label: "Children", href: "/parent/children", icon: GraduationCap, hint: "Linked students" },
      { label: "Quiz dashboard", href: "/parent/quiz-dashboard", icon: ClipboardList, hint: "Progress" },
      { label: "Assignments", href: "/quizzes/assignments", icon: Users, hint: "Follow work" },
    ];
  }
  if (role === "Student") {
    return [
      { label: "Learning", href: "/student/dashboard", icon: GraduationCap, hint: "Today’s focus" },
      { label: "My quizzes", href: "/student/quizzes", icon: ClipboardList, hint: "Assigned work" },
    ];
  }
  return [{ label: "Question bank", href: "/questions", icon: BookOpenCheck, hint: "Browse" }];
}

function primaryAction(role: UserRole) {
  if (isAdminRole(role)) {
    return { href: "/admin/registrations", label: "Review registrations" };
  }
  if (canManageQuizzes(role)) {
    return { href: "/quizzes", label: "Manage quizzes" };
  }
  if (canTakeStudentQuizzes(role)) {
    return { href: "/student/dashboard", label: "Continue learning" };
  }
  if (canManageQuestions(role)) {
    return { href: "/questions", label: "Open question bank" };
  }
  return null;
}

/** Role-based landing page with quick links and permissions. */
export function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const modules = roleModules[user.role] ?? [];
  const quickLinks = quickLinksForRole(user.role);
  const action = primaryAction(user.role);
  const firstName = (user.fullName || user.name || user.username).split(" ")[0];

  return (
    <div className="space-y-7">
      <AppPageHeader
        studentFacing={user.role === "Student"}
        eyebrow="Your workspace"
        title={`Welcome back, ${firstName}`}
        subtitle={`${getDashboardLabel(user.role)} · things stay scoped to your school role so the right people see the right work.`}
        action={
          action ? (
            <Button asChild size="lg" className="min-h-12 w-full sm:w-auto">
              <Link to={action.href}>
                {action.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AppStatCard
          title="Signed in as"
          value={user.username}
          description={user.fullName || "Account"}
          icon={Users}
          colorVariant="primary"
        />
        <AppStatCard
          title="Your role"
          value={user.role}
          description={
            isAdminRole(user.role)
              ? "Administration access"
              : "Role-based access"
          }
          icon={ShieldCheck}
          colorVariant="ai"
        />
        <AppStatCard
          title="School scope"
          value={`${user.schoolId ?? "—"} / ${user.campusId ?? "—"}`}
          description="School ID / Campus ID"
          icon={School}
          colorVariant="neutral"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AppCard>
          <AppSectionHeader
            title="Available for you"
            description="What this role can do in RankUp."
          />
          <ul className="space-y-3">
            {modules.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl bg-muted/60 px-3 py-3 text-sm text-foreground"
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                  aria-hidden
                />
                <span className="leading-6">{item}</span>
              </li>
            ))}
          </ul>
        </AppCard>

        <AppCard>
          <AppSectionHeader
            title="Quick links"
            description="Jump to the work you do most."
          />
          <div className="grid gap-2.5 sm:grid-cols-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="group flex min-h-[4.25rem] items-center gap-3 rounded-2xl border border-border/80 bg-background/60 px-3 py-3 transition hover:border-primary/30 hover:bg-primary/5"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground group-hover:text-primary">
                      {link.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {link.hint}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </AppCard>
      </div>
    </div>
  );
}
