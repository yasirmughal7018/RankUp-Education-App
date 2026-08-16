import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface StudentAssignedPeopleDialogProps {
  studentName: string;
  teachers: string[];
  parents: string[];
  tutors: string[];
  onClose: () => void;
}

function PeopleSection({
  title,
  names,
}: {
  title: string;
  names: string[];
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {names.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
          None assigned
        </p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
          {names.map((name) => (
            <li
              key={`${title}-${name}`}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** View teachers, parents, and tutors assigned to a student. */
export function StudentAssignedPeopleDialog({
  studentName,
  teachers,
  parents,
  tutors,
  onClose,
}: StudentAssignedPeopleDialogProps) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-assigned-people-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="student-assigned-people-title"
          className="text-lg font-semibold text-slate-900"
        >
          Assigned people
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Teachers, parents, and tutors linked to {studentName}.
        </p>

        <div className="mt-5 space-y-5">
          <PeopleSection title="Teachers" names={teachers} />
          <PeopleSection title="Parents" names={parents} />
          <PeopleSection title="Tutors" names={tutors} />
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
