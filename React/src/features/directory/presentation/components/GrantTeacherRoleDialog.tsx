import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import type {
  DirectoryCampus,
  DirectoryParent,
  DirectorySchool,
  GrantTeacherRoleInput,
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

interface GrantTeacherRoleDialogProps {
  parent: DirectoryParent;
  schools: DirectorySchool[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: GrantTeacherRoleInput) => Promise<void>;
}

/** Grant Teacher role to an existing Parent (can combine with Coordinator). */
export function GrantTeacherRoleDialog({
  parent,
  schools,
  isSubmitting,
  onClose,
  onSubmit,
}: GrantTeacherRoleDialogProps) {
  const [schoolId, setSchoolId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedSchoolId = Number(schoolId) || 0;
  const { data: campuses = [], isLoading: campusesLoading } =
    useDirectoryCampusesQuery(selectedSchoolId, selectedSchoolId > 0);

  useEffect(() => {
    setCampusId("");
  }, [schoolId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedSchoolId = Number(schoolId);
    const parsedCampusId = Number(campusId);
    const trimmedCode = teacherCode.trim();

    if (!parsedSchoolId || parsedSchoolId < 1) {
      setError("Select a school.");
      return;
    }
    if (!parsedCampusId || parsedCampusId < 1) {
      setError("Select a campus.");
      return;
    }
    if (!trimmedCode) {
      setError("Teacher code is required.");
      return;
    }

    try {
      await onSubmit({
        schoolId: parsedSchoolId,
        campusId: parsedCampusId,
        teacherCode: trimmedCode,
        mobileNumber: parent.mobileNumber ?? null,
      });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to add Teacher role.");
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
          <DialogTitle>Add Teacher role</DialogTitle>
          <DialogDescription>
            Grant the Teacher role to {parent.fullName} ({parent.username}).
            Students cannot combine roles. Parent, Teacher, and Coordinator may share one account.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <FieldLabel htmlFor="grant-teacher-school" required>
              School
            </FieldLabel>
            <select
              id="grant-teacher-school"
              value={schoolId}
              onChange={(event) => setSchoolId(event.target.value)}
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
            <FieldLabel htmlFor="grant-teacher-campus" required>
              Campus
            </FieldLabel>
            <select
              id="grant-teacher-campus"
              value={campusId}
              onChange={(event) => setCampusId(event.target.value)}
              className={FORM_FIELD_CLASS}
              required
              disabled={isSubmitting || selectedSchoolId < 1 || campusesLoading}
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

          <div>
            <FieldLabel htmlFor="grant-teacher-code" required>
              Teacher code
            </FieldLabel>
            <input
              id="grant-teacher-code"
              type="text"
              value={teacherCode}
              onChange={(event) => setTeacherCode(event.target.value)}
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
              {isSubmitting ? "Adding…" : "Add Teacher role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
