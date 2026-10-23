-- Emails are normalized to lowercase by the application. Enforce the same policy
-- for all writers and protect concurrent profile creation at the database level.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.users
        WHERE email IS NOT NULL
        GROUP BY lower(email)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce case-insensitive email uniqueness: duplicate users.email values exist. Resolve duplicates explicitly, then retry V4.';
    END IF;
END;
$$;

CREATE UNIQUE INDEX users_email_lower_unique
    ON public.users (lower(email));
