import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  ClipboardList,
  GraduationCap,
  BarChart3,
  ShieldCheck,
  School,
  KeyRound,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { AppCard } from "@/components/ui/app-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const audiences = [
  { label: "Students", tone: "text-primary bg-primary/10" },
  { label: "Parents", tone: "text-[hsl(var(--achievement))] bg-[hsl(var(--achievement-light))]" },
  { label: "Teachers", tone: "text-[hsl(var(--ai))] bg-[hsl(var(--ai-light))]" },
  { label: "Admins", tone: "text-[hsl(var(--success))] bg-[hsl(var(--success-light))]" },
];

const modules = [
  {
    title: "Sign in securely",
    description: "CNIC or mobile login with role-based access for your school.",
    icon: KeyRound,
    accent: "bg-primary/10 text-primary",
  },
  {
    title: "Run your school",
    description: "Approve accounts, manage directory, and keep campuses aligned.",
    icon: ShieldCheck,
    accent: "bg-[hsl(var(--success-light))] text-[hsl(var(--success))]",
  },
  {
    title: "Question bank",
    description: "Create and approve assessment questions with clear visibility.",
    icon: BookOpenCheck,
    accent: "bg-primary/10 text-primary",
  },
  {
    title: "Quizzes & reviews",
    description: "Assign quizzes, monitor attempts, and review student work.",
    icon: ClipboardList,
    accent: "bg-[hsl(var(--ai-light))] text-[hsl(var(--ai))]",
  },
  {
    title: "Student learning",
    description: "Timed attempts, results, and a calm progress view for learners.",
    icon: GraduationCap,
    accent: "bg-[hsl(var(--achievement-light))] text-[hsl(var(--achievement))]",
  },
  {
    title: "Reports & ranks",
    description: "Simple summaries that help teachers and parents act quickly.",
    icon: BarChart3,
    accent: "bg-[hsl(var(--success-light))] text-[hsl(var(--success))]",
  },
];

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-8 lg:p-10">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-[hsl(var(--secondary))]/15 blur-3xl"
          aria-hidden
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.9fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Trusted school learning workspace
            </p>
            <h1 className="mt-4 max-w-xl font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              Learning that feels calm for students, parents, and teachers
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              RankUp helps schools run quizzes, track progress, and keep families
              informed — without clutter or confusion.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="min-h-12 w-full sm:w-auto">
                <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                  {isAuthenticated ? "Open my dashboard" : "Sign in to continue"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              {!isAuthenticated ? (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="min-h-12 w-full sm:w-auto"
                >
                  <Link to="/request-access">Request access</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="min-h-12 w-full sm:w-auto"
                >
                  <Link to="/account">My account</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/70 p-5 backdrop-blur">
            <p className="text-sm font-semibold text-foreground">Built for everyone</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              One shared theme with small role accents — never a different app per role.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {audiences.map((item) => (
                <span
                  key={item.label}
                  className={cn(
                    "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
                    item.tone,
                  )}
                >
                  {item.label}
                </span>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/80 p-3">
                <Users className="h-4 w-4 text-primary" aria-hidden />
                <p className="mt-2 text-sm font-semibold text-foreground">Families</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Parents follow linked children
                </p>
              </div>
              <div className="rounded-xl bg-muted/80 p-3">
                <School className="h-4 w-4 text-[hsl(var(--success))]" aria-hidden />
                <p className="mt-2 text-sm font-semibold text-foreground">Schools</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Campus-aware directory & approvals
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              What you can do
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Clear tools for everyday school work — not a crowded control panel.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <AppCard key={module.title} animate className="h-full">
                <span
                  className={cn(
                    "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                    module.accent,
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {module.description}
                </p>
              </AppCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}
