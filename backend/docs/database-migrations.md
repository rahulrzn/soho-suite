# Database schema migrations

Flyway owns schema changes. Hibernate is configured with `ddl-auto=none`, so it will not create,
update, or validate the database schema. Database connection credentials continue to come from
`DB_USERNAME` and `DB_PASSWORD`; keep them in the process environment, not in this repository.

## Migration sequence

The migration sequence is `V1__initial_schema.sql`, `V2__relax_legacy_user_columns.sql`,
`V3__expand_business_model.sql`, then `V4__enforce_case_insensitive_user_email_uniqueness.sql`.
On a genuinely empty database, application startup applies all four in order. Startup therefore
changes the database on a fresh installation. Do not run the backend against an existing non-empty
schema without confirming its Flyway history and schema state.

## Initial migration

`src/main/resources/db/migration/V1__initial_schema.sql` describes the intended starting `public`
schema for a fresh installation. It keeps the legacy `users` columns and their nullability. It creates
the two identity primary keys, unique constraints for `firebase_uid` and `username`, the confirmed
`business_role` check constraint, and the `users.business_id` foreign key.

V1 requires `users.email` to be non-null but does not make it unique. It also retains the legacy
`phone_number`, `password`, and `phone` columns as non-null. Constraint names in V1 are descriptive
names for a fresh database; baselining does not rename constraints in an existing database.

## Schema after each migration

The current `User` entity maps `phone` and does not map the legacy `phone_number`, `password`,
`company`, `country`, or `department` columns. The migration sequence retains those legacy columns.

Migrations below describe expected schema transitions, not the state of any particular live database.

- **V1** requires email but does not enforce uniqueness.
- **V2** makes legacy `phone_number`, `password`, and `phone` nullable.
- **V3** expands the business model and keeps `company` and `pincode` for compatibility.
- **V4** checks case-insensitive duplicate emails and adds a unique index on `lower(users.email)`.
  If duplicates exist, it aborts without changing user data; resolve them explicitly before retrying.

The application lowercases new emails. The index protects concurrent inserts and other writers.
Hibernate schema validation is disabled (`ddl-auto=none`); Flyway owns schema changes. Before V4 on
an existing database, inspect its migration history and check duplicate `lower(email)` values with a
read-only query.

## Fresh database

On a genuinely empty database with `public` available, Flyway applies V1 through V4 when the
application starts. Review the migrations before startup: startup performs schema changes, and V4
stops if duplicate emails require an explicit resolution.

## Existing local database: manual baseline procedure

Baseline only a database that is not already managed by Flyway and whose schema is verified to match
the selected baseline version. Baselining creates `public.flyway_schema_history` and records a
version; it does not execute or validate that version's migration SQL. A V1 baseline means Flyway
will apply V2 through V4. For a database already managed through V3, do not baseline it: verify its
history and let Flyway apply V4. A database at V4 needs no migration. Never baseline a database
already managed by Flyway.

Before baselining, take and verify a database backup. Confirm the target is `sohosuite`, the schema is
`public`, the only application tables are the expected V1 tables, the tables are empty, and every
column, type, nullability, default, identity, constraint, and index matches V1. Also confirm the
Firebase compatibility SQL described in `firebase-authentication.md` has not been applied. `baseline`
records a version; it does not compare the existing schema with the migration file. If the schema
does not match V1 exactly, stop and reconcile the migration plan. Emptiness alone is not enough.

The following PowerShell example writes the backup outside the repository, prompts for the database
password, refuses to overwrite a same-name file, and checks that `pg_restore` can read the archive.
PostgreSQL client tools (`pg_dump` and `pg_restore`) must be installed and available on `PATH`.

```powershell
$backupDir = Join-Path $env:LOCALAPPDATA 'SohoSuite\backups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$backupPath = Join-Path $backupDir "sohosuite-before-flyway-$(Get-Date -Format 'yyyyMMdd-HHmmss').dump"
if (Test-Path -LiteralPath $backupPath) { throw "Backup already exists: $backupPath" }

pg_dump --host localhost --port 5432 --username $env:DB_USERNAME `
  --dbname sohosuite --format custom --file $backupPath
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed; inspect any incomplete archive before retrying.' }

pg_restore --list $backupPath | Select-Object -First 10
if ($LASTEXITCODE -ne 0) { throw 'Backup archive verification failed.' }
```

Do not proceed if the dump or archive verification fails. Inspect and remove any incomplete archive
manually before retrying.

Use a Flyway CLI installation configured for PostgreSQL. In PowerShell, set the connection details in
the current shell and enter the password through a secure prompt. The standalone CLI must be
installed separately from the backend dependency, include PostgreSQL support, and be available on
`PATH`; check with `Get-Command flyway`. This CLI is not needed for normal backend startup.

```powershell
$env:FLYWAY_URL = 'jdbc:postgresql://localhost:5432/sohosuite'
$env:FLYWAY_USER = $env:DB_USERNAME
$securePassword = Read-Host 'Enter your PostgreSQL password' -AsSecureString
$env:FLYWAY_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
Remove-Variable securePassword
$env:FLYWAY_SCHEMAS = 'public'
$env:FLYWAY_DEFAULT_SCHEMA = 'public'
flyway -baselineVersion=1 baseline
```

Review the command target and output before running it. This is a database-changing operation: it
adds Flyway history metadata but does not execute V1. Only run it after the exact V1 audit and backup.
Afterward, verify `public.flyway_schema_history` contains a successful baseline row at version 1.
Then backend startup applies V2, V3, and V4, which change the database. Clear both password variables
when finished:

```powershell
Remove-Item Env:FLYWAY_PASSWORD
Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
```

Automatic baselining is disabled (`spring.flyway.baseline-on-migrate=false`). Keep it disabled; do not
use it to bypass the schema audit.

## Local backend startup in a new PowerShell terminal

These variables are process-scoped, so set them again in every new terminal. Use Java 25 (the Maven
project targets Java 25). No Flyway CLI variables
or standalone Flyway installation are needed for normal backend startup; Spring Boot runs Flyway from
the project dependencies. Start PostgreSQL first. The database URL is configured as
`jdbc:postgresql://localhost:5432/sohosuite` in `application.properties`.

Set the database and Firebase values, then start from the backend directory:

```powershell
$env:DB_USERNAME = 'postgres'
$securePassword = Read-Host 'Enter your PostgreSQL password' -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
Remove-Variable securePassword

$env:FIREBASE_PROJECT_ID = 'your-firebase-project-id'
$env:GOOGLE_APPLICATION_CREDENTIALS = 'D:\firebase-keys\soho-suite.json'

Set-Location D:\Dev\programming\soho-suite\backend
.\mvnw.cmd spring-boot:run
```

Use a service-account JSON file outside the repository, or configure Google Application Default
Credentials in its place. Keep the terminal open while the backend runs. When finished, stop the
backend with Ctrl+C and clear the database password:

```powershell
Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
```

The Flyway CLI is only needed for the separate manual baseline procedure above. In a new terminal
for that procedure, set `FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD`, `FLYWAY_SCHEMAS`, and
`FLYWAY_DEFAULT_SCHEMA` as shown there. Do not run baseline on every startup.

The older development database inspection in `firebase-authentication.md` found that `users` lacked
`firebase_uid` and `username`. If the current database still has that schema, it does not match V1
and must not be baselined at version 1. The Firebase guide's manual compatibility SQL also conflicts
with V2; resolve that migration-path conflict before making any schema changes.

## Business model expansion

`V3__expand_business_model.sql` is the next migration after V1 and V2. It adds business identity,
classification, currency, financial-year, status, and timestamp columns; preserves all existing
business and user IDs and legacy columns; and creates the location, tax-registration, and department
tables. It backfills a trading name from the old `company` column and assigns existing businesses
codes from a PostgreSQL sequence. It copies legacy address values into a registered-office row only
when at least one legacy address field is populated. It does not infer departments or tax registrations.
The repository contains the V3 migration script. A live database's migration state must be checked
in `public.flyway_schema_history`; repository files alone cannot establish whether it has been
applied. The development database was reported as already at V3, so verify that history before
letting Flyway apply V4.

Newly created businesses default to INR, financial-year start month 4, and ACTIVE. Existing businesses
receive the same values for currency, financial-year month, and status through migration defaults.
Business type values are RETAIL, MANUFACTURING, and SERVICES; legal structures are
SOLE_PROPRIETORSHIP, PARTNERSHIP, and PRIVATE_LIMITED. Optional legal names, legal structures, and tax
registrations remain optional.

The `company` request/response field remains the legacy representation of `tradingName`; `pincode` is
the legacy request/response alias for the business postal code, while child locations use
`postalCode`. These names are retained for compatibility; database columns and public field names are
not being renamed. If a request
provides both `company` and `tradingName`, they must match after trimming or validation rejects the
request. Providing either one updates both representations. `legalBusinessName` is handled separately
and is never inferred from either trading-name field. The legacy `department` string remains available;
it is not converted into a Department record because a string does not establish a safe code/name
mapping.

Expanded create/update requests may include `locations`, `taxRegistrations`, and `departments` arrays.
Each child item without an `id` creates a row; an item with an `id` updates a row belonging to the same
business. Sending an array applies those upserts; omitted arrays are left unchanged. The legacy address
fields remain available and update the existing registered location when one exists, avoiding duplicate
rows. Incomplete addresses are retained as supplied without fabricated fields. Child records omitted
from an update are not deleted or deactivated automatically.
