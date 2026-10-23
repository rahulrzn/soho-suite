# Firebase authentication and local profiles

Firebase owns signup, login, credentials, email verification, password resets and provider linking.
Spring verifies ID tokens and stores application profiles in PostgreSQL. Business linking and roles
are documented in [business-membership.md](business-membership.md).

## Configuration

Enable Email/Password and Google providers in the Firebase project's Authentication console.
Configure the frontend with that same project. Firebase Admin Java 9.11.0 is the only new direct dependency.
For the complete per-terminal PowerShell startup command and database migration requirements, see
[database-migrations.md](database-migrations.md). Java 25 and a running local PostgreSQL service are
required for the documented local setup.

The backend database username and password are read from `DB_USERNAME` and `DB_PASSWORD` in
`application.properties`. For local PowerShell startup, set them in the shell before launching
Spring Boot. The password is prompted securely and is not included in this documentation:

```powershell
$env:DB_USERNAME = 'postgres'
$securePassword = Read-Host 'Enter your PostgreSQL password' -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
Remove-Variable securePassword
```

These environment variables are inherited by processes started from this PowerShell session.
Keep the shell open while running the backend. Clear the password from the session when finished with
`Remove-Item Env:DB_PASSWORD`.

For local PowerShell startup, keep the service-account file OUTSIDE this repository:

```powershell
$env:FIREBASE_PROJECT_ID = 'your-firebase-project-id'
$env:GOOGLE_APPLICATION_CREDENTIALS = 'D:\firebase-keys\soho-suite.json'
cd D:\Dev\programming\soho-suite\backend
.\mvnw.cmd spring-boot:run
```

The file must be a valid service-account credential for the configured project, with permission to read
Firebase Authentication users (revocation/disabled-user checks require this). On Google-hosted infrastructure,
Application Default Credentials may come from the attached service account instead of a JSON file.
Never commit credentials, send them to the frontend, or log ID tokens. Do not configure
FIREBASE_AUTH_EMULATOR_HOST against production; the Firebase emulator accepts unsigned emulator tokens.

FirebaseConfig fails startup when the project ID or available credentials are missing.
It manages one named FirebaseApp and deletes it when the Spring context closes.
No real Firebase credentials or token were supplied for this implementation's tests.

## HTTP contract

Every route below requires `Authorization: Bearer <Firebase ID token>`.
The stateless Spring Security filter verifies the token through Firebase Admin before the controller runs.
It installs the verified identity as the authenticated principal. `verifyIdToken(token, true)` also checks
revocation and disabled users.
No JWT decoding or cryptography is implemented locally.

| Method | Route | Result |
| --- | --- | --- |
| POST | /api/users/profile | 200: new profile or existing profile for this UID |
| GET | /api/users/me | 200 profile; 404 USER_NOT_FOUND means complete the local profile |
| PATCH | /api/users/me/profile | 200 updated profile |
| GET | /api/users/check-username?username=asha_01 | 200 {"available":true/false} |

The unrestricted user list and arbitrary-ID read/update endpoints were removed.
Every route requires a Firebase ID token, except HTTP OPTIONS CORS preflight requests. There are no
public API routes. Business endpoints additionally enforce PostgreSQL membership and roles; see
[business-membership.md](business-membership.md). See [security.md](security.md) for the email-verification
and CORS policies.

POST accepts only these profile fields:

```json
{"username":"asha_01","firstName":"Asha","lastName":"Shah","phone":"1234567890"}
```

Phone may be omitted. Username is 3–30 ASCII letters, digits or underscores, and is stored lowercase.
Email is copied from the verified token and stored lowercase. The token's UID is the identity key.
UID and username have unique constraints in V1. V4 adds a case-insensitive unique index on email,
matching lowercase normalization in the service. The legacy manual development SQL is separate and
incompatible with the Flyway migration path; do not run it on a Flyway-managed database. New profiles
have no business association.
Client-supplied identity fields are never used; the creation DTO does not contain them.

PATCH accepts only firstName, lastName and phone. Missing/null fields remain unchanged.
Supplied blank fields fail validation. Username, email, UID, ID and business cannot be changed here.

Duplicate username: 409 USERNAME_ALREADY_EXISTS / Username already taken.
Duplicate email under another UID: 409 EMAIL_ALREADY_EXISTS / Email already registered.
Missing/invalid/expired/revoked token: 401 UNAUTHORIZED.
Invalid profile or query input: 400 VALIDATION_ERROR.
Unexpected errors retain the safe 500 response. Firebase exception details are not returned or logged.

## Provider linking and duplicate requests

After either email/password login or Google login, call GET /api/users/me with the Firebase ID token.
If the profile is absent, show Complete Profile. Use Firebase's display name as an optional frontend prefill,
show the Firebase email read-only, and ask for a username and names (phone optional).
Send profile data to POST /api/users/profile, never a password.

Link the additional provider to the CURRENT Firebase user using Firebase's client account-linking APIs.
Both providers then use the same Firebase UID, so GET and POST resolve the same PostgreSQL row.
Two independently created Firebase UIDs are not automatically merged based on email.
The backend returns the existing profile for repeated creation calls. Database uniqueness remains the final
guard against concurrent inserts; after a failed insert, the service reloads the winning UID or reports
the username/email conflict. The creation service intentionally does not wrap that retry in one transaction.

## Inspected development database

Read-only inspection on 2026-10-06 found zero rows in public.users. It still had:
id, company, country, department, phone_number, email, first_name, last_name, password, phone, business_id.
password and phone_number were NOT NULL; firebase_uid and username were absent.
No password_reset_tokens table was present. No data or schema changes were executed.

This is a historical read-only schema observation, not a statement about the current database. The
manual `firebase-development-schema.sql` changes the schema: it removes legacy columns, adds Firebase
identity fields and indexes, and relaxes phone nullability. It is **not compatible with the current
Flyway V1/V2 sequence**: it removes `phone_number` and `password`, which V2 expects, and adds an email
unique index absent from V1. Do not run that script on a database managed by these Flyway migrations,
or baseline a database after running it, until a single migration path has been designed and reviewed.
If it has already been run, audit the live schema and reconcile migration history before starting the
backend. Never switch to `ddl-auto=create` or recreate a database to bypass this mismatch. For
populated environments, plan UID/username backfill and duplicate resolution explicitly.

## Postman test plan

Set variables `baseUrl=http://localhost:8080` and `firebaseIdToken` to a fresh ID token returned by the
Firebase CLIENT SDK after sign-in (not a Google OAuth token or Firebase custom token).
Set collection Authorization to Bearer Token `{{firebaseIdToken}}`.
Use Content-Type application/json for POST/PATCH. Do not export/share a collection containing live tokens.

1. Before profile creation, GET {{baseUrl}}/api/users/me -> 404 USER_NOT_FOUND.
2. GET {{baseUrl}}/api/users/check-username?username=asha_01 -> available true if unused.
3. POST {{baseUrl}}/api/users/profile with the sample JSON above -> 200 with id, lowercase username,
   trusted firebaseUid/email and business null. Save its id. Repeat with phone omitted for another new user.
4. Repeat the POST with the same token -> 200 with the SAME id; no new profile or changed fields.
5. GET {{baseUrl}}/api/users/me -> the same profile.
6. PATCH {{baseUrl}}/api/users/me/profile with {"firstName":"Anita"} -> 200; all other fields unchanged.
7. PATCH with {"phone":" "} -> 400 VALIDATION_ERROR. PATCH with {} -> unchanged profile.
8. POST with {"username":"bad name","firstName":"","lastName":""} -> 400 VALIDATION_ERROR.
9. GET check-username with `ASHA_01` -> available false. Invalid/missing username -> 400.
10. Sign in as a DIFFERENT Firebase user with a different email and POST using asha_01 -> 409 USERNAME_ALREADY_EXISTS.
11. Missing Authorization, Basic auth, malformed token, expired token, revoked token or a token for another Firebase
    project -> 401 UNAUTHORIZED. No Firebase internals should appear in the response.
12. Try including firebaseUid/email/id/business in profile JSON: these must never set identity or business.
    Unknown JSON fields may be ignored by Jackson; identity still comes only from the verified token.
13. Link Google to the existing Firebase account using the client SDK, sign in with the linked provider, obtain a
    fresh Firebase ID token, and GET /me -> the SAME local id and UID. Repeat POST -> still the same local id.
14. Old GET /api/users, GET /api/users/{id}, and PATCH /api/users/{id}/profile are no longer mapped.

Two distinct UIDs with the same local email produce EMAIL_ALREADY_EXISTS, not an automatic merge.
Firebase may prevent constructing this scenario through normal signup; the service tests cover it directly.

## Verification

Run from backend:

```powershell
.\mvnw.cmd clean compile
.\mvnw.cmd "-Dtest=UserProfileTests,BusinessErrorHandlingTests" test
```

Tests mock FirebaseAuth and the repository, exercising the verifier, bearer filter, controller, service, and advice.
They verify delegation to Firebase Admin with revocation checks, identity boundaries, validation, conflicts,
concurrent-insert recovery, and Business error regression behavior. They do not contact live Firebase or mutate PostgreSQL.

References:
- https://firebase.google.com/docs/admin/setup
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://firebase.google.com/docs/auth/web/account-linking

## Verification result (2026-10-06)

Clean compilation succeeded. All 18 focused tests passed (14 User/Firebase tests and 4 Business tests), with zero failures or errors.
The command used this machine's existing Maven cache explicitly:

```powershell
.\mvnw.cmd "-Dmaven.repo.local=C:\Users\asus\.m2\repository" -o clean compile "-Dtest=UserProfileTests,BusinessErrorHandlingTests" test
```

Live Firebase sign-in and PostgreSQL persistence were not exercised. Database access was read-only schema inspection.
