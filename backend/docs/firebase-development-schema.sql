-- MANUAL ONLY: reviewed for the inspected empty development users table.
-- Back up the database first. Do not use this script to migrate populated users.
-- Run with psql -v ON_ERROR_STOP=1 -f firebase-development-schema.sql
BEGIN;

LOCK TABLE public.users IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.users) THEN
        RAISE EXCEPTION 'Users table is no longer empty. Plan an explicit identity migration instead.';
    END IF;
END $$;

ALTER TABLE public.users
    DROP COLUMN IF EXISTS password,
    DROP COLUMN IF EXISTS phone_number,
    DROP COLUMN IF EXISTS company,
    DROP COLUMN IF EXISTS country,
    DROP COLUMN IF EXISTS department,
    ADD COLUMN IF NOT EXISTS firebase_uid varchar(255),
    ADD COLUMN IF NOT EXISTS username varchar(30);

ALTER TABLE public.users
    ALTER COLUMN firebase_uid SET NOT NULL,
    ALTER COLUMN username SET NOT NULL,
    ALTER COLUMN email SET NOT NULL,
    ALTER COLUMN phone DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_unique ON public.users (firebase_uid);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON public.users (username);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON public.users (email);

COMMIT;
