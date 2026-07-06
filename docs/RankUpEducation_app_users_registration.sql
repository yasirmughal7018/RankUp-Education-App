-- RankUp Education — registration via app_users (no account_requests, no JSON column)
-- Run AFTER: RankUpEducatoin_sql.sql
--
-- Flow:
--   1. User submits registration → INSERT app_users (is_active = false, password_hash NULL)
--   2. Admin approves          → INSERT profile row + SET is_active = true + SET password_hash
--   3. Admin rejects           → DELETE row
--
-- Stored on request (app_users only):
--   username      = mobile number
--   display_name  = full name
--   role          = student | parent | teacher
--   requested_at  = submission time
--   is_active     = false
--   password_hash = NULL
--
-- Extra form fields (email, school name, reason, etc.) are validated by the API
-- but are NOT persisted. Admin collects any missing details during approval.
--
-- Mobile number on profile tables is set when admin approves.

ALTER TABLE public.app_users
    ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NULL;

ALTER TABLE public.app_users
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE public.app_users
    DROP CONSTRAINT IF EXISTS chk_app_users_password_when_active;

ALTER TABLE public.app_users
    ADD CONSTRAINT chk_app_users_password_when_active
    CHECK (is_active = false OR password_hash IS NOT NULL);

CREATE INDEX IF NOT EXISTS ix_app_users_pending_registration
    ON public.app_users (requested_at DESC NULLS LAST)
    WHERE is_active = false AND password_hash IS NULL;

ALTER TABLE public.app_user_students
    ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(40) NULL;

ALTER TABLE public.app_user_parents
    ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(40) NULL;

ALTER TABLE public.app_user_teachers
    ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(40) NULL;

-- Optional: remove JSON column if it was added in an earlier draft
-- ALTER TABLE public.app_users DROP COLUMN IF EXISTS request_details;

-- Example: submit registration
-- INSERT INTO public.app_users (username, display_name, role, password_hash, is_active, requested_at)
-- VALUES ('03001234567', 'Ali Khan', 'student', NULL, false, now());

-- Example: approve
-- UPDATE public.app_users
-- SET is_active = true, password_hash = '<hash>', modified_date = CURRENT_DATE
-- WHERE id = 123 AND is_active = false;
--
-- INSERT INTO public.app_user_students (
--     student_id, school_id, campus_id, student_roll_number, grade, section, mobile_number
-- )
-- VALUES (123, 1, 1, 'ST-2026-001', 204, 'A', '03001234567');
