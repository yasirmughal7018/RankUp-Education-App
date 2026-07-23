import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { environment } from "@/app/environment";

type AuthSplitVariant =
  | "login"
  | "request-access"
  | "forgot-password"
  | "account-locked";

interface AuthSplitLayoutProps {
  variant: AuthSplitVariant;
  children: ReactNode;
}

const panelCopy: Record<
  AuthSplitVariant,
  { headline: string; lead: string; points: string[] }
> = {
  login: {
    headline: "Sign in to your school workspace",
    lead: "RankUp Education helps schools run quizzes, track student progress, and keep parents informed — securely, by role.",
    points: [
      "Students take timed quizzes and review results",
      "Teachers create, assign, and monitor assessments",
      "Parents follow linked children’s quiz history",
      "Admins approve accounts, questions, and school changes",
    ],
  },
  "request-access": {
    headline: "Request access to RankUp Education",
    lead: "New students, parents, and teachers can request an account. School and campus admins review requests; Portal Admin activates access.",
    points: [
      "Choose Student, Parent, or Teacher when you apply",
      "Optional school and campus route your approval queue",
      "After approval, set your password and sign in",
      "Your data stays scoped to your school and role",
    ],
  },
  "forgot-password": {
    headline: "Reset access with help from your school",
    lead: "Enter the CNIC or mobile number on your account. Your school admin will be notified so they can help restore secure access.",
    points: [
      "Use the same CNIC or mobile number you sign in with",
      "Your request is sent to school administrators",
      "An admin can help you regain access safely",
      "After reset, sign in again with your new password",
    ],
  },
  "account-locked": {
    headline: "Your account is temporarily locked",
    lead: "School or campus change requests lock your login until a destination school or campus admin reviews them.",
    points: [
      "Your request is waiting in the admin approval queue",
      "Campus, School, or Portal Admin can approve or reject in their scope",
      "Approval applies the new school/campus and unlocks you",
      "Rejection keeps your current school/campus and unlocks you",
    ],
  },
};

export function AuthSplitLayout({ variant, children }: AuthSplitLayoutProps) {
  const copy = panelCopy[variant];
  const isRequestAccess = variant === "request-access";

  return (
    <div
      className={
        isRequestAccess
          ? "flex h-dvh overflow-hidden bg-background"
          : "flex min-h-screen bg-background"
      }
    >
      <aside className="relative hidden w-[46%] overflow-hidden lg:flex lg:flex-col">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(155deg, #142757 0%, #1845b6 42%, #1d6af5 78%, #3389ff 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0.8px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 0.7px, transparent 1px)",
            backgroundSize: "28px 28px, 36px 36px",
          }}
        />
        <div
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.45) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-28 -left-16 h-96 w-96 rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 68%)",
          }}
        />

        <div
          className={
            isRequestAccess
              ? "relative z-10 flex h-full flex-col justify-between px-8 py-8 xl:px-12"
              : "relative z-10 flex h-full flex-col justify-between px-10 py-12 xl:px-14"
          }
        >
          <Link to="/" className="inline-flex items-center gap-3 self-start">
            <img
              src="/rankup-mark.svg?v=3"
              alt=""
              className="h-12 w-12 rounded-2xl shadow-lg shadow-slate-950/30"
            />
            <div>
              <p className="text-lg font-semibold tracking-tight text-white">
                {environment.appName}
              </p>
              <p className="text-xs font-medium text-sky-100/80">
                Students, parents, teachers in one learning system.
              </p>
            </div>
          </Link>

          <div className={isRequestAccess ? "max-w-md py-4" : "max-w-md py-10"}>
            <h1
              className={
                isRequestAccess
                  ? "text-2xl font-semibold leading-tight tracking-tight text-white xl:text-3xl"
                  : "text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl"
              }
            >
              {copy.headline}
            </h1>
            <p className="mt-3 text-sm leading-6 text-sky-50/90">
              {copy.lead}
            </p>
            <ul className={isRequestAccess ? "mt-5 space-y-2.5" : "mt-8 space-y-3"}>
              {copy.points.map((point) => (
                <li key={point} className="flex gap-3 text-sm text-sky-50/95">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300"
                    aria-hidden
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-sky-100/60">
            Secure role-based access for Portal, School, Campus, Teachers,
            Students, and Parents.
          </p>
        </div>
      </aside>

      <div className="flex min-h-0 w-full flex-1 flex-col lg:w-[54%]">
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2.5">
            <img
              src="/rankup-mark.svg?v=3"
              alt=""
              className="h-9 w-9 rounded-xl shadow-sm"
            />
            <span className="text-sm font-semibold text-foreground">
              {environment.appName}
            </span>
          </Link>
        </div>

        <div
          className={
            isRequestAccess
              ? "flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-6"
              : "flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 sm:px-8 lg:items-center lg:py-12"
          }
        >
          <div
            className={
              isRequestAccess ? "w-full max-w-xl" : "w-full max-w-md"
            }
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
