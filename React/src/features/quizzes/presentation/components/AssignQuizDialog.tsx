import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { FieldLabel } from "@/core/components/FieldLabel";
import { LookupSelect } from "@/core/components/LookupSelect";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import {
  useDirectoryCampusesQuery,
  useDirectorySchoolsQuery,
  useDirectoryStudentsQuery,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
import {
  useTeacherGroupsQuery,
  useTeacherRosterQuery,
} from "@/features/teacher/presentation/hooks/useTeacherQueries";
import {
  useLinkedStudentsQuery,
  useParentGroupsQuery,
} from "@/features/parent/presentation/hooks/useParentQueries";
import type { AssignQuizInput, QuizAssignment } from "@/features/quizzes/domain/quizTypes";
import {
  assignModesForRole,
  defaultAssignModeForRole,
  isActiveQuizAssignment,
} from "@/features/quizzes/domain/quizTypes";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

interface AssignQuizDialogProps {
  isSubmitting: boolean;
  /** Quiz class lookup id — prefills Grade. */
  classId?: number | null;
  /** Quiz school id when known. */
  schoolId?: number | null;
  /** Quiz campus id when known. */
  campusId?: number | null;
  /** When Surprise, defaults to open-now / short window. */
  quizType?: string;
  /** Existing per-student assignments — students with a row cannot be selected again. */
  existingAssignments?: QuizAssignment[];
  onClose: () => void;
  onSubmit: (input: AssignQuizInput) => Promise<void>;
}

type PickerStudent = {
  studentId: number;
  fullName: string;
  username: string;
  rollNumber: string;
  grade: number;
  section: string;
  schoolName?: string;
  campusName?: string;
};

function formatPickerStudentMeta(student: PickerStudent): string {
  const gradeLabel = `Grade ${student.grade}${student.section ? `-${student.section}` : ""}`;
  const rollOrUser = student.rollNumber || student.username;
  const parts = [
    `@${student.username}`,
    rollOrUser !== student.username ? `Roll ${student.rollNumber}` : null,
    gradeLabel,
    student.campusName || student.schoolName || null,
  ].filter(Boolean);
  return parts.join(" · ");
}

const inputClassName = FORM_FIELD_CLASS;

const SCOPED_AUDIENCE_MODES = new Set([
  "one",
  "selected",
  "group",
  "allinschool",
  "allincampus",
  "allingrade",
  "allinsection",
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

/** Modal to assign a quiz to students, a group, or a school audience with a schedule. */
export function AssignQuizDialog({
  isSubmitting,
  classId: quizClassId,
  schoolId: quizSchoolId,
  campusId: quizCampusId,
  quizType,
  existingAssignments = [],
  onClose,
  onSubmit,
}: AssignQuizDialogProps) {
  const { user } = useAuth();
  const isSchoolAdmin = user?.role === "SchoolAdmin";
  const isPortalAdmin = user?.role === "PortalAdmin";
  const isCampusAdmin = user?.role === "CampusAdmin";
  const isTeacher =
    user?.role === "Teacher" || user?.role === "Coordinator";
  const isLinkedAssigner = user?.role === "Parent";
  const isAdminAssigner = isSchoolAdmin || isPortalAdmin || isCampusAdmin;
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

  const [mode, setMode] = useState(() =>
    user ? defaultAssignModeForRole(user.role) : "selected",
  );

  const lockedSchoolId =
    user?.role === "PortalAdmin"
      ? null
      : user?.schoolId != null && user.schoolId > 0
        ? user.schoolId
        : null;
  const lockedCampusId =
    user?.role === "Teacher" ||
      user?.role === "Coordinator" ||
      user?.role === "CampusAdmin"
      ? user?.campusId != null && user.campusId > 0
        ? user.campusId
        : null
      : null;

  const [schoolId, setSchoolId] = useState<number | "">(
    () => lockedSchoolId ?? quizSchoolId ?? "",
  );
  const [campusId, setCampusId] = useState<number | "">(
    () => lockedCampusId ?? quizCampusId ?? "",
  );
  // Student picker defaults to all grades so username search is campus/school-wide.
  // Grade is only required for all-in-grade / all-in-section modes.
  const [gradeId, setGradeId] = useState<number | "">("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<
    Record<number, PickerStudent>
  >({});
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
  const [error, setError] = useState<string | null>(null);

  const showAudienceScope =
    SCOPED_AUDIENCE_MODES.has(mode) && !isLinkedAssigner && !isTeacher;
  const showStudentPicker = mode === "selected" || mode === "one";
  const canPickSchool = isPortalAdmin;
  const canPickCampus =
    isPortalAdmin || isSchoolAdmin || (isTeacher && lockedCampusId == null);
  /** CampusAdmin (and other locked roles) omit School/Campus — scope comes from the session. */
  const showSchoolInAudience = showAudienceScope && canPickSchool;
  const showCampusInAudience = showAudienceScope && canPickCampus;
  const showGradeInAudience =
    showAudienceScope && mode !== "allingrade" && mode !== "allinsection";
  const showAudienceFilters =
    showSchoolInAudience || showCampusInAudience || showGradeInAudience;

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

  /** Org admins are scoped by token; do not block the picker on a missing school select. */
  const canLoadDirectoryStudents =
    isCampusAdmin ||
    isSchoolAdmin ||
    selectedSchoolId != null ||
    isTeacher ||
    isLinkedAssigner;

  const { data: schools = [] } = useDirectorySchoolsQuery(showSchoolInAudience);
  const { data: campuses = [] } = useDirectoryCampusesQuery(
    selectedSchoolId ?? 0,
    showCampusInAudience && selectedSchoolId != null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(studentSearch.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [studentSearch]);

  // Prefill grade from the quiz only for grade/section audience modes.
  // Clear it when leaving those modes so One/Selected search is campus-wide again.
  useEffect(() => {
    if (mode === "allingrade" || mode === "allinsection") {
      if (quizClassId && quizClassId > 0) {
        setGradeId(quizClassId);
      }
      return;
    }
    setGradeId("");
  }, [mode, quizClassId]);

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
      // Only apply grade when the admin chose one (or grade/section modes set it).
      grade: selectedGradeId,
      pageNumber: 1,
      pageSize: 50,
    },
    showStudentPicker && !isTeacher && !isLinkedAssigner && canLoadDirectoryStudents,
  );
  const rosterQuery = useTeacherRosterQuery(
    (showStudentPicker || mode === "allattached") && isTeacher,
  );
  const groupsQuery = useTeacherGroupsQuery(mode === "group" && isTeacher);
  const parentGroupsQuery = useParentGroupsQuery(
    mode === "group" && isLinkedAssigner,
  );
  const parentLinkedQuery = useLinkedStudentsQuery(
    showStudentPicker && user?.role === "Parent",
  );

  const students: PickerStudent[] = isTeacher
    ? (rosterQuery.data?.students ?? [])
        .filter((student) => {
          if (selectedGradeId && student.grade !== selectedGradeId) {
            return false;
          }
          if (!debouncedSearch.trim()) {
            return true;
          }
          const term = debouncedSearch.trim().toLowerCase();
          return (
            student.fullName.toLowerCase().includes(term) ||
            student.username.toLowerCase().includes(term) ||
            student.rollNumber.toLowerCase().includes(term)
          );
        })
        .map((student) => ({
          studentId: student.studentId,
          fullName: student.fullName,
          username: student.username,
          rollNumber: student.rollNumber,
          grade: student.grade,
          section: student.section,
        }))
    : isLinkedAssigner
      ? (parentLinkedQuery.data ?? [])
          .filter((student) => {
            if (!debouncedSearch.trim()) {
              return true;
            }
            const term = debouncedSearch.trim().toLowerCase();
            return (
              student.fullName.toLowerCase().includes(term) ||
              student.username.toLowerCase().includes(term) ||
              student.rollNumber.toLowerCase().includes(term)
            );
          })
          .map((student) => ({
            studentId: student.studentId,
            fullName: student.fullName,
            username: student.username,
            rollNumber: student.rollNumber,
            grade: student.grade,
            section: student.section,
          }))
      : (studentsQuery.data?.items ?? []).map((student) => ({
          studentId: student.studentId,
          fullName: student.fullName,
          username: student.username,
          rollNumber: student.rollNumber,
          grade: student.grade,
          section: student.section,
          schoolName: student.schoolName,
          campusName: student.campusName,
        }));

  const studentsLoading = isTeacher
    ? rosterQuery.isLoading
    : isLinkedAssigner
      ? parentLinkedQuery.isLoading
      : studentsQuery.isLoading ||
        (showStudentPicker &&
          studentsQuery.isFetching &&
          (studentsQuery.data?.items?.length ?? 0) === 0);
  const studentsError = isTeacher
    ? rosterQuery.error
    : isLinkedAssigner
      ? parentLinkedQuery.error
      : studentsQuery.error;

  const selectedSet = useMemo(
    () => new Set(selectedStudentIds),
    [selectedStudentIds],
  );

  const selectedStudents = useMemo(
    () =>
      selectedStudentIds
        .map((id) => selectedStudentDetails[id])
        .filter((student): student is PickerStudent => student != null),
    [selectedStudentIds, selectedStudentDetails],
  );

  const assignmentByStudentId = useMemo(() => {
    const map = new Map<number, QuizAssignment>();
    for (const assignment of existingAssignments) {
      map.set(assignment.studentId, assignment);
    }
    return map;
  }, [existingAssignments]);

  const blockedStudentIds = useMemo(() => {
    const blocked = new Set<number>();
    for (const assignment of existingAssignments) {
      if (isActiveQuizAssignment(assignment)) {
        blocked.add(assignment.studentId);
      }
    }
    return blocked;
  }, [existingAssignments]);

  useEffect(() => {
    setSelectedStudentIds((current) =>
      current.filter((studentId) => !blockedStudentIds.has(studentId)),
    );
    setSelectedStudentDetails((current) => {
      const next = { ...current };
      let changed = false;
      for (const studentId of Object.keys(next).map(Number)) {
        if (blockedStudentIds.has(studentId)) {
          delete next[studentId];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [blockedStudentIds]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose]);

  function rememberStudent(student: PickerStudent) {
    setSelectedStudentDetails((current) => ({
      ...current,
      [student.studentId]: student,
    }));
  }

  function toggleStudent(student: PickerStudent) {
    if (blockedStudentIds.has(student.studentId)) {
      return;
    }

    if (mode === "one") {
      setSelectedStudentIds([student.studentId]);
      setSelectedStudentDetails({ [student.studentId]: student });
      return;
    }

    setSelectedStudentIds((current) => {
      if (current.includes(student.studentId)) {
        setSelectedStudentDetails((details) => {
          const next = { ...details };
          delete next[student.studentId];
          return next;
        });
        return current.filter((id) => id !== student.studentId);
      }
      rememberStudent(student);
      return [...current, student.studentId];
    });
  }

  function removeSelectedStudent(studentId: number) {
    setSelectedStudentIds((current) =>
      current.filter((id) => id !== studentId),
    );
    setSelectedStudentDetails((current) => {
      const next = { ...current };
      delete next[studentId];
      return next;
    });
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

    if (mode === "allincampus" && !selectedCampusId) {
      setError("Campus is required for all-in-campus assignment.");
      return;
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
        studentIds: selectedStudentIds.filter(
          (studentId) => !blockedStudentIds.has(studentId),
        ),
        groupId: groupId ? Number(groupId) : null,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        allowedAttempts: 1,
        gradeId:
          mode === "allingrade" ||
          mode === "allinsection" ||
          showAudienceScope
            ? selectedGradeId
            : null,
        section: mode === "allinsection" ? section.trim() : null,
        schoolIds,
        campusId:
          showAudienceScope || mode === "allincampus"
            ? selectedCampusId
            : null,
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
                const nextMode = event.target.value;
                setMode(nextMode);
                setSelectedStudentIds([]);
                setSelectedStudentDetails({});
                setStudentSearch("");
                setDebouncedSearch("");
                setGroupId("");
                setSection("");
                if (nextMode === "allingrade" || nextMode === "allinsection") {
                  if (quizClassId && quizClassId > 0) {
                    setGradeId(quizClassId);
                  }
                } else {
                  setGradeId("");
                }
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

          {showAudienceFilters ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Audience filters
              </p>
              <div
                className={`grid gap-3 ${
                  [
                    showSchoolInAudience,
                    showCampusInAudience,
                    showGradeInAudience,
                  ].filter(Boolean).length > 1
                    ? "md:grid-cols-3"
                    : "md:grid-cols-1"
                }`}
              >
                {showSchoolInAudience ? (
                  <div>
                    <FieldLabel htmlFor="assignSchool" required>
                      School
                    </FieldLabel>
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
                  </div>
                ) : null}

                {showCampusInAudience ? (
                  <div>
                    <FieldLabel
                      htmlFor="assignCampus"
                      required={mode === "allincampus"}
                    >
                      Campus
                    </FieldLabel>
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
                  </div>
                ) : null}

                {showGradeInAudience ? (
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
                ) : null}
              </div>
            </div>
          ) : null}

          {showStudentPicker ? (
            <div className="space-y-3">
              <div>
                <FieldLabel htmlFor="studentSearch">Search students</FieldLabel>
                <AppSearchInput
                  id="studentSearch"
                  value={studentSearch}
                  disabled={isSubmitting}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Name, username, or roll #"
                  aria-label="Search students by name, username, or roll"
                  className="h-10"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Type to find students, then select from the list. Selected
                  students stay visible below.
                </p>
              </div>

              {selectedStudents.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {mode === "one" ? "Selected student" : "Selected students"}{" "}
                    ({selectedStudents.length})
                  </p>
                  <ul className="space-y-2">
                    {selectedStudents.map((student) => (
                      <li
                        key={student.studentId}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {student.fullName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatPickerStudentMeta(student)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() =>
                            removeSelectedStudent(student.studentId)
                          }
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
                          aria-label={`Remove ${student.fullName}`}
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
                {!canLoadDirectoryStudents ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    Select a school to load students.
                  </p>
                ) : studentsLoading ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    Loading students...
                  </p>
                ) : studentsError ? (
                  <p className="px-3 py-4 text-sm text-[var(--status-rejected-text)]">
                    {studentsError.message}
                  </p>
                ) : students.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    {debouncedSearch
                      ? "No students match that search."
                      : "No students found for the current filters."}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {students.map((student) => {
                      const checked = selectedSet.has(student.studentId);
                      const existing = assignmentByStudentId.get(
                        student.studentId,
                      );
                      const alreadyAssigned =
                        existing != null && isActiveQuizAssignment(existing);
                      return (
                        <li key={student.studentId}>
                          <label
                            className={`flex items-start gap-3 px-3 py-2.5 ${
                              alreadyAssigned
                                ? "cursor-not-allowed bg-muted/40 opacity-70"
                                : "cursor-pointer hover:bg-muted/50"
                            }`}
                          >
                            <input
                              type={mode === "one" ? "radio" : "checkbox"}
                              name={
                                mode === "one"
                                  ? "assign-one-student"
                                  : undefined
                              }
                              checked={checked}
                              disabled={isSubmitting || alreadyAssigned}
                              onChange={() => toggleStudent(student)}
                              className="mt-1"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-3">
                                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                                  {student.fullName}
                                </span>
                                {alreadyAssigned ? (
                                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                                    Already assigned
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {formatPickerStudentMeta(student)}
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
                Student group
              </FieldLabel>
              {isTeacher || isLinkedAssigner ? (
                <select
                  id="groupId"
                  value={groupId}
                  disabled={
                    isSubmitting ||
                    (isTeacher
                      ? groupsQuery.isLoading
                      : parentGroupsQuery.isLoading)
                  }
                  onChange={(event) => setGroupId(event.target.value)}
                  className={inputClassName}
                  required
                >
                  <option value="">
                    {(isTeacher
                      ? groupsQuery.isLoading
                      : parentGroupsQuery.isLoading)
                      ? "Loading groups..."
                      : "Select a group..."}
                  </option>
                  {(isTeacher
                    ? (groupsQuery.data ?? [])
                    : (parentGroupsQuery.data ?? [])
                  ).map((group) => (
                    <option key={group.groupId} value={group.groupId}>
                      {group.groupName} ({group.memberCount})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="groupId"
                  type="number"
                  value={groupId}
                  disabled={isSubmitting}
                  onChange={(event) => setGroupId(event.target.value)}
                  className={inputClassName}
                  min={1}
                  required
                />
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {isTeacher
                  ? "Groups from My students. Only members in your classes are assigned."
                  : isLinkedAssigner
                    ? "Groups from My children. Only linked children in the group are assigned."
                    : "Enter a student group ID. Only members in your scope are assigned."}
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

          {mode === "allattached" ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
              {user?.role === "Coordinator"
                ? "Assigns to every student in your attached classes."
                : "Assigns to every student in your assigned classes and sections."}
              {(rosterQuery.data?.students.length ?? 0) > 0
                ? ` ${rosterQuery.data?.students.length} student${
                    rosterQuery.data?.students.length === 1 ? "" : "s"
                  } on your roster.`
                : ""}
            </p>
          ) : null}

          {mode === "allincampus" ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
              Assigns to all active students in
              {selectedCampusId ? " the selected campus" : " your campus"}.
            </p>
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
