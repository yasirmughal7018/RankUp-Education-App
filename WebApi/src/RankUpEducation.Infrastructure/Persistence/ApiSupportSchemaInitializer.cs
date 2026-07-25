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
        await _dbContext.Database.ExecuteSqlRawAsync(UserRoleSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(AppUserRolesSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(DropAppUsersRoleAndAdminTargetSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(ApprovalSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuestionApprovalTrailBackfillSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(UserAvatarAndSchoolChangeSupportSql, cancellationToken);
        _logger.LogInformation("Registration support schema is ready.");
    }

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

        CREATE TABLE IF NOT EXISTS public.app_user_school_change_approval (
            id BIGSERIAL PRIMARY KEY,
            request_id BIGINT NOT NULL
                REFERENCES public.app_user_school_change_request (id) ON DELETE CASCADE,
            approved_by_user_id BIGINT NOT NULL
                REFERENCES public.app_users (id) ON DELETE RESTRICT,
            approved_by_role SMALLINT NOT NULL,
            approved_at TIMESTAMPTZ NULL,
            is_approved BOOLEAN NULL
        );

        CREATE INDEX IF NOT EXISTS ix_app_user_school_change_approval_request_id
            ON public.app_user_school_change_approval (request_id);

        CREATE UNIQUE INDEX IF NOT EXISTS ux_app_user_school_change_approval_unique
            ON public.app_user_school_change_approval (
                request_id, approved_by_user_id, approved_by_role);
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
        -- Canonical QuestionType IDs 100–104.
        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT v.id, v.name, 'QuestionType', v.ord, TRUE, NULL
        FROM (
            VALUES
                (100::smallint, 'Single Choice'::varchar, 1::smallint),
                (101, 'Multiple Choice', 2),
                (102, 'True/False', 3),
                (103, 'Fill in the Blanks', 4),
                (104, 'Descriptive', 5)
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

    private const string UserRoleSupportSql = """
        -- Ensure UserRole lookup rows exist (IDs match Domain.UserRole).
        -- Layout: 2010 PortalAdmin, 2011 SchoolAdmin, 2012 CampusAdmin,
        --         2013 Parent, 2014 Teacher, 2015 Student.
        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT seed.id, seed.name, 'UserRole', seed.order_by, TRUE, NULL
        FROM (
            VALUES
                (2010, 'PortalAdmin'::varchar, 0::smallint),
                (2011, 'SchoolAdmin', 0),
                (2012, 'CampusAdmin', 0),
                (2013, 'Parent', 0),
                (2014, 'Teacher', 0),
                (2015, 'Student', 0)
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
                (2015, 'Student')
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
                    CHECK (role = ANY (ARRAY[2010, 2011, 2012, 2013, 2014, 2015]::int2[]));

                -- student_groups.creator_role: text -> lookup id (Parent=2013, Teacher=2014)
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
                    CHECK (creator_role IS NULL OR creator_role = ANY (ARRAY[2013, 2014]::int2[]));

                ALTER TABLE public.student_groups
                    ADD CONSTRAINT student_groups_refral_id_and_role_fkey
                    FOREIGN KEY (referral_id, creator_role)
                    REFERENCES public.app_users(id, role);
            END IF;
        END
        $migrate$;
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
                CHECK (role = ANY (ARRAY[2010, 2011, 2012, 2013, 2014, 2015]::int2[]))
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
    /// Generic approval table shared by registration (entity_type 1) and the question-bank
    /// workflow trail (entity_type 2). Renames the legacy app_user_approval in place so existing
    /// registration rows are preserved, then widens it with a discriminator, a typed question FK,
    /// and the action / reason / created_at columns the trail needs.
    /// </summary>
    private const string ApprovalSupportSql = """
        ALTER TABLE IF EXISTS public.app_user_approval RENAME TO app_approval;

        CREATE TABLE IF NOT EXISTS public.app_approval (
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            entity_type int2 NOT NULL DEFAULT 1,
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
                CHECK (approved_by_role = ANY (ARRAY[2010, 2011, 2012, 2013, 2014, 2015]::int2[]))
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
            ADD COLUMN IF NOT EXISTS entity_type int2 NOT NULL DEFAULT 1;

        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS question_id bigint NULL;

        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS action int2 NULL;

        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS reason varchar(1000) NULL;

        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

        ALTER TABLE public.app_approval
            ADD COLUMN IF NOT EXISTS is_approved boolean NULL;

        -- user_id only applies to entity_type 1 now.
        ALTER TABLE public.app_approval
            ALTER COLUMN user_id DROP NOT NULL;

        -- Existing DBs may have NOT NULL approved_at; pending queue needs NULL.
        ALTER TABLE public.app_approval
            ALTER COLUMN approved_at DROP NOT NULL;

        ALTER TABLE public.app_approval
            ALTER COLUMN approved_at DROP DEFAULT;

        DO $question_fk$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'app_approval_question_id_fkey'
            ) THEN
                ALTER TABLE public.app_approval
                    ADD CONSTRAINT app_approval_question_id_fkey
                    FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;
            END IF;
        END
        $question_fk$;

        -- Backfill: rows that already have approved_at were approvals (not rejections).
        UPDATE public.app_approval
        SET is_approved = TRUE
        WHERE approved_at IS NOT NULL
          AND is_approved IS NULL;

        -- Legacy registration rows carried the decision in is_approved only.
        UPDATE public.app_approval
        SET action = CASE WHEN is_approved THEN 3 ELSE 6 END
        WHERE entity_type = 1
          AND action IS NULL
          AND is_approved IS NOT NULL;

        -- ADD COLUMN defaulted created_at to now(); pull it back to the decision time.
        UPDATE public.app_approval
        SET created_at = approved_at
        WHERE approved_at IS NOT NULL
          AND created_at > approved_at;

        -- Exactly one typed target, matching the discriminator.
        DO $target_check$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'chk_app_approval_target'
            ) THEN
                ALTER TABLE public.app_approval
                    ADD CONSTRAINT chk_app_approval_target CHECK (
                        (entity_type = 1 AND user_id IS NOT NULL AND question_id IS NULL)
                        OR (entity_type = 2 AND question_id IS NOT NULL AND user_id IS NULL)
                    );
            END IF;
        END
        $target_check$;

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

        CREATE INDEX IF NOT EXISTS ix_app_approval_question_id
            ON public.app_approval (question_id);

        CREATE INDEX IF NOT EXISTS ix_app_approval_approved_by
            ON public.app_approval (approved_by_user_id);

        CREATE INDEX IF NOT EXISTS ix_app_approval_approved_at
            ON public.app_approval (approved_at DESC);

        CREATE INDEX IF NOT EXISTS ix_app_approval_is_approved
            ON public.app_approval (is_approved);

        -- Registration keeps one row per approver; question trails allow repeat rows.
        CREATE UNIQUE INDEX IF NOT EXISTS ix_app_approval_user_approver_role
            ON public.app_approval (user_id, approved_by_user_id, approved_by_role)
            WHERE entity_type = 1;

        CREATE INDEX IF NOT EXISTS ix_app_approval_pending
            ON public.app_approval (user_id)
            WHERE entity_type = 1 AND approved_at IS NULL AND is_approved IS NULL;

        CREATE INDEX IF NOT EXISTS ix_app_approval_question_trail
            ON public.app_approval (question_id, created_at DESC)
            WHERE entity_type = 2;
        """;

    /// <summary>
    /// Seeds a starting trail for questions that pre-date app_approval, so their history is not
    /// blank. Each insert is guarded by action so re-running the initializer is a no-op.
    /// Rejections are skipped: Question.Reject clears approved_by, so the rejector is unknown.
    /// </summary>
    private const string QuestionApprovalTrailBackfillSql = """
        -- Creation event, attributed to the recorded creator + creator role.
        INSERT INTO public.app_approval (
            entity_type, question_id, approved_by_user_id, approved_by_role,
            action, created_at, approved_at, is_approved)
        SELECT
            2,
            q.id,
            q.created_by,
            q.created_by_role,
            1, -- Created
            q.created_date::timestamptz,
            q.created_date::timestamptz,
            NULL
        FROM public.questions q
        WHERE EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = q.created_by)
          AND NOT EXISTS (
              SELECT 1
              FROM public.app_approval a
              WHERE a.entity_type = 2 AND a.question_id = q.id AND a.action = 1);

        -- Endorse / publish event for questions that carry an approver.
        INSERT INTO public.app_approval (
            entity_type, question_id, approved_by_user_id, approved_by_role,
            action, created_at, approved_at, is_approved)
        SELECT
            2,
            q.id,
            q.approved_by,
            COALESCE(
                (
                    SELECT CASE
                        WHEN BOOL_OR(r.role = 2010) THEN 2010 -- PortalAdmin
                        WHEN BOOL_OR(r.role = 2011) THEN 2011 -- SchoolAdmin
                        WHEN BOOL_OR(r.role = 2012) THEN 2012 -- CampusAdmin
                        ELSE 2014 -- Teacher
                    END
                    FROM public.app_user_roles r
                    WHERE r.user_id = q.approved_by
                ),
                2010
            ),
            CASE WHEN q.visibility_level = 3 THEN 5 ELSE 4 END, -- Published : Endorsed
            q.modified_date::timestamptz,
            q.modified_date::timestamptz,
            TRUE
        FROM public.questions q
        WHERE q.approved_by IS NOT NULL
          AND EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = q.approved_by)
          AND NOT EXISTS (
              SELECT 1
              FROM public.app_approval a
              WHERE a.entity_type = 2 AND a.question_id = q.id AND a.action IN (4, 5));
        """;

    private const string RegistrationSupportSql = """
        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ NULL;

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
