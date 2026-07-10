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
        await _dbContext.Database.ExecuteSqlRawAsync(QuestionTypeLookupSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(UserRoleSupportSql, cancellationToken);
        _logger.LogInformation("Registration support schema is ready.");
    }

    private const string SchoolSoftDeleteSupportSql = """
        ALTER TABLE public.schools
            ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

        ALTER TABLE public.school_campuses
            ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
        """;

    private const string QuestionSupportSql = """
        ALTER TABLE public.questions
            ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(1000) NULL;

        ALTER TABLE public.questions
            ADD COLUMN IF NOT EXISTS is_ai_approved BOOLEAN NOT NULL DEFAULT FALSE;
        """;

    private const string QuestionTypeLookupSql = """
        WITH seed(name, order_by) AS (
            VALUES
                ('Single Choice'::varchar, 1::smallint),
                ('Multiple Choice', 2),
                ('True/False', 3),
                ('Fill in the Blanks', 4),
                ('Descriptive', 5)
        ),
        missing AS (
            SELECT seed.name, seed.order_by,
                   ROW_NUMBER() OVER (ORDER BY seed.order_by) AS rn
            FROM seed
            WHERE NOT EXISTS (
                SELECT 1
                FROM public.lookups existing
                WHERE existing.type = 'QuestionType'
                  AND lower(existing.name) = lower(seed.name)
            )
        ),
        base AS (
            SELECT COALESCE(MAX(id), 0) AS max_id FROM public.lookups
        )
        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT base.max_id + missing.rn, missing.name, 'QuestionType', missing.order_by, TRUE, NULL
        FROM missing
        CROSS JOIN base;
        """;

    private const string UserRoleSupportSql = """
        -- Align stored roles with UserRole lookup names (PortalAdmin replaces SuperAdmin).
        UPDATE public.app_users
        SET role = 'portaladmin'
        WHERE lower(role) = 'superadmin';

        ALTER TABLE public.app_users
            DROP CONSTRAINT IF EXISTS chk_app_users_role;

        ALTER TABLE public.app_users
            ADD CONSTRAINT chk_app_users_role
            CHECK (role = ANY (ARRAY[
                'portaladmin'::text,
                'schooladmin'::text,
                'teacher'::text,
                'student'::text,
                'parent'::text
            ]));

        -- Ensure UserRole lookup rows exist (IDs match Domain.UserRole).
        INSERT INTO public.lookups (id, name, type, order_by, is_active, lookup_ref_id)
        SELECT seed.id, seed.name, 'UserRole', seed.order_by, TRUE, NULL
        FROM (
            VALUES
                (2010, 'PortalAdmin'::varchar, 0::smallint),
                (2011, 'SchoolAdmin', 0),
                (2012, 'Student', 0),
                (2013, 'Teacher', 0),
                (2014, 'Parent', 0)
        ) AS seed(id, name, order_by)
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.lookups existing
            WHERE existing.id = seed.id
               OR (existing.type = 'UserRole' AND lower(existing.name) = lower(seed.name))
        );
        """;

    private const string RegistrationSupportSql = """
        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NULL;

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

        CREATE INDEX IF NOT EXISTS ix_app_users_pending_registration
            ON public.app_users (requested_at DESC NULLS LAST)
            WHERE is_active = false AND password_hash IS NULL;

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
            ADD COLUMN IF NOT EXISTS admin_target VARCHAR(80) NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS roll_number_teacher_code VARCHAR(80) NULL;

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

        CREATE UNIQUE INDEX IF NOT EXISTS ix_app_users_cnic_unique
            ON public.app_users (cnic)
            WHERE cnic IS NOT NULL;
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
