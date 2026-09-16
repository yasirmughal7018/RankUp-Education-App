# Student class history on Account

Show a read-only class/section placement history on the student Account page (`/account`). If a student was admitted in class 1 and is now in class 4, each placement period must appear in history.

## Rules

1. Persist history in `app_user_student_class_history` (not `app_approval`).
2. One open row per student (`ended_at` null = current class).
3. On directory create and registration activate: write an initial open row.
4. On directory update when grade or section changes: close the open row and open a new one.
5. Backfill existing students with a current open row from their profile on schema init.
6. Student API: `GET /api/students/me/class-history` (newest first).
7. Account UI (Student role only): Class history section with grade label, section, date range, school/campus when known.
