# Business workspace and dataset imports

## Architecture

The frontend is a React workspace backed by the existing Firebase token flow. Each API call obtains a fresh ID token; the browser does not persist it. The existing API workbench remains available at `/?tools=integration`.

The backend supports multiple business memberships per user, each with its own role. The workspace loads the businesses returned by `GET /api/businesses` and currently uses the first as the active business; a selector is future UI work. A browser business ID is never treated as authorization. Dataset services check the authenticated Firebase UID's persisted membership and role for the requested business on every operation. The existing email verification policy applies to dataset services.

Dataset metadata is stored in `public.dataset`; each imported row is stored separately in `public.dataset_row` as a JSON text array. This keeps data durable and supports bounded page reads while leaving future analytics free to map columns into typed analytical tables. The MVP does not retain the original uploaded file, so there is no file download operation or filesystem cleanup requirement. Rows are persisted as strings to preserve source values.

## Dataset lifecycle and limits

`PENDING_REVIEW` is created after server parsing and preview analysis. `POST .../{datasetId}/confirm` validates unique, non-empty column names and transitions it to `IMPORTED`. Repeated uploads with the same `Idempotency-Key` in a business return the existing session. The frontend requires an explicit confirmation.

CSV and XLSX are supported. Uploads are limited to 5 MiB, 20,000 data rows, and 100 columns. XLSX imports read the first worksheet; formula cells are read as displayed text without formula evaluation. The parser uses Java UTF-8 and ZIP/XML APIs with DTD/external entities disabled; it does not extract archive paths or evaluate formulas. XLSX archives are limited to 2,000 entries and 40 MiB expanded content. The preview is limited to 20 rows and row pages to 100 records. Missing values, duplicate rows, blank headers, duplicate headers, and basic text/number/date type guesses are reported. Header names can be changed during review; data values are not silently rewritten.

## API

All routes require a Firebase bearer token and verified email.

| Method and route | Purpose |
| --- | --- |
| `GET /api/businesses/{businessId}/datasets` | List business datasets |
| `POST /api/businesses/{businessId}/datasets` | Multipart upload (`file`, optional `name`, `description`) and preview; requires `Idempotency-Key` |
| `GET /api/businesses/{businessId}/datasets/{datasetId}` | Metadata, findings and first 20 stored rows |
| `POST /api/businesses/{businessId}/datasets/{datasetId}/confirm` | Confirm reviewed import: `{"columnNames":[...]}` |
| `GET /api/businesses/{businessId}/datasets/{datasetId}/rows?page=0&size=20` | Bounded rows page, size 1–100 |

Responses contain `id`, `name`, `description`, `originalFilename`, `fileType`, `status`, `rowCount`, `columnCount`, `createdAt`, and `importedAt`; detail responses add `columns`, `findings`, `rows`, `page`, and `pageSize`. Columns include original and reviewed names, detected `type`, missing value count, and blank/duplicate header flags. Findings include missing values, duplicate rows, blank headers, and duplicate headers.

`OWNER` and `MANAGER` can upload and confirm. `VIEWER` can list, read metadata and preview rows. Non-members receive the existing access-denied response. Cross-business dataset lookups are scoped in the repository and do not reveal whether a foreign dataset exists.

## Migration and local setup

Flyway migration `V5__add_dataset_imports.sql` creates dataset metadata and row tables with business and dataset foreign keys, state and format checks, idempotency uniqueness, and page lookup indexes. Existing migrations are unchanged; Hibernate DDL remains disabled.

Configure `DB_USERNAME`, `DB_PASSWORD`, Firebase Admin configuration, and `CORS_ALLOWED_ORIGINS` as required by the existing backend setup. Multipart and parser limits are in `application.properties`. The frontend uses `VITE_API_BASE_URL` (default `http://localhost:8080`). No credentials or uploaded files should be committed.

Run the backend with `backend/mvnw spring-boot:run` after configuring the existing services, and the frontend with `npm run dev` from `frontend`. The Maven test suite should be run with `backend/mvnw test`; frontend checks are `npm run lint` and `npm run build`.

## Limitations

This MVP does not store the original source file, support upload cancellation/progress, rename/delete datasets, or persist type overrides. Dataset list search, sorting, and paging are client-side over the metadata list; server-side dataset-list paging is future work. CSV/XLSX are parsed into bounded in-memory rows under strict file/row/column limits before persistence, so it is not intended for large warehouse-scale imports. The row JSON string representation is designed as a stable ingestion boundary; analytics work can add typed column metadata, streaming ingestion, object storage and a processing queue without exposing the complete dataset in an API response.
