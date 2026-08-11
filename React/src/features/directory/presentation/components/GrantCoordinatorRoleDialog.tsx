import { useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import type {
  DirectoryCampus,
  DirectorySchool,
  GrantCoordinatorRoleInput,
  GrantTeacherCoordinatorRoleInput,
} from "@/features/directory/domain/directoryTypes";
import { useDirectoryCampusesQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

interface GrantCoordinatorRolePerson {
  fullName: string;
  username: string;
  mobileNumber?: string | null;
}

interface GrantCoordinatorRoleDefaults {
  schoolId?: number | null;
  campusId?: number | null;
  schoolName?: string | null;
  campusName?: string | null;
  coordinatorCode?: string | null;
}

interface GrantCoordinatorRoleDialogProps {
  person: GrantCoordinatorRolePerson;
  schools?: DirectorySchool[];
  isSubmitting: boolean;
  /** Optional starting values (e.g. teacher's current school/campus/code). */
  defaults?: GrantCoordinatorRoleDefaults;
  /**
   * When true, school/campus are shown read-only from the existing assignment
   * (teachers). Parents keep editable school/campus selects.
   */
  lockSchoolCampus?: boolean;
  onClose: () => void;
  onSubmit: (
    input: GrantCoordinatorRoleInput | GrantTeacherCoordinatorRoleInput,
  ) => Promise<void>;
}

/** Grant Coordinator role to an existing Parent or Teacher. */
export function GrantCoordinatorRoleDialog({
  person,
  schools = [],
  isSubmitting,
  defaults,
  lockSchoolCampus = false,
  onClose,
  onSubmit,
}: GrantCoordinatorRoleDialogProps) {
  const [schoolId, setSchoolId] = useState(
    defaults?.schoolId != null && defaults.schoolId > 0
      ? String(defaults.schoolId)
      : "",
  );
  const [campusId, setCampusId] = useState(
    defaults?.campusId != null && defaults.campusId > 0
      ? String(defaults.campusId)
      : "",
  );
  const [coordinatorCode, setCoordinatorCode] = useState(
    defaults?.coordinatorCode?.trim() ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  const selectedSchoolId = Number(schoolId) || 0;
  const { data: campuses = [], isLoading: campusesLoading } =
    useDirectoryCampusesQuery(
      selectedSchoolId,
      !lockSchoolCampus && selectedSchoolId > 0,
    );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedCode = coordinatorCode.trim();
    if (!trimmedCode) {
      setError("Coordinator code is required.");
      return;
    }

    try {
      if (lockSchoolCampus) {
        await onSubmit({
          coordinatorCode: trimmedCode,
          mobileNumber: person.mobileNumber ?? null,
        } satisfies GrantTeacherCoordinatorRoleInput);
        return;
      }

      const parsedSchoolId = Number(schoolId);
      const parsedCampusId = Number(campusId);

      if (!parsedSchoolId || parsedSchoolId < 1) {
        setError("Select a school.");
        return;
      }
      if (!parsedCampusId || parsedCampusId < 1) {
        setError("Select a campus.");
        return;
      }

      await onSubmit({
        schoolId: parsedSchoolId,
        campusId: parsedCampusId,
        coordinatorCode: trimmedCode,
        mobileNumber: person.mobileNumber ?? null,
      } satisfies GrantCoordinatorRoleInput);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to add Coordinator role.");
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Coordinator role</DialogTitle>
          <DialogDescription>
            {lockSchoolCampus
              ? `Grant the Coordinator role to ${person.fullName} (${person.username}). They will coordinate for their current school and campus. Set a coordinator code.`
              : `Grant the Coordinator role to ${person.fullName} (${person.username}). Choose the school and campus this coordinator belongs to, and set a code. Parent, Teacher, and Coordinator may share one account.`}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {lockSchoolCampus ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">School:</span>{" "}
                {defaults?.schoolName?.trim() || "—"}
              </p>
              <p className="mt-1">
                <span className="font-medium text-slate-900">Campus:</span>{" "}
                {defaults?.campusName?.trim() || "—"}
              </p>
            </div>
          ) : (
            <>
              <div>
                <FieldLabel htmlFor="grant-coordinator-school" required>
                  School
                </FieldLabel>
                <select
                  id="grant-coordinator-school"
                  value={schoolId}
                  onChange={(event) => {
                    setSchoolId(event.target.value);
                    setCampusId("");
                  }}
                  className={FORM_FIELD_CLASS}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select school</option>
                  {schools.map((school: DirectorySchool) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="grant-coordinator-campus" required>
                  Campus
                </FieldLabel>
                <select
                  id="grant-coordinator-campus"
                  value={campusId}
                  onChange={(event) => setCampusId(event.target.value)}
                  className={FORM_FIELD_CLASS}
                  required
                  disabled={
                    isSubmitting || selectedSchoolId < 1 || campusesLoading
                  }
                >
                  <option value="">
                    {campusesLoading ? "Loading campuses…" : "Select campus"}
                  </option>
                  {campuses.map((campus: DirectoryCampus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <FieldLabel htmlFor="grant-coordinator-code" required>
              Coordinator code
            </FieldLabel>
            <input
              id="grant-coordinator-code"
              type="text"
              value={coordinatorCode}
              onChange={(event) => setCoordinatorCode(event.target.value)}
              className={FORM_FIELD_CLASS}
              required
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add Coordinator role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
