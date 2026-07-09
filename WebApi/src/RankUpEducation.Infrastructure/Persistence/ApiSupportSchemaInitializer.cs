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
        await _dbContext.Database.ExecuteSqlRawAsync(NotificationSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuestionSupportSql, cancellationToken);
        await _dbContext.Database.ExecuteSqlRawAsync(QuestionTypeLookupSql, cancellationToken);
        _logger.LogInformation("Registration support schema is ready.");
    }

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

    private const string RegistrationSupportSql = """
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
            ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS reason_message VARCHAR(1000) NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS admin_target VARCHAR(80) NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS school_campus_name VARCHAR(200) NULL;

        ALTER TABLE public.app_users
            ADD COLUMN IF NOT EXISTS student_or_employee_id VARCHAR(80) NULL;

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
