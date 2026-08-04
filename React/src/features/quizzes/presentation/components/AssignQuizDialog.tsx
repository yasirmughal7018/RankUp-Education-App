import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import { LookupSelect } from "@/core/components/LookupSelect";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import {
  useDirectoryCampusesQuery,
  useDirectorySchoolsQuery,
  useDirectoryStudentsQuery,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
import type { AssignQuizInput } from "@/features/quizzes/domain/quizTypes";
import { assignModesForRole } from "@/features/quizzes/domain/quizTypes";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

interface AssignQuizDialogProps {
  isSubmitting: boolean;
  /** Quiz class lookup id — prefills Grade. */
  classId?: number | null;
  /** Quiz allowed attempts — prefills Allowed attempts. */
  allowedAttempts?: number | null;
  /** Quiz school id when known. */
  schoolId?: number | null;
  /** Quiz campus id when known. */
  campusId?: number | null;
  /** When Surprise, defaults to open-now / short window and clamps attempts. */
  quizType?: string;
  onClose: () => void;
  onSubmit: (input: AssignQuizInput) => Promise<void>;
}

const inputClassName = FORM_FIELD_CLASS;

const SCOPED_AUDIENCE_MODES = new Set([
  "one",
  "selected",
  "group",
  "allinschool",
]);

function defaultDateTime(offsetHours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + offsetHours);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function defaultDateTimeMinutesFromNow(minutes: number): string {
  const date = new Date(Date.now() + minutes * 60_000);
  date.setSeconds(0, 0);
  return date.toISOString().slice(0, 16);
}

function isSurpriseQuizType(quizType?: string): boolean {
  return (quizType ?? "").trim().toLowerCase() === "surprise";
}

function resolveInitialAttempts(
  quizAttempts: number | null | undefined,
  surprise: boolean,
): number {
  if (surprise) {
    return 1;
  }
  if (quizAttempts != null && quizAttempts > 0) {
    return quizAttempts;
  }
  return 1;
}

/** Modal to assign a quiz to students, a group, or a school audience with a schedule. */
export function AssignQuizDialog({
  isSubmitting,
  classId: quizClassId,
  allowedAttempts: quizAllowedAttempts,
  schoolId: quizSchoolId,
  campusId: quizCampusId,
  quizType,
  onClose,
  onSubmit,
}: AssignQuizDialogProps) {
  const { user } = useAuth();
  const isSchoolAdmin = user?.role === "SchoolAdmin";
  const isPortalAdmin = user?.role === "PortalAdmin";
  const isTeacher = user?.role === "Teacher";
  const isAdminAssigner = isSchoolAdmin || isPortalAdmin;
  const surprise = isSurpriseQuizType(quizType);
  const modeOptions = useMemo(
    () => (user ? assignModesForRole(user.role) : assignModesForRole("Teacher")),
    [user],
  );
  const modeGroups = useMemo(() => {
    const groups = new Map<string, Array<{ value: string; label: string }>>();
    for (const option of modeOptions) {
      const list = groups.get(option.group) ?? [];
      list.push({ value: option.value, label: option.label });
      groups.set(option.group, list);
    }
    return [...groups.entries()];
  }, [modeOptions]);

  const [mode, setMode] = useState(() => {
    if (user?.role === "PortalAdmin") {
      return "public";
    }
    if (user?.role === "SchoolAdmin") {
      return "allinschool";
    }
    if (user?.role === "Parent") {
      return "alllinked";
    }
    return "selected";
  });

  const lockedSchoolId =
    user?.role === "PortalAdmin"
      ? null
      : (user?.schoolId ?? quizSchoolId ?? null);
  const lockedCampusId =
    user?.role === "Teacher" || user?.role === "CampusAdmin"
      ? (user?.campusId ?? quizCampusId ?? null)
      : null;

  const [schoolId, setSchoolId] = useState<number | "">(
    () => quizSchoolId ?? lockedSchoolId ?? "",
  );
  const [campusId, setCampusId] = useState<number | "">(
    () => quizCampusId ?? lockedCampusId ?? "",
  );
  const [gradeId, setGradeId] = useState<number | "">(
    () => (quizClassId && quizClassId > 0 ? quizClassId : ""),
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [section, setSection] = useState("");
  const [schoolIdsText, setSchoolIdsText] = useState("");
  const [startAt, setStartAt] = useState(() =>
    surprise ? defaultDateTimeMinutesFromNow(0) : defaultDateTime(1),
  );
  const [endAt, setEndAt] = useState(() =>
    surprise ? defaultDateTimeMinutesFromNow(2 * 60) : defaultDateTime(24),
  );
  const [allowedAttempts, setAllowedAttempts] = useState(() =>
    resolveInitialAttempts(quizAllowedAttempts, surprise),
  );
  const [error, setError] = useState<string | null>(null);

  const showAudienceScope = SCOPED_AUDIENCE_MODES.has(mode);
  const showStudentPicker = mode === "selected" || mode === "one";
  const canPickSchool = isPortalAdmin;
  const canPickCampus =
    isPortalAdmin || isSchoolAdmin || (isTeacher && lockedCampusId == null);

  const selectedSchoolId =
    typeof schoolId === "number" && schoolId > 0
      ? schoolId
      : lockedSchoolId && lockedSchoolId > 0
        ? lockedSchoolId
        : null;
  const selectedCampusId =
    typeof campusId === "number" && campusId > 0
      ? campusId
      : lockedCampusId && lockedCampusId > 0
        ? lockedCampusId
        : null;
  const selectedGradeId =
    typeof gradeId === "number" && gradeId > 0 ? gradeId : null;

  const { data: schools = [] } = useDirectorySchoolsQuery(
    showAudienceScope && (canPickSchool || isSchoolAdmin),
  );
  const { data: campuses = [] } = useDirectoryCampusesQuery(
    selectedSchoolId ?? 0,
    showAudienceScope && selectedSchoolId != null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(studentSearch.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [studentSearch]);

  // Keep school/campus/grade aligned when quiz props or role locks change.
  useEffect(() => {
    if (quizClassId && quizClassId > 0) {
      setGradeId(quizClassId);
    }
  }, [quizClassId]);

  useEffect(() => {
    setAllowedAttempts(resolveInitialAttempts(quizAllowedAttempts, surprise));
  }, [quizAllowedAttempts, surprise]);

  useEffect(() => {
    if (lockedSchoolId && lockedSchoolId > 0) {
      setSchoolId(lockedSchoolId);
    } else if (quizSchoolId && quizSchoolId > 0 && schoolId === "") {
      setSchoolId(quizSchoolId);
    }
  }, [lockedSchoolId, quizSchoolId, schoolId]);

  useEffect(() => {
    if (lockedCampusId && lockedCampusId > 0) {
      setCampusId(lockedCampusId);
    } else if (quizCampusId && quizCampusId > 0 && campusId === "") {
      setCampusId(quizCampusId);
    }
  }, [lockedCampusId, quizCampusId, campusId]);

  const studentsQuery = useDirectoryStudentsQuery(
    {
      search: debouncedSearch || undefined,
      schoolId: selectedSchoolId,
      campusId: selectedCampusId,
      grade: selectedGradeId,
      pageNumber: 1,
      pageSize: 50,
    },
    showStudentPicker,
  );

  const students = studentsQuery.data?.items ?? [];

  const selectedSet = useMemo(
    () => new Set(selectedStudentIds),
    [selectedStudentIds],
  );

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose]);

  function toggleStudent(studentId: number) {
    if (mode === "one") {
      setSelectedStudentIds([studentId]);
      return;
    }

    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === "one" && selectedStudentIds.length !== 1) {
      setError("Select exactly one student for one-student assignment.");
      return;
    }

    if (mode === "selected" && selectedStudentIds.length === 0) {
      setError("Select at least one student for selected assignment.");
      return;
    }

    if (mode === "group" && !groupId) {
      setError("Group ID is required for group assignment.");
      return;
    }

    if (showAudienceScope && !selectedSchoolId) {
      setError("School is required for this assignment mode.");
      return;
    }

    if (mode === "allingrade" && gradeId === "") {
      setError("Grade is required for all-in-grade assignment.");
      return;
    }

    if (mode === "allinsection") {
      if (gradeId === "") {
        setError("Grade is required for all-in-section assignment.");
        return;
      }
      if (!section.trim()) {
        setError("Section is required for all-in-section assignment.");
        return;
      }
    }

    if (mode === "multischool" && !schoolIdsText.trim()) {
      setError("Enter at least one school id for multi-school assignment.");
      return;
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setError("Start and end times must be valid.");
      return;
    }
    if (endDate <= startDate) {
      setError("End time must be after start time.");
      return;
    }
    if (surprise) {
      const windowMs = endDate.getTime() - startDate.getTime();
      const advanceMs = startDate.getTime() - Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      if (windowMs > dayMs) {
        setError(
          "Surprise quizzes must use an availability window of 24 hours or less.",
        );
        return;
      }
      if (advanceMs > dayMs) {
        setError(
          "Surprise quizzes cannot be scheduled more than 24 hours in advance.",
        );
        return;
      }
      if (allowedAttempts > 1) {
        setError("Surprise quizzes allow at most one attempt.");
        return;
      }
    }

    const schoolIds =
      mode === "multischool"
        ? schoolIdsText
            .split(/[,\s]+/)
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isFinite(value) && value > 0)
        : mode === "allinschool" && selectedSchoolId
          ? [selectedSchoolId]
          : null;

    try {
      await onSubmit({
        mode,
        studentIds: selectedStudentIds,
        groupId: groupId ? Number(groupId) : null,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        allowedAttempts: surprise ? 1 : allowedAttempts,
        gradeId:
          mode === "allingrade" ||
          mode === "allinsection" ||
          showAudienceScope
            ? selectedGradeId
            : null,
        section: mode === "allinsection" ? section.trim() : null,
        schoolIds,
        campusId: showAudienceScope ? selectedCampusId : null,
      });
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || "Unable to assign quiz.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-foreground">Assign quiz</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAdminAssigner
            ? "Choose an audience and set the window. Grade and attempts default from the quiz."
            : "Choose students and set the assignment window. Grade and attempts default from the quiz."}
        </p>
        {surprise ? (
          <p className="mt-3 rounded-lg border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] px-3 py-2 text-sm text-[var(--status-pending-text)]">
            Surprise quizzes stay hidden from students until Start. Keep the
            window ≤24h and schedule Start no more than 24h ahead. Students are
            notified when it opens.
          </p>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] px-4 py-3 text-sm text-[var(--status-rejected-text)]">
            {error}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <FieldLabel htmlFor="mode" required>
              Assignment mode
            </FieldLabel>
            <select
              id="mode"
              value={mode}
              disabled={isSubmitting}
              onChange={(event) => {
                setMode(event.target.value);
                setSelectedStudentIds([]);
              }}
              className={inputClassName}
            >
              {modeGroups.map(([group, options]) => (
                <optgroup key={group} label={group}>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {showAudienceScope ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Audience filters
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <FieldLabel htmlFor="assignSchool" required>
                    School
                  </FieldLabel>
                  {canPickSchool ? (
                    <select
                      id="assignSchool"
                      value={schoolId === "" ? "" : String(schoolId)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        const next = event.target.value
                          ? Number(event.target.value)
                          : "";
                        setSchoolId(next);
                        setCampusId("");
                        setSelectedStudentIds([]);
                      }}
                      className={inputClassName}
                      required
                    >
                      <option value="">Select school...</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="assignSchool"
                      value={
                        schools.find((s) => s.id === selectedSchoolId)?.name ??
                        (selectedSchoolId
                          ? `School #${selectedSchoolId}`
                          : "Your school")
                      }
                      disabled
                      className={inputClassName}
                      readOnly
                    />
                  )}
                </div>

                <div>
                  <FieldLabel htmlFor="assignCampus">Campus</FieldLabel>
                  {canPickCampus ? (
                    <select
                      id="assignCampus"
                      value={campusId === "" ? "" : String(campusId)}
                      disabled={isSubmitting || !selectedSchoolId}
                      onChange={(event) => {
                        setCampusId(
                          event.target.value
                            ? Number(event.target.value)
                            : "",
                        );
                        setSelectedStudentIds([]);
                      }}
                      className={inputClassName}
                    >
                      <option value="">All campuses</option>
                      {campuses.map((campus) => (
                        <option key={campus.id} value={campus.id}>
                          {campus.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="assignCampus"
                      value={
                        campuses.find((c) => c.id === selectedCampusId)?.name ??
                        (selectedCampusId
                          ? `Campus #${selectedCampusId}`
                          : "Your campus")
                      }
                      disabled
                      className={inputClassName}
                      readOnly
                    />
                  )}
                </div>

                <LookupSelect
                  label="Grade"
                  value={gradeId}
                  onChange={(next) => {
                    setGradeId(next);
                    setSelectedStudentIds([]);
                  }}
                  type={LOOKUP_TYPES.CLASS}
                  disabled={isSubmitting}
                  allowEmpty
                  emptyLabel="All grades"
                  placeholder="From quiz..."
                />
              </div>
            </div>
          ) : null}

          {showStudentPicker ? (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="studentSearch"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Search students
                </label>
                <input
                  id="studentSearch"
                  value={studentSearch}
                  disabled={isSubmitting}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  className={inputClassName}
                  placeholder="Name, username, or roll #"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Results use School, Campus, and Grade filters above.
                </p>
              </div>

              {selectedStudentIds.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {selectedStudentIds.length} student
                  {selectedStudentIds.length === 1 ? "" : "s"} selected
                </p>
              ) : null}

              <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
                {!selectedSchoolId ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    Select a school to load students.
                  </p>
                ) : studentsQuery.isLoading ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    Loading students...
                  </p>
                ) : studentsQuery.error ? (
                  <p className="px-3 py-4 text-sm text-[var(--status-rejected-text)]">
                    {studentsQuery.error.message}
                  </p>
                ) : students.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    No students found for the current filters.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {students.map((student) => {
                      const checked = selectedSet.has(student.studentId);
                      return (
                        <li key={student.studentId}>
                          <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-muted/50">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isSubmitting}
                              onChange={() => toggleStudent(student.studentId)}
                              className="mt-1"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-foreground">
                                {student.fullName}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                Grade {student.grade}
                                {student.section ? `-${student.section}` : ""} ·{" "}
                                {student.rollNumber || student.username}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          {mode === "group" ? (
            <div>
              <FieldLabel htmlFor="groupId" required>
                Group ID
              </FieldLabel>
              <input
                id="groupId"
                type="number"
                value={groupId}
                disabled={isSubmitting}
                onChange={(event) => setGroupId(event.target.value)}
                className={inputClassName}
                min={1}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter the student group ID to assign (scoped by filters above).
              </p>
            </div>
          ) : null}

          {mode === "allingrade" ? (
            <LookupSelect
              label="Grade"
              value={gradeId}
              onChange={setGradeId}
              type={LOOKUP_TYPES.CLASS}
              disabled={isSubmitting}
              required
              placeholder="Select grade..."
            />
          ) : null}

          {mode === "allinsection" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <LookupSelect
                label="Grade"
                value={gradeId}
                onChange={setGradeId}
                type={LOOKUP_TYPES.CLASS}
                disabled={isSubmitting}
                required
                placeholder="Select grade..."
              />
              <div>
                <FieldLabel htmlFor="section" required>
                  Section
                </FieldLabel>
                <input
                  id="section"
                  value={section}
                  disabled={isSubmitting}
                  onChange={(event) => setSection(event.target.value)}
                  className={inputClassName}
                  placeholder="e.g. A"
                  required
                />
              </div>
            </div>
          ) : null}

          {mode === "allinschool" ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
              Assigns to all active students matching School
              {selectedCampusId ? ", Campus" : ""}
              {selectedGradeId ? ", and Grade" : ""} above.
            </p>
          ) : null}

          {mode === "multischool" ? (
            <div>
              <FieldLabel htmlFor="schoolIds" required>
                School IDs
              </FieldLabel>
              <input
                id="schoolIds"
                value={schoolIdsText}
                disabled={isSubmitting}
                onChange={(event) => setSchoolIdsText(event.target.value)}
                className={inputClassName}
                placeholder="Comma-separated school ids"
              />
            </div>
          ) : null}

          {mode === "public" ? (
            <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
              Public quizzes appear in the student catalog. Assignments are
              created lazily when a student starts the quiz.
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="startAt" required>
                Start
              </FieldLabel>
              <input
                id="startAt"
                type="datetime-local"
                value={startAt}
                disabled={isSubmitting}
                onChange={(event) => setStartAt(event.target.value)}
                className={inputClassName}
                required
              />
            </div>

            <div>
              <FieldLabel htmlFor="endAt" required>
                End
              </FieldLabel>
              <input
                id="endAt"
                type="datetime-local"
                value={endAt}
                disabled={isSubmitting}
                onChange={(event) => setEndAt(event.target.value)}
                className={inputClassName}
                required
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="allowedAttempts" required>
              Allowed attempts
            </FieldLabel>
            <input
              id="allowedAttempts"
              type="number"
              value={allowedAttempts}
              disabled={isSubmitting || surprise}
              onChange={(event) =>
                setAllowedAttempts(Number(event.target.value))
              }
              className={inputClassName}
              min={1}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Prefills from the quiz
              {quizAllowedAttempts != null && quizAllowedAttempts > 0
                ? ` (${quizAllowedAttempts})`
                : ""}
              {surprise ? "; Surprise quizzes are limited to 1." : "."}
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
            >
              {isSubmitting ? "Assigning..." : "Assign quiz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
