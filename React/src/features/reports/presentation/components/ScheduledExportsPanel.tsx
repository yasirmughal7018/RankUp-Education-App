import { useEffect, useState, type FormEvent } from "react";

export type ScheduledReportType =
  | "quiz-summary"
  | "rankings"
  | "performance"
  | "history";

export type ScheduledFrequency = "daily" | "weekly";

export interface ScheduledExportPreference {
  reportType: ScheduledReportType;
  frequency: ScheduledFrequency;
  email: string;
  updatedAt: string;
}

const STORAGE_KEY = "rankup.reports.scheduledExport";

const REPORT_TYPE_OPTIONS: { value: ScheduledReportType; label: string }[] = [
  { value: "quiz-summary", label: "Quiz summary" },
  { value: "rankings", label: "Rankings" },
  { value: "performance", label: "Performance" },
  { value: "history", label: "Student history" },
];

function readPreference(): ScheduledExportPreference | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ScheduledExportPreference;
  } catch {
    return null;
  }
}

function writePreference(preference: ScheduledExportPreference) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
}

/** Local-storage scheduled export preferences (client-side only). */
export function ScheduledExportsPanel() {
  const [reportType, setReportType] =
    useState<ScheduledReportType>("quiz-summary");
  const [frequency, setFrequency] = useState<ScheduledFrequency>("weekly");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState<ScheduledExportPreference | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const existing = readPreference();
    if (!existing) {
      return;
    }
    setSaved(existing);
    setReportType(existing.reportType);
    setFrequency(existing.frequency);
    setEmail(existing.email);
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      return;
    }

    const preference: ScheduledExportPreference = {
      reportType,
      frequency,
      email: trimmed,
      updatedAt: new Date().toISOString(),
    };
    writePreference(preference);
    setSaved(preference);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2500);
  }

  function clearPreference() {
    localStorage.removeItem(STORAGE_KEY);
    setSaved(null);
    setJustSaved(false);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Scheduled exports
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Scheduling is coming soon. Preferences are stored in this browser only
          (localStorage) — nothing is sent to the server yet.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label
            htmlFor="scheduled-report-type"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Report type
          </label>
          <select
            id="scheduled-report-type"
            value={reportType}
            onChange={(event) =>
              setReportType(event.target.value as ScheduledReportType)
            }
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
          >
            {REPORT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="scheduled-frequency"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Frequency
          </label>
          <select
            id="scheduled-frequency"
            value={frequency}
            onChange={(event) =>
              setFrequency(event.target.value as ScheduledFrequency)
            }
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <label
            htmlFor="scheduled-email"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Email
          </label>
          <input
            id="scheduled-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@school.edu"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Save preference
          </button>
          {saved ? (
            <button
              type="button"
              onClick={clearPreference}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      {justSaved ? (
        <p className="mt-3 text-sm text-emerald-700">
          Preference saved locally. Server-side scheduling is not available yet.
        </p>
      ) : null}

      {saved ? (
        <p className="mt-3 text-xs text-slate-500">
          Last saved:{" "}
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(saved.updatedAt))}{" "}
          · {saved.reportType} · {saved.frequency} · {saved.email}
        </p>
      ) : null}
    </section>
  );
}
