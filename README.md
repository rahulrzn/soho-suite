# SOHO Suite

SOHO Suite is an early-stage small-business workspace for managing business profiles, team access, imported datasets, sales analytics, expenses, and inventory. Firebase Authentication handles sign-in; the Spring Boot API remains the source of truth for business data, permissions, and validation.

## Repository layout

```text
frontend/   React + TypeScript single-page app (Vite)
backend/    Spring Boot REST API (Java, Maven)
docs/       Product requirements and workspace/data-import notes
```

The frontend signs users in with Firebase Authentication and sends Firebase ID tokens as bearer tokens. The backend verifies tokens with Firebase Admin, enforces business membership and role checks, and stores profiles, businesses, memberships, dataset metadata, and dataset rows in PostgreSQL. Flyway applies schema migrations; Hibernate schema generation is disabled.

## Prerequisites

- Node.js and npm
- Java 25
- PostgreSQL
- A Firebase project with Authentication providers enabled (email/password and/or Google)
- Firebase Admin credentials for the backend (Application Default Credentials or a service-account file)

## Local setup

### 1. Configure PostgreSQL

Create a PostgreSQL database named `sohosuite` (or change the JDBC URL in `backend/src/main/resources/application.properties`). Set the database credentials in the environment used to launch the backend:

```text
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password
```

Flyway runs the versioned migrations in `backend/src/main/resources/db/migration` at startup. Do not manually enable Hibernate schema creation; `ddl-auto=none` is intentional. See [database migrations](backend/docs/database-migrations.md) for schema guidance.

### 2. Configure Firebase

For the frontend, create `frontend/.env.local` with the Firebase web app configuration:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_API_BASE_URL=<your-backend-base-url>
```

Use the values from your Firebase project settings. `VITE_FIREBASE_MEASUREMENT_ID` may be omitted if Analytics is not configured. These are frontend Firebase configuration values, not Admin credentials.

For the backend, set `FIREBASE_PROJECT_ID` to the same Firebase project ID and configure Google Application Default Credentials. For local development with a service-account key, set `GOOGLE_APPLICATION_CREDENTIALS` to its absolute file path. Keep the key outside the repository and never commit it. The backend rejects missing Firebase project configuration or unavailable Admin credentials at startup.

By default, the API permits browser origins `http://localhost:5173` and `http://localhost:4173`. Set `CORS_ALLOWED_ORIGINS` to a comma-separated list when using another frontend origin, for example `http://localhost:5173,http://127.0.0.1:5173`.

### 3. Start the backend

From the repository root:

```bash
cd backend
./mvnw spring-boot:run
```

On Windows PowerShell use `\.\mvnw.cmd spring-boot:run` from `backend`. The API listens on port `8080` by default.

### 4. Start the frontend

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The API integration dashboard is available at `/tools/integration`.

## Main capabilities

- Firebase email/password and Google sign-in, email verification, and password reset.
- User profile creation and updates.
- Business profile creation, editing, and membership/role management (`OWNER`, `MANAGER`, `VIEWER`).
- CSV and XLSX uploads with a review step, basic data-quality findings, editable column names, and paginated dataset rows.
- Role-scoped access: owners and managers can upload and confirm datasets; viewers can read them.
- Dataset sales analytics with a confirmed column mapping, date filters, backend health score, and CSV exports.
- Business activity, expense tracking and summaries, inventory items and movements, and CSV exports.
- Owner-managed invitations and ownership transfer requests using one-time links; no invitation email is sent automatically.
- An integration dashboard for exercising API requests and inspecting responses. Authorization headers and sensitive response fields are redacted in its inspector.

Dataset imports currently accept files up to 5 MiB, 20,000 data rows, and 100 columns. XLSX imports use the first worksheet. Original uploaded files are not retained. Details and current API routes are documented in [business workspace and dataset imports](docs/business-workspace-and-datasets.md).

## API overview

Protected API calls use `Authorization: Bearer <Firebase ID token>`. The backend is stateless and does not use browser cookies for API authentication. Most operations require a verified Firebase email; profile lookup and username availability support onboarding. Business data access is checked against the authenticated Firebase UID and persisted membership.

| Area | Routes |
| --- | --- |
| User profiles | `/api/users/profile`, `/api/users/me`, `/api/users/me/profile`, `/api/users/check-username` |
| Businesses and members | `/api/businesses` and `/api/businesses/{id}/...` |
| Datasets | `/api/businesses/{businessId}/datasets` and `/api/businesses/{businessId}/datasets/{datasetId}/...` |

See the controllers under `backend/src/main/java/com/sohosuite/backend` and the dataset guide for request details. Dataset uploads require an `Idempotency-Key` header.

## Development commands

Run from `frontend/`:

```bash
npm run dev       # Vite development server
npm run build     # TypeScript project build and production bundle
npm run lint      # ESLint
npm run preview   # Serve the production bundle locally
```

Run from `backend/`:

```bash
./mvnw spring-boot:run
./mvnw test
```

On Windows, use `\.\mvnw.cmd` in place of `./mvnw`.

## Further documentation

- [Product requirements](docs/requirements.md)
- [Business workspace and dataset imports](docs/business-workspace-and-datasets.md)
- [Firebase authentication](backend/docs/firebase-authentication.md)
- [Security notes](backend/docs/security.md)
- [Database migrations](backend/docs/database-migrations.md)

Keep credentials, local environment files, and Firebase service-account keys out of version control.
