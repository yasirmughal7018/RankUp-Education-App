using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RankUpEducation.Infrastructure.Persistence;

public sealed class ApiSupportSchemaInitializer : IApiSupportSchemaInitializer
{
    private readonly RankUpDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ApiSupportSchemaInitializer> _logger;

    public ApiSupportSchemaInitializer(
        RankUpDbContext dbContext,
        IConfiguration configuration,
        ILogger<ApiSupportSchemaInitializer> logger)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task EnsureCreatedAsync(CancellationToken cancellationToken)
    {
        var enabled = _configuration.GetValue("Database:EnsureApiSupportTables", true);
        if (!enabled)
        {
            _logger.LogInformation("API support schema initialization is disabled.");
            return;
        }

        await _dbContext.Database.ExecuteSqlRawAsync(RegistrationSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(UserIdentitySupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(SchoolSoftDeleteSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(NotificationSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuestionSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuestionStatusLookupSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuestionTypeLookupSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(DifficultyLevelLookupSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizLookupSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizAttemptQuestionMarksSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizQuestionTimeInSecSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizRejectionReasonSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizOptionalScopeLookupSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizNavigationAndMarkReviewSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizReviewDisplayModeSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizRandomQuestionCountSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizOfflineSyncSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizContentFreezeAndIntegritySupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(UserRoleSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(AppUserRolesSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(DropAppUsersRoleAndAdminTargetSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(ApprovalLookupSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(ApprovalSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizApprovalTrailSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuestionApprovalTrailBackfillSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(UserAvatarAndSchoolChangeSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(SchoolChangeApprovalOnAppApprovalSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(ApprovalRequestIdUnificationSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(UserRoleRequestSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(PasswordResetRequestSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(TeacherClassSectionSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(CoordinatorClassSectionSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(TutorSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuestionEditRequestSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuizEditRequestSupportSql, cancellationToken);
        _logger.LogInformation("Registration support schema is ready.");
    }

    private const string TeacherClassSectionSupportSql = """
        CREATE TABLE IF NOT EXISTS public.teacher_class_sections (
            id BIGSERIAL PRIMARY KEY,
            teacher_id BIGINT NOT NULL
                REFERENCES public.app_user_teachers (teacher_id) ON DELETE CASCADE,
            grade SMALLINT NOT NULL,
            section VARCHAR(40) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_teacher_class_sections_teacher_grade_section
            ON public.teacher_class_sections (teacher_id, grade, section);
        """;

    private const string CoordinatorClassSectionSupportSql = """
        CREATE TABLE IF NOT EXISTS public.coordinator_class_sections (
            id BIGSERIAL PRIMARY KEY,
            coordinator_user_id BIGINT NOT NULL
                REFERENCES public.app_users (id) ON DELETE CASCADE,
            grade SMALLINT NOT NULL,
            section VARCHAR(40) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_coordinator_class_sections_user_grade_section
            ON public.coordinator_class_sections (coordinator_user_id, grade, section);
        """;

    private const string TutorSupportSql = """
        CREATE TABLE IF NOT EXISTS public.app_user_tutors (
            tutor_id BIGINT PRIMARY KEY
                REFERENCES public.app_users (id) ON DELETE CASCADE,
            mobile_number VARCHAR(40) NULL,
            modified_date TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.tutor_student_relations (
            id BIGSERIAL PRIMARY KEY,
            tutor_id BIGINT NOT NULL
                REFERENCES public.app_user_tutors (tutor_id) ON DELETE CASCADE,
            student_id BIGINT NOT NULL
                REFERENCES public.app_user_students (student_id) ON DELETE CASCADE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_date DATE NOT NULL DEFAULT CURRENT_DATE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_tutor_student_relations_tutor_student
            ON public.tutor_student_relations (tutor_id, student_id);
        """;

    private const string UserRoleRequestSupportSql = """
        CREATE TABLE IF NOT EXISTS public.app_user_role_request (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL
                REFERENCES public.app_users (id) ON DELETE CASCADE,
            requested_role SMALLINT NOT NULL,
            school_id INTEGER NULL,
            campus_id INTEGER NULL,
            teacher_code VARCHAR(50) NULL,
            reason_message VARCHAR(1000) NULL,
            status SMALLINT NOT NULL DEFAULT 0,
            requested_at TIMESTAMPTZ NOT NULL,
            resolved_at TIMESTAMPTZ NULL,
            rejection_reason VARCHAR(1000) NULL,
            resolved_by_user_id BIGINT NULL
                REFERENCES public.app_users (id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS ix_app_user_role_request_user_id
            ON public.app_user_role_request (user_id);

        CREATE INDEX IF NOT EXISTS ix_app_user_role_request_status
            ON public.app_user_role_request (status);
        """;

    private const string PasswordResetRequestSupportSql = """
        CREATE TABLE IF NOT EXISTS public.app_user_password_reset_request (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL
                REFERENCES public.app_users (id) ON DELETE CASCADE,
            requester_role SMALLINT NOT NULL,
            status SMALLINT NOT NULL DEFAULT 0,
            requested_at TIMESTAMPTZ NOT NULL,
            resolved_at TIMESTAMPTZ NULL,
            completed_by_user_id BIGINT NULL
                REFERENCES public.app_users (id) ON DELETE SET NULL,
            completed_by_role SMALLINT NULL,
            email_token_hash VARCHAR(128) NULL,
            email_token_expires_at TIMESTAMPTZ NULL
        );

        CREATE INDEX IF NOT EXISTS ix_app_user_password_reset_request_user_id
            ON public.app_user_password_reset_request (user_id);

        CREATE INDEX IF NOT EXISTS ix_app_user_password_reset_request_status
            ON public.app_user_password_reset_request (status);

        CREATE INDEX IF NOT EXISTS ix_app_user_password_reset_request_email_token
            ON public.app_user_password_reset_request (email_token_hash);
        """;

    private const string UserAvatarAndSchoolChangeSupportSql = """
        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL;

        CREATE TABLE IF NOT EXISTS public.app_user_school_change_request (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL
                REFERENCES public.app_users (id) ON DELETE CASCADE,
            from_school_id INTEGER NULL,
            from_campus_id INTEGER NULL,
            to_school_id INTEGER NULL,
            to_campus_id INTEGER NULL,
            requester_role SMALLINT NOT NULL,
            status SMALLINT NOT NULL DEFAULT 0,
            requested_at TIMESTAMPTZ NOT NULL,
            resolved_at TIMESTAMPTZ NULL
        );

        CREATE INDEX IF NOT EXISTS ix_app_user_school_change_request_user_id
            ON public.app_user_school_change_request (user_id);

        CREATE INDEX IF NOT EXISTS ix_app_user_school_change_request_status
            ON public.app_user_school_change_request (status);
        """;

    /// <summary>
    /// Moves school/campus change approvals into app_approval (entity_type 2104) via request_id,
    /// then drops the legacy app_user_school_change_approval table when it still exists.
    /// </summary>
    private const string SchoolChangeApprovalOnAppApprovalSupportSql = """
        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS request_id bigint NULL;

        -- Leave chk_app_approval_target dropped until unification backfills request_id.
        ALTER TABLE public.app_approval DROP CONSTRAINT IF EXISTS chk_app_approval_target;

        DO $migrate_school_change_approvals$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'app_user_school_change_approval'
            ) THEN
                INSERT INTO public.app_approval (
                    entity_type,
                    request_id,
                    approved_by_user_id,
                    approved_by_role,
                    action,
                    created_at,
                    approved_at,
                    is_approved)
                SELECT
                    2104,
                    a.request_id,
                    a.approved_by_user_id,
                    a.approved_by_role,
                    CASE
                        WHEN a.is_approved = TRUE THEN 2203
                        WHEN a.is_approved = FALSE THEN 2206
                        ELSE NULL
                    END,
                    COALESCE(a.approved_at, r.requested_at, now()),
                    a.approved_at,
                    a.is_approved
                FROM public.app_user_school_change_approval a
                JOIN public.app_user_school_change_request r ON r.id = a.request_id
                WHERE EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = a.approved_by_user_id)
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.app_approval existing
                      WHERE existing.entity_type = 2104
                        AND existing.request_id = a.request_id
                        AND existing.approved_by_user_id = a.approved_by_user_id
                        AND existing.approved_by_role = a.approved_by_role);

                DROP TABLE public.app_user_school_change_approval;
            END IF;
        END
        $migrate_school_change_approvals$;
        """;

    /// <summary>
    /// Collapses question_id / quiz_id / school_change_request_id into a single request_id.
    /// Registration continues to use user_id; entity_type tells what request_id means.
    /// </summary>
    private const string ApprovalRequestIdUnificationSupportSql = """
        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS request_id bigint NULL;

        -- Backfill request_id from the legacy typed columns (idempotent).
        DO $backfill_request_id$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'question_id'
            ) THEN
                UPDATE public.app_approval
                SET request_id = question_id
                WHERE entity_type = 2102
                  AND question_id IS NOT NULL
                  AND (request_id IS NULL OR request_id IS DISTINCT FROM question_id);
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'quiz_id'
            ) THEN
                UPDATE public.app_approval
                SET request_id = quiz_id
                WHERE entity_type = 2103
                  AND quiz_id IS NOT NULL
                  AND (request_id IS NULL OR request_id IS DISTINCT FROM quiz_id);
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'school_change_request_id'
            ) THEN
                UPDATE public.app_approval
                SET request_id = school_change_request_id
                WHERE entity_type = 2104
                  AND school_change_request_id IS NOT NULL
                  AND (request_id IS NULL OR request_id IS DISTINCT FROM school_change_request_id);
            END IF;
        END
        $backfill_request_id$;

        -- Heal rows so the final CHECK can be applied safely.
        UPDATE public.app_approval
        SET request_id = NULL
        WHERE entity_type = 2101
          AND request_id IS NOT NULL;

        UPDATE public.app_approval
        SET user_id = NULL
        WHERE entity_type IN (2102, 2103, 2104, 2105, 2106)
          AND user_id IS NOT NULL;

        -- Drop orphan trail/queue rows that have no target after backfill.
        DELETE FROM public.app_approval
        WHERE entity_type IN (2102, 2103, 2104, 2105, 2106)
          AND request_id IS NULL;

        -- Registration rows must have user_id; drop impossible orphans.
        DELETE FROM public.app_approval
        WHERE entity_type = 2101
          AND user_id IS NULL;

        ALTER TABLE public.app_approval DROP CONSTRAINT IF EXISTS chk_app_approval_target;
        ALTER TABLE public.app_approval
            ADD CONSTRAINT chk_app_approval_target CHECK (
                (entity_type = 2101 AND user_id IS NOT NULL AND request_id IS NULL)
                OR (entity_type IN (2102, 2103, 2104, 2105, 2106) AND request_id IS NOT NULL AND user_id IS NULL)
            );

        -- Drop legacy typed FKs + columns (request_id is polymorphic — no single FK).
        ALTER TABLE public.app_approval DROP CONSTRAINT IF EXISTS app_approval_question_id_fkey;
        ALTER TABLE public.app_approval DROP CONSTRAINT IF EXISTS app_approval_quiz_id_fkey;
        ALTER TABLE public.app_approval DROP CONSTRAINT IF EXISTS app_approval_school_change_request_id_fkey;

        DROP INDEX IF EXISTS ix_app_approval_question_id;
        DROP INDEX IF EXISTS ix_app_approval_quiz_id;
        DROP INDEX IF EXISTS ix_app_approval_school_change_request_id;
        DROP INDEX IF EXISTS ix_app_approval_question_trail;
        DROP INDEX IF EXISTS ix_app_approval_quiz_trail;
        DROP INDEX IF EXISTS ix_app_approval_school_change_approver_role;
        DROP INDEX IF EXISTS ix_app_approval_school_change_pending;

        ALTER TABLE public.app_approval DROP COLUMN IF EXISTS question_id;
        ALTER TABLE public.app_approval DROP COLUMN IF EXISTS quiz_id;
        ALTER TABLE public.app_approval DROP COLUMN IF EXISTS school_change_request_id;

        CREATE INDEX IF NOT EXISTS ix_app_approval_request_id
            ON public.app_approval (request_id);

        CREATE INDEX IF NOT EXISTS ix_app_approval_question_trail
            ON public.app_approval (request_id, created_at DESC)
            WHERE entity_type = 2102;

        CREATE INDEX IF NOT EXISTS ix_app_approval_quiz_trail
            ON public.app_approval (request_id, created_at DESC)
            WHERE entity_type = 2103;

        CREATE UNIQUE INDEX IF NOT EXISTS ix_app_approval_school_change_approver_role
            ON public.app_approval (request_id, approved_by_user_id, approved_by_role)
            WHERE entity_type = 2104;

        CREATE INDEX IF NOT EXISTS ix_app_approval_school_change_pending
            ON public.app_approval (request_id)
            WHERE entity_type = 2104 AND approved_at IS NULL AND is_approved IS NULL;
        """;

    /// <summary>
    /// Active-question edit requests (app_question_edit_request) plus app_approval queue
    /// rows (entity_type 2105). Must run after ApprovalRequestIdUnificationSupportSql.
    /// Recreates chk_app_approval_target with 2105 and 2106 so existing QuizEditRequest
    /// rows are not rejected on subsequent startups.
    /// </summary>
    private const string QuestionEditRequestSupportSql = """
        CREATE TABLE IF NOT EXISTS public.app_question_edit_request (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            question_id BIGINT NOT NULL
                REFERENCES public.questions (id) ON DELETE CASCADE,
            requested_by_user_id BIGINT NOT NULL
                REFERENCES public.app_users (id),
            requested_by_role SMALLINT NOT NULL,
            reason VARCHAR(1000) NOT NULL,
            status SMALLINT NOT NULL DEFAULT 0,
            requested_at TIMESTAMPTZ NOT NULL,
            resolved_at TIMESTAMPTZ NULL,
            edit_used_at TIMESTAMPTZ NULL,
            decision_reason VARCHAR(1000) NULL
        );

        CREATE INDEX IF NOT EXISTS ix_question_edit_request_question
            ON public.app_question_edit_request (question_id);

        CREATE INDEX IF NOT EXISTS ix_question_edit_request_status
            ON public.app_question_edit_request (status);

        CREATE UNIQUE INDEX IF NOT EXISTS ux_question_edit_request_pending_user
            ON public.app_question_edit_request (question_id, requested_by_user_id)
            WHERE status = 0;

        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT 2105, 'QuestionEditRequest', 'ApprovalEntityType', 5, TRUE, NULL
        WHERE NOT EXISTS (SELECT 1 FROM public.lookups existing WHERE existing.id = 2105);

        UPDATE public.lookups
        SET name = 'QuestionEditRequest',
            type = 'ApprovalEntityType',
            order_by = 5,
            is_active = TRUE
        WHERE id = 2105;

        ALTER TABLE public.app_approval DROP CONSTRAINT IF EXISTS chk_app_approval_target;
        ALTER TABLE public.app_approval
            ADD CONSTRAINT chk_app_approval_target CHECK (
                (entity_type = 2101 AND user_id IS NOT NULL AND request_id IS NULL)
                OR (entity_type IN (2102, 2103, 2104, 2105, 2106) AND request_id IS NOT NULL AND user_id IS NULL)
            );

        CREATE UNIQUE INDEX IF NOT EXISTS ix_app_approval_question_edit_approver_role
            ON public.app_approval (request_id, approved_by_user_id, approved_by_role)
            WHERE entity_type = 2105;

        CREATE INDEX IF NOT EXISTS ix_app_approval_question_edit_pending
            ON public.app_approval (request_id)
            WHERE entity_type = 2105 AND approved_at IS NULL AND is_approved IS NULL;
        """;

    /// <summary>
    /// Quiz edit requests (app_quiz_edit_request) plus app_approval queue rows (entity_type 2106).
    /// </summary>
    private const string QuizEditRequestSupportSql = """
        CREATE TABLE IF NOT EXISTS public.app_quiz_edit_request (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            quiz_id BIGINT NOT NULL
                REFERENCES public.quizzes (id) ON DELETE CASCADE,
            requested_by_user_id BIGINT NOT NULL
                REFERENCES public.app_users (id),
            requested_by_role SMALLINT NOT NULL,
            reason VARCHAR(1000) NOT NULL,
            status SMALLINT NOT NULL DEFAULT 0,
            requested_at TIMESTAMPTZ NOT NULL,
            resolved_at TIMESTAMPTZ NULL,
            edit_used_at TIMESTAMPTZ NULL,
            decision_reason VARCHAR(1000) NULL
        );

        CREATE INDEX IF NOT EXISTS ix_quiz_edit_request_quiz
            ON public.app_quiz_edit_request (quiz_id);

        CREATE INDEX IF NOT EXISTS ix_quiz_edit_request_status
            ON public.app_quiz_edit_request (status);

        CREATE UNIQUE INDEX IF NOT EXISTS ux_quiz_edit_request_pending_user
            ON public.app_quiz_edit_request (quiz_id, requested_by_user_id)
            WHERE status = 0;

        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT 2106, 'QuizEditRequest', 'ApprovalEntityType', 6, TRUE, NULL
        WHERE NOT EXISTS (SELECT 1 FROM public.lookups existing WHERE existing.id = 2106);

        UPDATE public.lookups
        SET name = 'QuizEditRequest',
            type = 'ApprovalEntityType',
            order_by = 6,
            is_active = TRUE
        WHERE id = 2106;

        ALTER TABLE public.app_approval DROP CONSTRAINT IF EXISTS chk_app_approval_target;
        ALTER TABLE public.app_approval
            ADD CONSTRAINT chk_app_approval_target CHECK (
                (entity_type = 2101 AND user_id IS NOT NULL AND request_id IS NULL)
                OR (entity_type IN (2102, 2103, 2104, 2105, 2106) AND request_id IS NOT NULL AND user_id IS NULL)
            );

        CREATE UNIQUE INDEX IF NOT EXISTS ix_app_approval_quiz_edit_approver_role
            ON public.app_approval (request_id, approved_by_user_id, approved_by_role)
            WHERE entity_type = 2106;

        CREATE INDEX IF NOT EXISTS ix_app_approval_quiz_edit_pending
            ON public.app_approval (request_id)
            WHERE entity_type = 2106 AND approved_at IS NULL AND is_approved IS NULL;
        """;

    private const string SchoolSoftDeleteSupportSql = """
        ALTER TABLE public.schools
            ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

        ALTER TABLE public.school_campuses
            ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
        """;

    /// <summary>
    /// Ensures questions schema for rejection, AI flag, org scope, and 3-tier visibility.
    /// Backfills SchoolId/CampusId from creator and maps legacy Approved → Public (3).
    /// </summary>
    private const string QuestionSupportSql = """
        ALTER TABLE public.questions
            ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(1000) NULL;

        ALTER TABLE public.questions
            ADD COLUMN IF NOT EXISTS is_ai_approved BOOLEAN NOT NULL DEFAULT FALSE;

        ALTER TABLE public.questions
            ADD COLUMN IF NOT EXISTS school_id INTEGER NULL;

        ALTER TABLE public.questions
            ADD COLUMN IF NOT EXISTS campus_id INTEGER NULL;

        ALTER TABLE public.questions
            ADD COLUMN IF NOT EXISTS visibility_level SMALLINT NOT NULL DEFAULT 0;

        -- Creator role at create time (approval hierarchy). Default Teacher until backfilled.
        ALTER TABLE public.questions
            ADD COLUMN IF NOT EXISTS created_by_role SMALLINT NOT NULL DEFAULT 2014;

        -- Backfill org from creator user when missing.
        UPDATE public.questions q
        SET school_id = u.school_id
        FROM public.app_users u
        WHERE q.school_id IS NULL
          AND q.created_by::text ~ '^[0-9]+$'
          AND u.id = q.created_by::bigint
          AND u.school_id IS NOT NULL;

        UPDATE public.questions q
        SET campus_id = u.campus_id
        FROM public.app_users u
        WHERE q.campus_id IS NULL
          AND q.created_by::text ~ '^[0-9]+$'
          AND u.id = q.created_by::bigint
          AND u.campus_id IS NOT NULL;

        -- Backfill created_by_role from the creator's highest question-bank role.
        UPDATE public.questions q
        SET created_by_role = COALESCE(
            (
                SELECT CASE
                    WHEN BOOL_OR(r.role = 2010) THEN 2010
                    WHEN BOOL_OR(r.role = 2011) THEN 2011
                    WHEN BOOL_OR(r.role = 2012) THEN 2012
                    WHEN BOOL_OR(r.role = 2013) THEN 2013
                    ELSE 2014
                END
                FROM public.app_user_roles r
                WHERE r.user_id = q.created_by
            ),
            2014
        )
        WHERE q.created_by_role = 2014
           OR q.created_by_role IS NULL;

        -- Legacy Approved rows were globally shared → Public visibility (3).
        UPDATE public.questions
        SET visibility_level = 3
        WHERE status_id = 112
          AND (visibility_level IS NULL OR visibility_level = 0);

        -- v2 model: Campus/School endorsements are Inactive until PortalAdmin publishes.
        UPDATE public.questions
        SET is_active = FALSE
        WHERE status_id = 112
          AND visibility_level IN (1, 2)
          AND is_active = TRUE;

        CREATE INDEX IF NOT EXISTS idx_questions_visibility_scope
            ON public.questions (school_id, campus_id, visibility_level);

        CREATE INDEX IF NOT EXISTS idx_questions_created_by_role
            ON public.questions (created_by_role);

        -- created_by / approved_by: convert varchar user-id strings → bigint FKs to app_users.
        DO $question_user_fks$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'questions'
                  AND column_name = 'created_by'
                  AND data_type IN ('character varying', 'text', 'varchar')
            ) THEN
                -- Drop non-numeric / orphaned approver refs before type change.
                UPDATE public.questions
                SET approved_by = NULL
                WHERE approved_by IS NOT NULL
                  AND (
                    approved_by !~ '^[0-9]+$'
                    OR NOT EXISTS (
                        SELECT 1 FROM public.app_users u WHERE u.id = approved_by::bigint
                    )
                );

                -- Orphan creators block the FK; reassign to the earliest active user if needed.
                UPDATE public.questions q
                SET created_by = (
                    SELECT u.id::text
                    FROM public.app_users u
                    WHERE u.is_active = TRUE
                    ORDER BY u.id
                    LIMIT 1
                )
                WHERE q.created_by !~ '^[0-9]+$'
                   OR NOT EXISTS (
                        SELECT 1 FROM public.app_users u WHERE u.id = q.created_by::bigint
                   );

                ALTER TABLE public.questions
                    ALTER COLUMN created_by TYPE bigint USING created_by::bigint;

                ALTER TABLE public.questions
                    ALTER COLUMN approved_by TYPE bigint USING NULLIF(BTRIM(approved_by::text), '')::bigint;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_questions_created_by_app_users'
            ) THEN
                ALTER TABLE public.questions
                    ADD CONSTRAINT fk_questions_created_by_app_users
                    FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE RESTRICT;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_questions_approved_by_app_users'
            ) THEN
                ALTER TABLE public.questions
                    ADD CONSTRAINT fk_questions_approved_by_app_users
                    FOREIGN KEY (approved_by) REFERENCES public.app_users(id) ON DELETE RESTRICT;
            END IF;
        END
        $question_user_fks$;

        CREATE INDEX IF NOT EXISTS idx_questions_created_by
            ON public.questions (created_by);

        CREATE INDEX IF NOT EXISTS idx_questions_approved_by
            ON public.questions (approved_by);

        ALTER TABLE public.question_accepted_answers
            ADD COLUMN IF NOT EXISTS allow_ai_review BOOLEAN NOT NULL DEFAULT FALSE;

        ALTER TABLE public.question_accepted_answers
            ADD COLUMN IF NOT EXISTS allow_teacher_review BOOLEAN NOT NULL DEFAULT FALSE;

        -- One-time: move legacy Fill answers from question_options → question_accepted_answers.
        INSERT INTO public.question_accepted_answers (
            question_id, answer_text, is_case_sensitive, allow_partial_match,
            normalized_answer, minimum_length, maximum_length,
            allow_ai_review, allow_teacher_review)
        SELECT
            o.question_id,
            o.option_text,
            FALSE,
            FALSE,
            lower(trim(o.option_text)),
            0,
            1000,
            FALSE,
            FALSE
        FROM public.question_options o
        INNER JOIN public.questions q ON q.id = o.question_id
        INNER JOIN public.lookups l ON l.id = q.question_type_id
        WHERE l.type = 'QuestionType'
          AND (
              lower(l.name) LIKE '%fill%blank%'
              OR lower(l.name) IN ('fillblank', 'fill blanks')
          )
          AND o.is_correct = TRUE
          AND length(trim(o.option_text)) > 0
          AND NOT EXISTS (
              SELECT 1
              FROM public.question_accepted_answers a
              WHERE a.question_id = o.question_id
                AND lower(trim(a.answer_text)) = lower(trim(o.option_text))
          );

        DELETE FROM public.question_options o
        USING public.questions q, public.lookups l
        WHERE o.question_id = q.id
          AND q.question_type_id = l.id
          AND l.type = 'QuestionType'
          AND (
              lower(l.name) LIKE '%fill%blank%'
              OR lower(l.name) IN ('fillblank', 'fill blanks')
          );
        """;

    private const string QuestionStatusLookupSql = """
        -- Canonical QuestionStatus IDs 110–114.
        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT v.id, v.name, 'QuestionStatus', v.ord, TRUE, NULL
        FROM (
            VALUES
                (110::smallint, 'Draft'::varchar, 1::smallint),
                (111, 'PendingReview', 2),
                (112, 'Approved', 3),
                (113, 'Rejected', 4),
                (114, 'Archived', 5)
        ) AS v(id, name, ord)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.lookups existing WHERE existing.id = v.id
        );

        -- If canonical IDs already exist under QuestionStatus, normalize names.
        UPDATE public.lookups SET name = 'Draft', order_by = 1, is_active = TRUE
        WHERE id = 110 AND type = 'QuestionStatus' AND name IS DISTINCT FROM 'Draft';
        UPDATE public.lookups SET name = 'PendingReview', order_by = 2, is_active = TRUE
        WHERE id = 111 AND type = 'QuestionStatus' AND name IS DISTINCT FROM 'PendingReview';
        UPDATE public.lookups SET name = 'Approved', order_by = 3, is_active = TRUE
        WHERE id = 112 AND type = 'QuestionStatus' AND name IS DISTINCT FROM 'Approved';
        UPDATE public.lookups SET name = 'Rejected', order_by = 4, is_active = TRUE
        WHERE id = 113 AND type = 'QuestionStatus' AND name IS DISTINCT FROM 'Rejected';
        UPDATE public.lookups SET name = 'Archived', order_by = 5, is_active = TRUE
        WHERE id = 114 AND type = 'QuestionStatus' AND name IS DISTINCT FROM 'Archived';

        -- Remap questions from legacy status names onto canonical IDs when those IDs exist.
        -- Draft product flow removed: legacy Draft name/id → PendingReview (111).
        UPDATE public.questions q
        SET status_id = 111, is_active = FALSE
        FROM public.lookups l
        WHERE q.status_id = l.id
          AND l.type = 'QuestionStatus'
          AND (lower(l.name) = 'draft' OR q.status_id = 110)
          AND q.status_id <> 111
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 111 AND c.type = 'QuestionStatus');

        UPDATE public.questions q
        SET status_id = 111
        FROM public.lookups l
        WHERE q.status_id = l.id
          AND l.type = 'QuestionStatus'
          AND lower(l.name) IN ('pending', 'under review', 'pendingreview')
          AND q.status_id <> 111
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 111 AND c.type = 'QuestionStatus');

        UPDATE public.questions q
        SET status_id = 112
        FROM public.lookups l
        WHERE q.status_id = l.id
          AND l.type = 'QuestionStatus'
          AND lower(l.name) IN ('approved', 'active', 'published')
          AND q.status_id <> 112
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 112 AND c.type = 'QuestionStatus');

        UPDATE public.questions q
        SET status_id = 113
        FROM public.lookups l
        WHERE q.status_id = l.id
          AND l.type = 'QuestionStatus'
          AND lower(l.name) IN ('rejected', 'declined')
          AND q.status_id <> 113
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 113 AND c.type = 'QuestionStatus');

        UPDATE public.questions q
        SET status_id = 114
        FROM public.lookups l
        WHERE q.status_id = l.id
          AND l.type = 'QuestionStatus'
          AND lower(l.name) = 'archived'
          AND q.status_id <> 114
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 114 AND c.type = 'QuestionStatus');

        -- Non-Approved statuses must stay inactive. Approved keeps its IsActive so
        -- PortalAdmin deactivate (Approved + IsActive=false) survives API restarts.
        UPDATE public.questions SET is_active = FALSE WHERE status_id IN (110, 111, 113, 114);

        -- Keep Draft lookup row for ID stability but hide from normal use.
        UPDATE public.lookups SET is_active = FALSE, order_by = 99
        WHERE id = 110 AND type = 'QuestionStatus';
""";

    private const string QuestionTypeLookupSql = """
        -- Canonical QuestionType IDs 100–108.
        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT v.id, v.name, 'QuestionType', v.ord, TRUE, NULL
        FROM (
            VALUES
                (100::smallint, 'Single Choice'::varchar, 1::smallint),
                (101, 'Multiple Choice', 2),
                (102, 'True/False', 3),
                (103, 'Fill in the Blanks', 4),
                (104, 'Descriptive', 5),
                (105, 'File Upload', 6),
                (106, 'Matching', 7),
                (107, 'Ordering', 8),
                (108, 'Media', 9)
        ) AS v(id, name, ord)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.lookups existing WHERE existing.id = v.id
        );

        UPDATE public.lookups SET name = 'Single Choice', order_by = 1, is_active = TRUE
        WHERE id = 100 AND type = 'QuestionType' AND name IS DISTINCT FROM 'Single Choice';
        UPDATE public.lookups SET name = 'Multiple Choice', order_by = 2, is_active = TRUE
        WHERE id = 101 AND type = 'QuestionType' AND name IS DISTINCT FROM 'Multiple Choice';
        UPDATE public.lookups SET name = 'True/False', order_by = 3, is_active = TRUE
        WHERE id = 102 AND type = 'QuestionType' AND name IS DISTINCT FROM 'True/False';
        UPDATE public.lookups SET name = 'Fill in the Blanks', order_by = 4, is_active = TRUE
        WHERE id = 103 AND type = 'QuestionType' AND name IS DISTINCT FROM 'Fill in the Blanks';
        UPDATE public.lookups SET name = 'Descriptive', order_by = 5, is_active = TRUE
        WHERE id = 104 AND type = 'QuestionType' AND name IS DISTINCT FROM 'Descriptive';
        UPDATE public.lookups SET name = 'File Upload', order_by = 6, is_active = TRUE
        WHERE id = 105 AND type = 'QuestionType' AND name IS DISTINCT FROM 'File Upload';
        UPDATE public.lookups SET name = 'Matching', order_by = 7, is_active = TRUE
        WHERE id = 106 AND type = 'QuestionType' AND name IS DISTINCT FROM 'Matching';
        UPDATE public.lookups SET name = 'Ordering', order_by = 8, is_active = TRUE
        WHERE id = 107 AND type = 'QuestionType' AND name IS DISTINCT FROM 'Ordering';
        UPDATE public.lookups SET name = 'Media', order_by = 9, is_active = TRUE
        WHERE id = 108 AND type = 'QuestionType' AND name IS DISTINCT FROM 'Media';

        -- Remap questions from legacy type names onto canonical IDs.
        UPDATE public.questions q
        SET question_type_id = 100
        FROM public.lookups l
        WHERE q.question_type_id = l.id
          AND l.type = 'QuestionType'
          AND lower(l.name) IN ('single choice', 'singlechoice', 'mcq')
          AND q.question_type_id <> 100
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 100 AND c.type = 'QuestionType');

        UPDATE public.questions q
        SET question_type_id = 101
        FROM public.lookups l
        WHERE q.question_type_id = l.id
          AND l.type = 'QuestionType'
          AND lower(l.name) IN ('multiple choice', 'multiplechoice', 'multi select', 'multiselect', 'multiple')
          AND q.question_type_id <> 101
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 101 AND c.type = 'QuestionType');

        UPDATE public.questions q
        SET question_type_id = 102
        FROM public.lookups l
        WHERE q.question_type_id = l.id
          AND l.type = 'QuestionType'
          AND lower(replace(l.name, ' ', '')) IN ('true/false', 'truefalse')
          AND q.question_type_id <> 102
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 102 AND c.type = 'QuestionType');

        UPDATE public.questions q
        SET question_type_id = 103
        FROM public.lookups l
        WHERE q.question_type_id = l.id
          AND l.type = 'QuestionType'
          AND lower(l.name) IN ('fill in the blanks', 'fill in the blank', 'fillblank', 'fill blanks')
          AND q.question_type_id <> 103
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 103 AND c.type = 'QuestionType');

        UPDATE public.questions q
        SET question_type_id = 104
        FROM public.lookups l
        WHERE q.question_type_id = l.id
          AND l.type = 'QuestionType'
          AND lower(l.name) IN ('descriptive', 'short answer', 'shortanswer')
          AND q.question_type_id <> 104
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 104 AND c.type = 'QuestionType');
        """;

    private const string DifficultyLevelLookupSql = """
        -- Canonical DifficultyLevel IDs 2001–2003.
        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT v.id, v.name, 'DifficultyLevel', v.ord, TRUE, NULL
        FROM (
            VALUES
                (2001::smallint, 'Easy'::varchar, 1::smallint),
                (2002, 'Medium', 2),
                (2003, 'Hard', 3)
        ) AS v(id, name, ord)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.lookups existing WHERE existing.id = v.id
        );

        UPDATE public.lookups SET name = 'Easy', order_by = 1, is_active = TRUE
        WHERE id = 2001 AND type = 'DifficultyLevel' AND name IS DISTINCT FROM 'Easy';
        UPDATE public.lookups SET name = 'Medium', order_by = 2, is_active = TRUE
        WHERE id = 2002 AND type = 'DifficultyLevel' AND name IS DISTINCT FROM 'Medium';
        UPDATE public.lookups SET name = 'Hard', order_by = 3, is_active = TRUE
        WHERE id = 2003 AND type = 'DifficultyLevel' AND name IS DISTINCT FROM 'Hard';

        -- Remap questions.difficulty_level from legacy DifficultyLevel names.
        UPDATE public.questions q
        SET difficulty_level = 2001
        FROM public.lookups l
        WHERE q.difficulty_level = l.id
          AND l.type = 'DifficultyLevel'
          AND lower(l.name) = 'easy'
          AND q.difficulty_level <> 2001
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 2001 AND c.type = 'DifficultyLevel');

        UPDATE public.questions q
        SET difficulty_level = 2002
        FROM public.lookups l
        WHERE q.difficulty_level = l.id
          AND l.type = 'DifficultyLevel'
          AND lower(l.name) = 'medium'
          AND q.difficulty_level <> 2002
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 2002 AND c.type = 'DifficultyLevel');

        UPDATE public.questions q
        SET difficulty_level = 2003
        FROM public.lookups l
        WHERE q.difficulty_level = l.id
          AND l.type = 'DifficultyLevel'
          AND lower(l.name) = 'hard'
          AND q.difficulty_level <> 2003
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 2003 AND c.type = 'DifficultyLevel');

        -- Remap quizzes.difficulty_level_id when column exists.
        UPDATE public.quizzes qz
        SET difficulty_level_id = 2001
        FROM public.lookups l
        WHERE qz.difficulty_level_id = l.id
          AND l.type = 'DifficultyLevel'
          AND lower(l.name) = 'easy'
          AND qz.difficulty_level_id <> 2001
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 2001 AND c.type = 'DifficultyLevel');

        UPDATE public.quizzes qz
        SET difficulty_level_id = 2002
        FROM public.lookups l
        WHERE qz.difficulty_level_id = l.id
          AND l.type = 'DifficultyLevel'
          AND lower(l.name) = 'medium'
          AND qz.difficulty_level_id <> 2002
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 2002 AND c.type = 'DifficultyLevel');

        UPDATE public.quizzes qz
        SET difficulty_level_id = 2003
        FROM public.lookups l
        WHERE qz.difficulty_level_id = l.id
          AND l.type = 'DifficultyLevel'
          AND lower(l.name) = 'hard'
          AND qz.difficulty_level_id <> 2003
          AND EXISTS (SELECT 1 FROM public.lookups c WHERE c.id = 2003 AND c.type = 'DifficultyLevel');
        """;

    private const string QuizLookupSupportSql = """
        -- Quiz approval: 40 Pending, 41 SchoolApproved, 42 Approved, 43 Rejected.
        -- Quiz lifecycle: 60 Draft, 61 Published, 62 Assigned, 63 Archived.
        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT v.id, v.name, v.type, v.ord, TRUE, NULL
        FROM (
            VALUES
                (5::smallint,  'ParentPrivate'::varchar,  'QuizType'::varchar, 5::smallint),
                (40::smallint, 'Pending'::varchar,        'QuizApprovalStatus'::varchar, 1::smallint),
                (41::smallint, 'SchoolApproved'::varchar, 'QuizApprovalStatus'::varchar, 2::smallint),
                (42::smallint, 'Approved'::varchar,       'QuizApprovalStatus'::varchar, 3::smallint),
                (43::smallint, 'Rejected'::varchar,       'QuizApprovalStatus'::varchar, 4::smallint),
                (60::smallint, 'Draft'::varchar,          'QuizLifecycleStatus'::varchar, 1::smallint),
                (61::smallint, 'Published'::varchar,      'QuizLifecycleStatus'::varchar, 2::smallint),
                (62::smallint, 'Assigned'::varchar,       'QuizLifecycleStatus'::varchar, 3::smallint),
                (63::smallint, 'Archived'::varchar,       'QuizLifecycleStatus'::varchar, 4::smallint)
        ) AS v(id, name, type, ord)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.lookups existing WHERE existing.id = v.id
        );

        -- Remap quiz FKs off legacy meanings of 41–43 before renaming those rows.
        -- Under Teacher Review / Under AI Review → Pending.
        UPDATE public.quizzes AS q
        SET approval_status_id = 40
        FROM public.lookups AS l
        WHERE q.approval_status_id = l.id
          AND l.type = 'QuizApprovalStatus'
          AND l.id IN (41, 42)
          AND lower(l.name) IN (
              'under teacher review',
              'under ai review',
              'under review'
          );

        -- Old approval-Cancelled (43) → Rejected (will live on 43 after rename; use 45 if present).
        UPDATE public.quizzes AS q
        SET approval_status_id = CASE
            WHEN EXISTS (
                SELECT 1 FROM public.lookups r
                WHERE r.id = 45 AND r.type = 'QuizApprovalStatus'
            ) THEN 45
            ELSE 43
        END
        FROM public.lookups AS l
        WHERE q.approval_status_id = l.id
          AND l.type = 'QuizApprovalStatus'
          AND l.id = 43
          AND lower(l.name) IN ('cancelled', 'canceled');

        -- Previous scheme: 44 Approved, 45 Rejected, 46 SchoolApproved → 42 / 43 / 41.
        UPDATE public.quizzes SET approval_status_id = 41 WHERE approval_status_id = 46;
        UPDATE public.quizzes SET approval_status_id = 42 WHERE approval_status_id = 44;
        UPDATE public.quizzes SET approval_status_id = 43 WHERE approval_status_id = 45;

        -- Canonical names on 40–43 (reuse existing IDs; rename away from Under Review / Cancelled).
        UPDATE public.lookups SET name = 'Pending', order_by = 1, is_active = TRUE
        WHERE id = 40 AND type = 'QuizApprovalStatus';

        UPDATE public.lookups SET name = 'SchoolApproved', order_by = 2, is_active = TRUE
        WHERE id = 41 AND type = 'QuizApprovalStatus';

        UPDATE public.lookups SET name = 'Approved', order_by = 3, is_active = TRUE
        WHERE id = 42 AND type = 'QuizApprovalStatus';

        UPDATE public.lookups SET name = 'Rejected', order_by = 4, is_active = TRUE
        WHERE id = 43 AND type = 'QuizApprovalStatus';

        -- Retire previous approval IDs (44/45/46) so name resolution cannot hit them.
        UPDATE public.lookups
        SET is_active = FALSE,
            order_by = 99,
            name = CASE id
                WHEN 44 THEN 'Approved (legacy)'
                WHEN 45 THEN 'Rejected (legacy)'
                WHEN 46 THEN 'SchoolApproved (legacy)'
                ELSE name
            END
        WHERE id IN (44, 45, 46) AND type = 'QuizApprovalStatus';

        -- Canonical lifecycle names: Draft → Published → Assigned → Archived.
        UPDATE public.lookups SET name = 'Draft', order_by = 1, is_active = TRUE
        WHERE id = 60 AND type = 'QuizLifecycleStatus';

        UPDATE public.lookups SET name = 'Published', order_by = 2, is_active = TRUE
        WHERE id = 61 AND type = 'QuizLifecycleStatus';

        UPDATE public.lookups SET name = 'Assigned', order_by = 3, is_active = TRUE
        WHERE id = 62 AND type = 'QuizLifecycleStatus';

        -- Remap retired lifecycle rows on quizzes before ID 63 becomes Archived.
        -- Cancelled (65) → Assigned if any assignment rows exist, else Published.
        UPDATE public.quizzes AS q
        SET lifecycle_status_id = 62
        WHERE q.lifecycle_status_id = 65
          AND EXISTS (
              SELECT 1 FROM public.quiz_assignments AS a WHERE a.quiz_id = q.id
          );

        UPDATE public.quizzes
        SET lifecycle_status_id = 61
        WHERE lifecycle_status_id = 65;

        -- Old In Progress (63) / Completed (64) were never valid on the quiz row → Assigned.
        UPDATE public.quizzes AS q
        SET lifecycle_status_id = 62
        FROM public.lookups AS l
        WHERE q.lifecycle_status_id = l.id
          AND l.type = 'QuizLifecycleStatus'
          AND l.id IN (63, 64)
          AND lower(l.name) NOT IN ('archived');

        -- Previous Archived id 66 → canonical 63.
        UPDATE public.quizzes
        SET lifecycle_status_id = 63
        WHERE lifecycle_status_id = 66;

        UPDATE public.lookups SET name = 'Archived', order_by = 4, is_active = TRUE
        WHERE id = 63 AND type = 'QuizLifecycleStatus';

        -- Deactivate retired lifecycle statuses (Completed / Cancelled / old Archived 66).
        UPDATE public.lookups
        SET is_active = FALSE,
            order_by = 99,
            name = CASE id
                WHEN 64 THEN 'Completed (legacy)'
                WHEN 65 THEN 'Cancelled (legacy)'
                WHEN 66 THEN 'Archived (legacy)'
                ELSE name
            END
        WHERE id IN (64, 65, 66) AND type = 'QuizLifecycleStatus';

        UPDATE public.lookups SET is_active = TRUE
        WHERE id = 5 AND type = 'QuizType';
        """;

    /// <summary>
    /// Freeze quiz-specific marks on each attempt question so later QuizQuestion edits
    /// cannot change historical scoring. Backfills from live quiz_questions when possible.
    /// </summary>
    private const string QuizAttemptQuestionMarksSupportSql = """
        ALTER TABLE public.quiz_attempt_questions
            ADD COLUMN IF NOT EXISTS marks smallint NOT NULL DEFAULT 0;

        UPDATE public.quiz_attempt_questions AS aq
        SET marks = qq.marks
        FROM public.quiz_attempts AS a
        INNER JOIN public.quiz_questions AS qq
            ON qq.quiz_id = a.quiz_id
        WHERE aq.quiz_attempt_id = a.id
          AND aq.question_id = qq.question_id
          AND aq.marks = 0
          AND qq.marks > 0;
        """;

    /// <summary>
    /// Per-question time lives on quiz_questions (time_in_sec). Option shuffle is quiz-level only.
    /// Backfills time from the bank question estimated_time_seconds when missing.
    /// </summary>
    private const string QuizQuestionTimeInSecSupportSql = """
        ALTER TABLE public.quiz_questions
            ADD COLUMN IF NOT EXISTS time_in_sec smallint NOT NULL DEFAULT 0;

        UPDATE public.quiz_questions AS qq
        SET time_in_sec = q.estimated_time_seconds
        FROM public.questions AS q
        WHERE qq.question_id = q.id
          AND (qq.time_in_sec IS NULL OR qq.time_in_sec = 0)
          AND q.estimated_time_seconds > 0;

        ALTER TABLE public.quiz_questions
            DROP COLUMN IF EXISTS shuffle_options;
        """;

    private const string QuizRejectionReasonSupportSql = """
        ALTER TABLE public.quizzes
            ADD COLUMN IF NOT EXISTS rejection_reason varchar(1000) NULL;
        """;

    /// <summary>
    /// PortalAdmin/SchoolAdmin may omit school/campus; all roles may omit topic/difficulty.
    /// Persist NULL (not 0) so FK constraints to schools/campuses/lookups remain valid.
    /// </summary>
    private const string QuizOptionalScopeLookupSupportSql = """
        ALTER TABLE public.quizzes
            ALTER COLUMN school_id DROP NOT NULL;

        ALTER TABLE public.quizzes
            ALTER COLUMN school_campus_id DROP NOT NULL;

        ALTER TABLE public.quizzes
            ALTER COLUMN topic_id DROP NOT NULL;

        ALTER TABLE public.quizzes
            ALTER COLUMN difficulty_level_id DROP NOT NULL;
        """;

    private const string QuizNavigationAndMarkReviewSupportSql = """
        ALTER TABLE public.quizzes
            ADD COLUMN IF NOT EXISTS navigation_mode varchar(20) NOT NULL DEFAULT 'Free';

        ALTER TABLE public.quizzes
            ADD COLUMN IF NOT EXISTS audience_scope varchar(20) NOT NULL DEFAULT 'Assigned';

        ALTER TABLE public.quizzes
            ADD COLUMN IF NOT EXISTS audience_start_at timestamptz NULL;

        ALTER TABLE public.quizzes
            ADD COLUMN IF NOT EXISTS audience_end_at timestamptz NULL;

        ALTER TABLE public.quizzes
            ADD COLUMN IF NOT EXISTS audience_allowed_attempts smallint NULL;

        ALTER TABLE public.quiz_attempt_questions
            ADD COLUMN IF NOT EXISTS is_marked_for_review boolean NOT NULL DEFAULT FALSE;
        """;

    private const string QuizReviewDisplayModeSupportSql = """
        ALTER TABLE public.quizzes
            ADD COLUMN IF NOT EXISTS review_display_mode varchar(20) NOT NULL DEFAULT 'ScoreOnly';
        """;

    private const string QuizRandomQuestionCountSupportSql = """
        ALTER TABLE public.quizzes
            ADD COLUMN IF NOT EXISTS random_question_count smallint NULL;
        """;

    private const string QuizOfflineSyncSupportSql = """
        ALTER TABLE public.quiz_attempts
            ADD COLUMN IF NOT EXISTS client_sync_id varchar(64) NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS ux_quiz_attempts_client_sync_id
            ON public.quiz_attempts (client_sync_id)
            WHERE client_sync_id IS NOT NULL;
        """;

    private const string QuizContentFreezeAndIntegritySupportSql = """
        ALTER TABLE public.quiz_attempt_questions
            ADD COLUMN IF NOT EXISTS question_text varchar(2000) NOT NULL DEFAULT '';

        ALTER TABLE public.quiz_attempt_questions
            ADD COLUMN IF NOT EXISTS question_type_name varchar(100) NOT NULL DEFAULT '';

        ALTER TABLE public.quiz_attempt_questions
            ADD COLUMN IF NOT EXISTS hint varchar(1000) NULL;

        ALTER TABLE public.quiz_attempt_questions
            ADD COLUMN IF NOT EXISTS explanation varchar(2000) NULL;

        ALTER TABLE public.quiz_attempt_questions
            ADD COLUMN IF NOT EXISTS estimated_time_seconds smallint NOT NULL DEFAULT 0;

        ALTER TABLE public.quiz_attempt_questions
            ADD COLUMN IF NOT EXISTS time_spent_seconds smallint NOT NULL DEFAULT 0;

        ALTER TABLE public.quiz_attempts
            ADD COLUMN IF NOT EXISTS focus_loss_count smallint NOT NULL DEFAULT 0;

        ALTER TABLE public.quiz_attempts
            ADD COLUMN IF NOT EXISTS clipboard_paste_count smallint NOT NULL DEFAULT 0;

        CREATE TABLE IF NOT EXISTS public.quiz_attempt_question_options (
            id bigserial PRIMARY KEY,
            quiz_attempt_question_id bigint NOT NULL
                REFERENCES public.quiz_attempt_questions (id) ON DELETE CASCADE,
            source_option_id bigint NULL,
            option_text varchar(1000) NOT NULL,
            option_image_url varchar(500) NULL,
            is_correct boolean NOT NULL DEFAULT FALSE,
            display_order smallint NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_quiz_attempt_question_options_aq
            ON public.quiz_attempt_question_options (quiz_attempt_question_id);

        CREATE TABLE IF NOT EXISTS public.quiz_attempt_accepted_answers (
            id bigserial PRIMARY KEY,
            quiz_attempt_question_id bigint NOT NULL
                REFERENCES public.quiz_attempt_questions (id) ON DELETE CASCADE,
            answer_text varchar(1000) NOT NULL,
            is_case_sensitive boolean NOT NULL DEFAULT FALSE,
            allow_partial_match boolean NOT NULL DEFAULT FALSE,
            normalized_answer varchar(1000) NOT NULL DEFAULT '',
            minimum_length smallint NOT NULL DEFAULT 0,
            maximum_length smallint NOT NULL DEFAULT 0,
            allow_ai_review boolean NOT NULL DEFAULT FALSE,
            allow_teacher_review boolean NOT NULL DEFAULT FALSE
        );

        CREATE INDEX IF NOT EXISTS idx_quiz_attempt_accepted_answers_aq
            ON public.quiz_attempt_accepted_answers (quiz_attempt_question_id);

        -- Backfill frozen text/type from live bank for existing rows with empty snapshot.
        UPDATE public.quiz_attempt_questions AS aq
        SET question_text = q.question_text,
            question_type_name = COALESCE(l.name, 'Unknown'),
            hint = q.hint,
            explanation = q.explanation,
            estimated_time_seconds = COALESCE(q.estimated_time_seconds, 0)
        FROM public.questions AS q
        LEFT JOIN public.lookups AS l ON l.id = q.question_type_id
        WHERE aq.question_id = q.id
          AND (aq.question_text = '' OR aq.question_type_name = '');
        """;

    private const string UserRoleSupportSql = """
        -- Ensure UserRole lookup rows exist (IDs match Domain.UserRole).
        -- Layout: 2010 PortalAdmin, 2011 SchoolAdmin, 2012 CampusAdmin,
        --         2013 Parent, 2014 Teacher, 2015 Student, 2016 Coordinator, 2017 Tutor.
        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT seed.id, seed.name, 'UserRole', seed.order_by, TRUE, NULL
        FROM (
            VALUES
                (2010, 'PortalAdmin'::varchar, 0::smallint),
                (2011, 'SchoolAdmin', 0),
                (2012, 'CampusAdmin', 0),
                (2013, 'Parent', 0),
                (2014, 'Teacher', 0),
                (2015, 'Student', 0),
                (2016, 'Coordinator', 0),
                (2017, 'Tutor', 0)
        ) AS seed(id, name, order_by)
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.lookups existing
            WHERE existing.id = seed.id
        );

        -- Keep names aligned when IDs already exist (lookup value renames).
        UPDATE public.lookups AS existing
        SET name = seed.name,
            type = 'UserRole',
            is_active = TRUE
        FROM (
            VALUES
                (2010, 'PortalAdmin'::varchar),
                (2011, 'SchoolAdmin'),
                (2012, 'CampusAdmin'),
                (2013, 'Parent'),
                (2014, 'Teacher'),
                (2015, 'Student'),
                (2016, 'Coordinator'),
                (2017, 'Tutor')
        ) AS seed(id, name)
        WHERE existing.id = seed.id
          AND existing.type = 'UserRole'
          AND existing.name IS DISTINCT FROM seed.name;

        -- Convert app_users.role from text names to lookup ids (smallint).
        DO $migrate$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'app_users'
                  AND column_name = 'role'
                  AND data_type = 'text'
            ) THEN
                ALTER TABLE public.student_groups
                    DROP CONSTRAINT IF EXISTS student_groups_refral_id_and_role_fkey;
                ALTER TABLE public.student_groups
                    DROP CONSTRAINT IF EXISTS chk_creator_role_type;
                ALTER TABLE public.app_users
                    DROP CONSTRAINT IF EXISTS chk_app_users_role;
                ALTER TABLE public.app_users
                    DROP CONSTRAINT IF EXISTS app_users_id_role_key;

                ALTER TABLE public.app_users
                    ADD COLUMN IF NOT EXISTS role_id int2 NULL;

                UPDATE public.app_users
                SET role_id = CASE lower(role)
                    WHEN 'portaladmin' THEN 2010
                    WHEN 'superadmin' THEN 2010
                    WHEN 'schooladmin' THEN 2011
                    WHEN 'campusadmin' THEN 2012
                    WHEN 'parent' THEN 2013
                    WHEN 'teacher' THEN 2014
                    WHEN 'student' THEN 2015
                    WHEN 'coordinator' THEN 2016
                    WHEN 'tutor' THEN 2017
                    ELSE NULL
                END
                WHERE role_id IS NULL;

                ALTER TABLE public.app_users
                    DROP COLUMN role;

                ALTER TABLE public.app_users
                    RENAME COLUMN role_id TO role;

                ALTER TABLE public.app_users
                    ALTER COLUMN role SET NOT NULL;

                ALTER TABLE public.app_users
                    ADD CONSTRAINT app_users_id_role_key UNIQUE (id, role);

                ALTER TABLE public.app_users
                    ADD CONSTRAINT app_users_role_fkey
                    FOREIGN KEY (role) REFERENCES public.lookups(id);

                ALTER TABLE public.app_users
                    ADD CONSTRAINT chk_app_users_role
                    CHECK (role = ANY (ARRAY[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]::int2[]));

                -- student_groups.creator_role: text -> lookup id (Parent=2013, Teacher=2014, Coordinator=2016, Tutor=2017)
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'student_groups'
                      AND column_name = 'creator_role'
                      AND data_type IN ('character varying', 'text')
                ) THEN
                    ALTER TABLE public.student_groups
                        ADD COLUMN IF NOT EXISTS creator_role_id int2 NULL;

                    UPDATE public.student_groups
                    SET creator_role_id = CASE lower(creator_role)
                        WHEN 'parent' THEN 2013
                        WHEN 'teacher' THEN 2014
                        WHEN 'coordinator' THEN 2016
                        WHEN 'tutor' THEN 2017
                        ELSE NULL
                    END
                    WHERE creator_role_id IS NULL;

                    ALTER TABLE public.student_groups
                        DROP COLUMN creator_role;

                    ALTER TABLE public.student_groups
                        RENAME COLUMN creator_role_id TO creator_role;
                END IF;

                ALTER TABLE public.student_groups
                    ADD CONSTRAINT chk_creator_role_type
                    CHECK (creator_role IS NULL OR creator_role = ANY (ARRAY[2013, 2014, 2016, 2017]::int2[]));

                ALTER TABLE public.student_groups
                    ADD CONSTRAINT student_groups_refral_id_and_role_fkey
                    FOREIGN KEY (referral_id, creator_role)
                    REFERENCES public.app_users(id, role);
            END IF;
        END
        $migrate$;

        -- Widen app_users role CHECK for Coordinator (2016) and Tutor (2017).
        DO $widen_users_role$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_users' AND column_name = 'role'
            ) THEN
                ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS chk_app_users_role;
                ALTER TABLE public.app_users
                    ADD CONSTRAINT chk_app_users_role
                    CHECK (role = ANY (ARRAY[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]::int2[]));
            END IF;
        END
        $widen_users_role$;
        """;

    private const string AppUserRolesSupportSql = """
        CREATE TABLE IF NOT EXISTS public.app_user_roles (
            user_id bigint NOT NULL,
            role int2 NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT app_user_roles_pkey PRIMARY KEY (user_id, role),
            CONSTRAINT app_user_roles_user_id_fkey
                FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE,
            CONSTRAINT app_user_roles_role_fkey
                FOREIGN KEY (role) REFERENCES public.lookups(id),
            CONSTRAINT chk_app_user_roles_role
                CHECK (role = ANY (ARRAY[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]::int2[]))
        );

        CREATE INDEX IF NOT EXISTS ix_app_user_roles_role
            ON public.app_user_roles (role);

        -- Backfill from legacy app_users.role when that column still exists.
        DO $backfill$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'app_users'
                  AND column_name = 'role'
            ) THEN
                INSERT INTO public.app_user_roles (user_id, role, created_at)
                SELECT u.id, u.role, now()
                FROM public.app_users u
                WHERE u.role IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.app_user_roles r
                      WHERE r.user_id = u.id AND r.role = u.role
                  );
            END IF;
        END
        $backfill$;

        -- Ensure roles referenced by student_groups exist before retargeting the FK.
        INSERT INTO public.app_user_roles (user_id, role, created_at)
        SELECT DISTINCT g.referral_id, g.creator_role, now()
        FROM public.student_groups g
        WHERE g.creator_role IS NOT NULL
          AND g.referral_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.app_user_roles r
              WHERE r.user_id = g.referral_id AND r.role = g.creator_role
          );

        DO $fk$
        BEGIN
            ALTER TABLE public.student_groups
                DROP CONSTRAINT IF EXISTS student_groups_refral_id_and_role_fkey;

            ALTER TABLE public.student_groups
                ADD CONSTRAINT student_groups_refral_id_and_role_fkey
                FOREIGN KEY (referral_id, creator_role)
                REFERENCES public.app_user_roles(user_id, role);
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END
        $fk$;

        ALTER TABLE public.refresh_tokens
            ADD COLUMN IF NOT EXISTS active_role int2 NULL;

        -- Widen role CHECK for Coordinator (2016) and Tutor (2017).
        ALTER TABLE public.app_user_roles DROP CONSTRAINT IF EXISTS chk_app_user_roles_role;
        ALTER TABLE public.app_user_roles
            ADD CONSTRAINT chk_app_user_roles_role
            CHECK (role = ANY (ARRAY[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]::int2[]));

        -- Allow Coordinator/Tutor as student_groups.creator_role (was Parent/Teacher only).
        ALTER TABLE public.student_groups DROP CONSTRAINT IF EXISTS chk_creator_role_type;
        ALTER TABLE public.student_groups
            ADD CONSTRAINT chk_creator_role_type
            CHECK (creator_role IS NULL OR creator_role = ANY (ARRAY[2013, 2014, 2016, 2017]::int2[]));
        """;

    private const string DropAppUsersRoleAndAdminTargetSql = """
        -- Roles live in app_user_roles; approval routing lives in app_user_approval.
        -- Drop legacy columns from app_users after backfill / FK retarget.
        DO $drop$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'app_users'
                  AND column_name = 'role'
            ) THEN
                ALTER TABLE public.student_groups
                    DROP CONSTRAINT IF EXISTS student_groups_refral_id_and_role_fkey;

                -- Re-attach student_groups to app_user_roles if needed (idempotent with above).
                BEGIN
                    ALTER TABLE public.student_groups
                        ADD CONSTRAINT student_groups_refral_id_and_role_fkey
                        FOREIGN KEY (referral_id, creator_role)
                        REFERENCES public.app_user_roles(user_id, role);
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END;

                ALTER TABLE public.app_users
                    DROP CONSTRAINT IF EXISTS chk_app_users_role;
                ALTER TABLE public.app_users
                    DROP CONSTRAINT IF EXISTS app_users_role_fkey;
                ALTER TABLE public.app_users
                    DROP CONSTRAINT IF EXISTS app_users_id_role_key;

                ALTER TABLE public.app_users
                    DROP COLUMN role;
            END IF;

            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'app_users'
                  AND column_name = 'admin_target'
            ) THEN
                ALTER TABLE public.app_users
                    DROP COLUMN admin_target;
            END IF;
        END
        $drop$;
        """;

    /// <summary>
    /// Lookup rows for app_approval.entity_type and app_approval.action.
    /// IDs match Domain.Approvals enums (high range, same pattern as UserRole 2010+).
    /// Legacy small values 1/2 and 1–11 collided with QuizType and are migrated in ApprovalSupportSql.
    /// </summary>
    private const string ApprovalLookupSupportSql = """
        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT v.id, v.name, v.type, v.ord, TRUE, NULL
        FROM (
            VALUES
                (2101::smallint, 'User'::varchar,     'ApprovalEntityType'::varchar, 1::smallint),
                (2102,           'Question',           'ApprovalEntityType',          2),
                (2103,           'Quiz',               'ApprovalEntityType',          3),
                (2104,           'SchoolChangeRequest','ApprovalEntityType',          4),
                (2105,           'QuestionEditRequest','ApprovalEntityType',          5),
                (2106,           'QuizEditRequest',    'ApprovalEntityType',          6),
                (2201,           'Created',            'ApprovalAction',              1),
                (2202,           'SubmittedForReview', 'ApprovalAction',              2),
                (2203,           'Approved',           'ApprovalAction',              3),
                (2204,           'Endorsed',           'ApprovalAction',              4),
                (2205,           'Published',          'ApprovalAction',              5),
                (2206,           'Rejected',           'ApprovalAction',              6),
                (2207,           'Activated',          'ApprovalAction',              7),
                (2208,           'Deactivated',        'ApprovalAction',              8),
                (2209,           'Archived',           'ApprovalAction',              9),
                (2210,           'Unarchived',         'ApprovalAction',             10),
                (2211,           'Modified',           'ApprovalAction',             11)
        ) AS v(id, name, type, ord)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.lookups existing WHERE existing.id = v.id
        );

        UPDATE public.lookups AS existing
        SET name = seed.name,
            type = seed.type,
            order_by = seed.ord,
            is_active = TRUE
        FROM (
            VALUES
                (2101::smallint, 'User'::varchar,     'ApprovalEntityType'::varchar, 1::smallint),
                (2102,           'Question',           'ApprovalEntityType',          2),
                (2103,           'Quiz',               'ApprovalEntityType',          3),
                (2104,           'SchoolChangeRequest','ApprovalEntityType',          4),
                (2105,           'QuestionEditRequest','ApprovalEntityType',          5),
                (2106,           'QuizEditRequest',    'ApprovalEntityType',          6),
                (2201,           'Created',            'ApprovalAction',              1),
                (2202,           'SubmittedForReview', 'ApprovalAction',              2),
                (2203,           'Approved',           'ApprovalAction',              3),
                (2204,           'Endorsed',           'ApprovalAction',              4),
                (2205,           'Published',          'ApprovalAction',              5),
                (2206,           'Rejected',           'ApprovalAction',              6),
                (2207,           'Activated',          'ApprovalAction',              7),
                (2208,           'Deactivated',        'ApprovalAction',              8),
                (2209,           'Archived',           'ApprovalAction',              9),
                (2210,           'Unarchived',         'ApprovalAction',             10),
                (2211,           'Modified',           'ApprovalAction',             11)
        ) AS seed(id, name, type, ord)
        WHERE existing.id = seed.id;
        """;

    /// <summary>
    /// Generic approval table shared by registration (entity_type 2101 = User) and the question-bank
    /// workflow trail (entity_type 2102 = Question). Renames the legacy app_user_approval in place so existing
    /// registration rows are preserved, then widens it with a discriminator, a typed question FK,
    /// and the action / reason / created_at columns the trail needs.
    /// </summary>
    private const string ApprovalSupportSql = """
        ALTER TABLE IF EXISTS public.app_user_approval RENAME TO app_approval;

        CREATE TABLE IF NOT EXISTS public.app_approval (
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            entity_type int2 NOT NULL DEFAULT 2101,
            user_id bigint NULL,
            question_id bigint NULL,
            approved_by_user_id bigint NOT NULL,
            approved_by_role int2 NOT NULL,
            action int2 NULL,
            reason varchar(1000) NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            approved_at timestamptz NULL,
            is_approved boolean NULL,
            CONSTRAINT app_approval_user_id_fkey
                FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE,
            CONSTRAINT app_approval_question_id_fkey
                FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE,
            CONSTRAINT app_approval_approved_by_user_id_fkey
                FOREIGN KEY (approved_by_user_id) REFERENCES public.app_users(id) ON DELETE RESTRICT,
            CONSTRAINT chk_app_approval_role
                CHECK (approved_by_role = ANY (ARRAY[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]::int2[]))
        );

        -- Carry legacy constraint names over to the new table name.
        DO $rename$
        DECLARE
            old_name text;
        BEGIN
            FOR old_name IN
                SELECT c.conname
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                WHERE n.nspname = 'public'
                  AND t.relname = 'app_approval'
                  AND c.conname LIKE '%app\_user\_approval%'
            LOOP
                EXECUTE format(
                    'ALTER TABLE public.app_approval RENAME CONSTRAINT %I TO %I',
                    old_name,
                    replace(old_name, 'app_user_approval', 'app_approval'));
            END LOOP;
        END
        $rename$;

        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS entity_type int2 NOT NULL DEFAULT 2101;

        ALTER TABLE public.app_approval
            ALTER COLUMN entity_type SET DEFAULT 2101;

        -- Legacy typed column (skipped once unified onto request_id).
        DO $legacy_question_id$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'request_id'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'question_id'
            ) THEN
                NULL;
            ELSE
                ALTER TABLE public.app_approval
                    ADD COLUMN IF NOT EXISTS question_id bigint NULL;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'app_approval_question_id_fkey'
                ) THEN
                    ALTER TABLE public.app_approval
                        ADD CONSTRAINT app_approval_question_id_fkey
                        FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END
        $legacy_question_id$;

        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS action int2 NULL;

        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS reason varchar(1000) NULL;

        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS is_approved boolean NULL;

        -- user_id only applies to entity_type User (2101) now.
        ALTER TABLE public.app_approval
            ALTER COLUMN user_id DROP NOT NULL;

        -- Existing DBs may have NOT NULL approved_at; pending queue needs NULL.
        ALTER TABLE public.app_approval
            ALTER COLUMN approved_at DROP NOT NULL;

        ALTER TABLE public.app_approval
            ALTER COLUMN approved_at DROP DEFAULT;

        -- question_id FK is created in $legacy_question_id$ above when needed.

        -- Backfill: rows that already have approved_at were approvals (not rejections).
        UPDATE public.app_approval
        SET is_approved = TRUE
        WHERE approved_at IS NOT NULL
          AND is_approved IS NULL;

        -- Drop target check / filtered indexes before remapping legacy enum values 1/2 and 1–11.
        ALTER TABLE public.app_approval DROP CONSTRAINT IF EXISTS chk_app_approval_target;
        DROP INDEX IF EXISTS ix_app_approval_user_approver_role;
        DROP INDEX IF EXISTS ix_app_approval_pending;
        DROP INDEX IF EXISTS ix_app_approval_question_trail;

        -- Allow Coordinator (2016) and Tutor (2017) as approver role.
        ALTER TABLE public.app_approval DROP CONSTRAINT IF EXISTS chk_app_approval_role;
        ALTER TABLE public.app_approval
            ADD CONSTRAINT chk_app_approval_role
            CHECK (approved_by_role = ANY (ARRAY[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]::int2[]));

        DO $legacy_quiz_id_early$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'request_id'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'question_id'
            ) THEN
                NULL;
            ELSE
                ALTER TABLE public.app_approval
                    ADD COLUMN IF NOT EXISTS quiz_id bigint NULL;
            END IF;
        END
        $legacy_quiz_id_early$;

        -- Remap legacy entity_type: 1→User(2101), 2→Question(2102).
        UPDATE public.app_approval SET entity_type = 2101 WHERE entity_type = 1;
        UPDATE public.app_approval SET entity_type = 2102 WHERE entity_type = 2;

        -- Remap legacy action 1–11 → 2201–2211 (idempotent: only unmigrated rows).
        UPDATE public.app_approval
        SET action = action + 2200
        WHERE action IS NOT NULL
          AND action BETWEEN 1 AND 11;

        -- Legacy registration rows carried the decision in is_approved only.
        UPDATE public.app_approval
        SET action = CASE WHEN is_approved THEN 2203 ELSE 2206 END
        WHERE entity_type = 2101
          AND action IS NULL
          AND is_approved IS NOT NULL;

        -- ADD COLUMN defaulted created_at to now(); pull it back to the decision time.
        UPDATE public.app_approval
        SET created_at = approved_at
        WHERE approved_at IS NOT NULL
          AND created_at > approved_at;

        -- Do not recreate chk_app_approval_target here: mixed legacy/unified rows
        -- (e.g. entity_type 2104) violate the old 2101–2103 check. Unification owns it.
        ALTER TABLE public.app_approval DROP CONSTRAINT IF EXISTS chk_app_approval_target;

        DROP INDEX IF EXISTS ix_app_user_approval_user_id;
        DROP INDEX IF EXISTS ix_app_user_approval_approved_by;
        DROP INDEX IF EXISTS ix_app_user_approval_approved_at;
        DROP INDEX IF EXISTS ix_app_user_approval_is_approved;
        DROP INDEX IF EXISTS ix_app_user_approval_user_approver_role;
        DROP INDEX IF EXISTS ix_app_user_approval_pending;

        CREATE INDEX IF NOT EXISTS ix_app_approval_entity_type
            ON public.app_approval (entity_type);

        CREATE INDEX IF NOT EXISTS ix_app_approval_user_id
            ON public.app_approval (user_id);

        DO $legacy_question_indexes$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'question_id'
            ) THEN
                CREATE INDEX IF NOT EXISTS ix_app_approval_question_id
                    ON public.app_approval (question_id);

                CREATE INDEX IF NOT EXISTS ix_app_approval_question_trail
                    ON public.app_approval (question_id, created_at DESC)
                    WHERE entity_type = 2102;
            END IF;
        END
        $legacy_question_indexes$;

        CREATE INDEX IF NOT EXISTS ix_app_approval_approved_by
            ON public.app_approval (approved_by_user_id);

        CREATE INDEX IF NOT EXISTS ix_app_approval_approved_at
            ON public.app_approval (approved_at DESC);

        CREATE INDEX IF NOT EXISTS ix_app_approval_is_approved
            ON public.app_approval (is_approved);

        -- Registration keeps one row per approver; question trails allow repeat rows.
        CREATE UNIQUE INDEX IF NOT EXISTS ix_app_approval_user_approver_role
            ON public.app_approval (user_id, approved_by_user_id, approved_by_role)
            WHERE entity_type = 2101;

        CREATE INDEX IF NOT EXISTS ix_app_approval_pending
            ON public.app_approval (user_id)
            WHERE entity_type = 2101 AND approved_at IS NULL AND is_approved IS NULL;

        -- Optional integrity: entity_type / action resolve to lookup names.
        DO $approval_lookup_fks$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'app_approval_entity_type_fkey'
            ) THEN
                ALTER TABLE public.app_approval
                    ADD CONSTRAINT app_approval_entity_type_fkey
                    FOREIGN KEY (entity_type) REFERENCES public.lookups(id);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'app_approval_action_fkey'
            ) THEN
                ALTER TABLE public.app_approval
                    ADD CONSTRAINT app_approval_action_fkey
                    FOREIGN KEY (action) REFERENCES public.lookups(id);
            END IF;
        END
        $approval_lookup_fks$;
        """;

    /// <summary>
    /// Quiz workflow trail on app_approval (legacy quiz_id column until request_id unification).
    /// </summary>
    private const string QuizApprovalTrailSupportSql = """
        DO $legacy_quiz_col$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'request_id'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'question_id'
            ) THEN
                NULL;
            ELSE
                ALTER TABLE public.app_approval
                    ADD COLUMN IF NOT EXISTS quiz_id bigint NULL;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'app_approval_quiz_id_fkey'
                ) THEN
                    ALTER TABLE public.app_approval
                        ADD CONSTRAINT app_approval_quiz_id_fkey
                        FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
                END IF;

                CREATE INDEX IF NOT EXISTS ix_app_approval_quiz_id
                    ON public.app_approval (quiz_id);

                CREATE INDEX IF NOT EXISTS ix_app_approval_quiz_trail
                    ON public.app_approval (quiz_id, created_at DESC)
                    WHERE entity_type = 2103;
            END IF;
        END
        $legacy_quiz_col$;

        -- chk_app_approval_target is owned by ApprovalRequestIdUnificationSupportSql.
        ALTER TABLE public.app_approval DROP CONSTRAINT IF EXISTS chk_app_approval_target;
        """;

    /// <summary>
    /// Seeds a starting trail for questions that pre-date app_approval, so their history is not
    /// blank. Uses request_id (final shape) or legacy question_id.
    /// </summary>
    private const string QuestionApprovalTrailBackfillSql = """
        DO $question_trail_backfill$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'request_id'
            ) THEN
                INSERT INTO public.app_approval (
                    entity_type, request_id, approved_by_user_id, approved_by_role,
                    action, created_at, approved_at, is_approved)
                SELECT
                    2102,
                    q.id,
                    q.created_by,
                    q.created_by_role,
                    2201,
                    q.created_date::timestamptz,
                    q.created_date::timestamptz,
                    NULL
                FROM public.questions q
                WHERE EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = q.created_by)
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.app_approval a
                      WHERE a.entity_type = 2102 AND a.request_id = q.id AND a.action = 2201);

                INSERT INTO public.app_approval (
                    entity_type, request_id, approved_by_user_id, approved_by_role,
                    action, created_at, approved_at, is_approved)
                SELECT
                    2102,
                    q.id,
                    q.approved_by,
                    COALESCE(
                        (
                            SELECT CASE
                                WHEN BOOL_OR(r.role = 2010) THEN 2010
                                WHEN BOOL_OR(r.role = 2011) THEN 2011
                                WHEN BOOL_OR(r.role = 2012) THEN 2012
                                ELSE 2014
                            END
                            FROM public.app_user_roles r
                            WHERE r.user_id = q.approved_by
                        ),
                        2010
                    ),
                    CASE WHEN q.visibility_level = 3 THEN 2205 ELSE 2204 END,
                    q.modified_date::timestamptz,
                    q.modified_date::timestamptz,
                    TRUE
                FROM public.questions q
                WHERE q.approved_by IS NOT NULL
                  AND EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = q.approved_by)
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.app_approval a
                      WHERE a.entity_type = 2102 AND a.request_id = q.id AND a.action IN (2204, 2205));
            ELSIF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'app_approval'
                  AND column_name = 'question_id'
            ) THEN
                INSERT INTO public.app_approval (
                    entity_type, question_id, approved_by_user_id, approved_by_role,
                    action, created_at, approved_at, is_approved)
                SELECT
                    2102,
                    q.id,
                    q.created_by,
                    q.created_by_role,
                    2201,
                    q.created_date::timestamptz,
                    q.created_date::timestamptz,
                    NULL
                FROM public.questions q
                WHERE EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = q.created_by)
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.app_approval a
                      WHERE a.entity_type = 2102 AND a.question_id = q.id AND a.action = 2201);

                INSERT INTO public.app_approval (
                    entity_type, question_id, approved_by_user_id, approved_by_role,
                    action, created_at, approved_at, is_approved)
                SELECT
                    2102,
                    q.id,
                    q.approved_by,
                    COALESCE(
                        (
                            SELECT CASE
                                WHEN BOOL_OR(r.role = 2010) THEN 2010
                                WHEN BOOL_OR(r.role = 2011) THEN 2011
                                WHEN BOOL_OR(r.role = 2012) THEN 2012
                                ELSE 2014
                            END
                            FROM public.app_user_roles r
                            WHERE r.user_id = q.approved_by
                        ),
                        2010
                    ),
                    CASE WHEN q.visibility_level = 3 THEN 2205 ELSE 2204 END,
                    q.modified_date::timestamptz,
                    q.modified_date::timestamptz,
                    TRUE
                FROM public.questions q
                WHERE q.approved_by IS NOT NULL
                  AND EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = q.approved_by)
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.app_approval a
                      WHERE a.entity_type = 2102 AND a.question_id = q.id AND a.action IN (2204, 2205));
            END IF;
        END
        $question_trail_backfill$;
        """;

    private const string RegistrationSupportSql = """
        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(1000) NULL;

        ALTER TABLE public.app_users
            ALTER COLUMN password_hash DROP NOT NULL;

        ALTER TABLE public.app_users
            DROP CONSTRAINT IF EXISTS chk_app_users_password_when_active;

        -- Active users normally need a password. Exception: approved accounts
        -- awaiting first-login password setup (must_change_password = true).
        ALTER TABLE public.app_users
            ADD CONSTRAINT chk_app_users_password_when_active
            CHECK (
                is_active = false
                OR password_hash IS NOT NULL
                OR must_change_password IS TRUE
            );

        -- Rejected registrations keep the row for audit; allow same identity to re-request.
        ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS app_users_username_key;
        DROP INDEX IF EXISTS app_users_username_key;
        DROP INDEX IF EXISTS ix_app_users_username;
        DROP INDEX IF EXISTS "IX_app_users_username";
        CREATE UNIQUE INDEX IF NOT EXISTS ix_app_users_username_active
            ON public.app_users (username)
            WHERE rejected_at IS NULL;

        ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS app_users_cnic_key;
        DROP INDEX IF EXISTS ix_app_users_cnic;
        DROP INDEX IF EXISTS "IX_app_users_cnic";
        CREATE UNIQUE INDEX IF NOT EXISTS ix_app_users_cnic_active
            ON public.app_users (cnic)
            WHERE cnic IS NOT NULL AND rejected_at IS NULL;

        DROP INDEX IF EXISTS ix_app_users_pending_registration;
        CREATE INDEX IF NOT EXISTS ix_app_users_pending_registration
            ON public.app_users (requested_at DESC NULLS LAST)
            WHERE is_active = false
              AND password_hash IS NULL
              AND rejected_at IS NULL;

        CREATE INDEX IF NOT EXISTS ix_app_users_rejected_at
            ON public.app_users (rejected_at DESC)
            WHERE rejected_at IS NOT NULL;

        ALTER TABLE public.app_user_students
            ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(40) NULL;

        ALTER TABLE public.app_user_parents
            ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(40) NULL;

        ALTER TABLE public.app_user_teachers
            ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(40) NULL;
        """;

    private const string UserIdentitySupportSql = """
        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(40) NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS cnic VARCHAR(20) NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS school_id INTEGER NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS campus_id INTEGER NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS email VARCHAR(120) NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NULL;

        ALTER TABLE public.app_users
            ALTER COLUMN must_change_password DROP NOT NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS reason_message VARCHAR(1000) NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS roll_number_teacher_code VARCHAR(80) NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS registration_grade SMALLINT NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS registration_section VARCHAR(40) NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL;

        -- Migrate legacy identity columns into app_users before dropping them.
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'app_users'
                  AND column_name = 'student_or_employee_id'
            ) THEN
                UPDATE public.app_users
                SET roll_number_teacher_code = COALESCE(
                    NULLIF(BTRIM(roll_number_teacher_code), ''),
                    NULLIF(BTRIM(student_or_employee_id), ''))
                WHERE roll_number_teacher_code IS NULL
                   OR BTRIM(roll_number_teacher_code) = '';
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'app_user_students'
                  AND column_name = 'student_roll_number'
            ) THEN
                UPDATE public.app_users u
                SET roll_number_teacher_code = COALESCE(
                    NULLIF(BTRIM(u.roll_number_teacher_code), ''),
                    NULLIF(BTRIM(s.student_roll_number), '')),
                    school_id = COALESCE(u.school_id, s.school_id),
                    campus_id = COALESCE(u.campus_id, s.campus_id)
                FROM public.app_user_students s
                WHERE s.student_id = u.id;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'app_user_teachers'
                  AND column_name = 'teacher_code'
            ) THEN
                UPDATE public.app_users u
                SET roll_number_teacher_code = COALESCE(
                    NULLIF(BTRIM(u.roll_number_teacher_code), ''),
                    NULLIF(BTRIM(t.teacher_code), '')),
                    school_id = COALESCE(u.school_id, t.school_id),
                    campus_id = COALESCE(u.campus_id, t.campus_id)
                FROM public.app_user_teachers t
                WHERE t.teacher_id = u.id;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'app_user_parents'
                  AND column_name = 'cnic'
            ) THEN
                UPDATE public.app_users u
                SET cnic = COALESCE(NULLIF(BTRIM(u.cnic), ''), NULLIF(BTRIM(p.cnic), ''))
                FROM public.app_user_parents p
                WHERE p.parent_id = u.id
                  AND (u.cnic IS NULL OR BTRIM(u.cnic) = '');
            END IF;
        END $$;

        ALTER TABLE public.app_users
            DROP COLUMN IF EXISTS school_campus_name;

        ALTER TABLE public.app_users
            DROP COLUMN IF EXISTS student_or_employee_id;

        ALTER TABLE public.app_user_students
            DROP COLUMN IF EXISTS school_id;

        ALTER TABLE public.app_user_students
            DROP COLUMN IF EXISTS campus_id;

        ALTER TABLE public.app_user_students
            DROP COLUMN IF EXISTS cnic;

        ALTER TABLE public.app_user_students
            DROP COLUMN IF EXISTS student_roll_number;

        ALTER TABLE public.app_user_teachers
            DROP COLUMN IF EXISTS school_id;

        ALTER TABLE public.app_user_teachers
            DROP COLUMN IF EXISTS campus_id;

        ALTER TABLE public.app_user_teachers
            DROP COLUMN IF EXISTS cnic;

        ALTER TABLE public.app_user_teachers
            DROP COLUMN IF EXISTS teacher_code;

        ALTER TABLE public.app_user_parents
            DROP COLUMN IF EXISTS cnic;

        -- Soft-rejected registrations keep their row (rejected_at set) so the same
        -- CNIC can re-request. A global unique index would block that, so drop any
        -- unfiltered variant and rely on the filtered ix_app_users_cnic_active
        -- (cnic IS NOT NULL AND rejected_at IS NULL) from RegistrationSupportSql.
        DROP INDEX IF EXISTS ix_app_users_cnic_unique;
        CREATE UNIQUE INDEX IF NOT EXISTS ix_app_users_cnic_active
            ON public.app_users (cnic)
            WHERE cnic IS NOT NULL AND rejected_at IS NULL;
        """;

    private const string NotificationSupportSql = """
        CREATE TABLE IF NOT EXISTS public.app_notifications (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL,
            title VARCHAR(200) NOT NULL,
            body VARCHAR(2000) NOT NULL,
            category VARCHAR(80) NOT NULL,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS ix_app_notifications_user_created
            ON public.app_notifications (user_id, created_at DESC);
        """;
}
