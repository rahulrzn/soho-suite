# Backend API contract

This document describes endpoints present in the current backend source. All API routes except CORS
preflight `OPTIONS` require a valid Firebase ID token in `Authorization: Bearer <token>`. Requests that mutate business data also require
a verified Firebase email. Business-scoped routes check membership on every call. `OWNER` and
`MANAGER` can write business operations; `VIEWER` can read them. Ownership-only routes are called out
below. Errors use JSON objects with `code` and a safe `message`, or `code` and an `errors` object.

## User profiles

| Method | Route | Behavior |
| --- | --- | --- |
| POST | `/api/users/profile` | Create or return the authenticated user's profile. Body: `username`, `firstName`, `lastName`, optional `phone`. |
| GET | `/api/users/me` | Return the authenticated user's profile. |
| PATCH | `/api/users/me/profile` | Update allowed profile fields. |
| GET | `/api/users/check-username?username=...` | Return `{ "available": boolean }`. |

Profile validation uses a 3–30 character username with ASCII letters, digits, and underscore. Identity
fields are sourced from the verified Firebase token, not the request body.

Profile responses have `{id, firebaseUid, username, firstName, lastName, email, phone, business,
businessRole}`. Business responses expose the `BusinessResponse` fields: IDs/codes, company and legal
names, business type/industry/legal structure, business email/currency, financial-year month/status,
timestamps, legacy address fields, and locations, tax registrations, and departments arrays. Member
entries have `{userId, username, firstName, lastName, role}`.

## Businesses and membership

| Method | Route | Behavior / role |
| --- | --- | --- |
| POST | `/api/businesses` | Create a business; creator is OWNER. |
| GET | `/api/businesses` | List current user's businesses. |
| GET | `/api/businesses/{id}` | Read business; member. |
| PUT | `/api/businesses/{id}` | Update business; OWNER or MANAGER. |
| DELETE | `/api/businesses/{id}` | Delete business; OWNER. |
| GET | `/api/businesses/{id}/members` | List members; member. |
| POST | `/api/businesses/{id}/members` | Add an existing user; OWNER. |
| PATCH | `/api/businesses/{id}/members/{userId}/role` | Change a non-owner role; OWNER. |
| DELETE | `/api/businesses/{id}/members/{userId}` | Remove a non-owner member; OWNER. |

Business request fields and enum values are defined by `BusinessRequest`, `BusinessLocationRequest`,
`BusinessTaxRegistrationRequest`, and the `business.enums` package. A business stores its configured
three-letter currency; analytics and expenses do not silently convert amounts.

## Dataset import and lifecycle

Base route: `/api/businesses/{businessId}/datasets`.

| Method | Suffix | Behavior / limits |
| --- | --- | --- |
| POST | `` (multipart) | Upload CSV or XLSX with `file`, optional `name` and `description`, and required 1–80 character `Idempotency-Key`. |
| GET | `` | List metadata for the business. |
| GET | `/{datasetId}` | Get metadata, column findings, and first page preview. |
| POST | `/{datasetId}/confirm` | Confirm column names with `{ "columnNames": [...] }`. |
| GET | `/{datasetId}/rows?page=0&size=20` | Read rows; `page` 0–20,000 and `size` 1–100. |
| PATCH | `/{datasetId}` | Update `name` and `description`. |
| DELETE | `/{datasetId}` | Delete dataset, rows, and its analytics configuration. |

Metadata responses contain `{id, name, description, originalFilename, fileType, status, rowCount,
columnCount, createdAt, importedAt}`. Detail responses also contain `columns`, `findings`, `rows`,
`page`, `pageSize`, and `totalRows`. The metadata list is currently returned as an unpaginated array.
Upload limits are 5 MiB, 20,000 data rows, and 100 columns. A file needs a header and at least one
data row. Confirmed imports retain quality findings such as missing values, duplicate rows, blank
headers, and duplicate headers; confirmation does not clean or certify source data. Dataset rows are
stored as parsed values; original uploaded files are not stored. Dataset writes require OWNER or
MANAGER membership; reads require any business membership.

## Business analytics

Base route: `/api/businesses/{businessId}/analytics`.

| Method | Suffix | Behavior |
| --- | --- | --- |
| PUT | `/dataset-config` | Configure dataset ID, date, line amount, order ID, optional customer ID columns, and confirmed currency. OWNER or MANAGER. |
| GET | `/overview?from=YYYY-MM-DD&to=YYYY-MM-DD` | Return sales metrics and status/reason for each metric; any member. |
| GET | `/health-score?from=YYYY-MM-DD&to=YYYY-MM-DD` | Calculate the score automatically from imported sales, recorded expenses, and dataset age when at least three factors are available; otherwise return `INSUFFICIENT_DATA`, with component values and reasons. |
| GET | `/health-inputs?from=YYYY-MM-DD&to=YYYY-MM-DD` | Read saved manual cash balance, inventory value, and cost-of-goods-sold estimates for an exact date range; any member. These legacy estimates are not used by the automated health score. |
| PUT | `/health-inputs` | Upsert those manual estimates for an exact date range in the business currency; OWNER or MANAGER. These legacy estimates are not used by the automated health score. |

Analytics uses explicitly mapped imported dataset columns and a maximum 366-day inclusive date range.
Metrics can be `AVAILABLE`, `INCOMPLETE`, or `UNAVAILABLE`. Invalid source dates make period totals incomplete;
missing amounts or identifiers affect the relevant metrics. An unavailable value is not zero.
Analytics represents imported sales and does not include expense totals.

The analytics response contains dataset ID/name, requested `from`/`to`, currency, and `MetricResult`
objects for sales amount, distinct orders, average order value, distinct customers, daily trend, and
sales change. Each result contains `status`, `value` when available, and `reason` when incomplete or
unavailable. Configuration request JSON is `{datasetId, dateColumn, lineAmountColumn, orderIdColumn,
customerIdColumn, confirmedCurrency}`; response JSON returns those resolved columns and `updatedAt`.

The score has five equally weighted components. Operating-margin score is based on imported sales
minus recorded same-currency expenses, scaled to a 55% target. Revenue-growth score is
`clamp(50 + salesChangePercent, 0, 100)`. Freshness score is `clamp(100 - datasetAgeDays, 0, 100)`.
Cash runway and inventory turnover are marked unavailable because the application does not track
cash balances or inventory cost values. The aggregate is the rounded mean of available components
and is returned only when at least three components can be calculated.

Scores update from the selected date range and existing confirmed imports and expense records; no
manual health inputs are required. Expense records may be incomplete, and targets are general
directional heuristics rather than industry-specific advice. The response includes each component's
formula, input status, reason, and limitations. The score is not an audited assessment, credit score,
investment recommendation, or certification.

## Activity history

`GET /api/businesses/{businessId}/activity?page=0&size=20` returns business-scoped activity ordered by
timestamp and event ID descending. Page is 0–1,000,000 and page size is 1–100. Events contain actor ID when available, action,
target type and ID, timestamp, and a concise safe summary. Full dataset rows, uploaded contents, tokens,
passwords, and secrets are excluded. The 12-month retention period has no automatic deletion job;
see [business-activity-retention.md](business-activity-retention.md).
The response is `{items, total, page, size}`; items are `{id, actorUserId, action, targetType, targetId,
summary, occurredAt}`.

## Invitations and ownership transfer

| Method | Route | Behavior / role |
| --- | --- | --- |
| POST | `/api/businesses/{businessId}/invitations` | OWNER creates a MANAGER or VIEWER invitation for a specific email. Returns a one-time copyable acceptance token/link. |
| GET | `/api/businesses/{businessId}/invitations` | OWNER lists invitation metadata; token is omitted. |
| POST | `/api/businesses/{businessId}/invitations/{invitationId}/resend` | OWNER rotates token and refreshes expiry, including for an expired pending invitation. |
| DELETE | `/api/businesses/{businessId}/invitations/{invitationId}` | OWNER revokes an invitation. |
| POST | `/api/invitations/accept` | Authenticated verified-email invitee accepts `{ "token": "..." }`; token email must match. |
| POST | `/api/businesses/{businessId}/ownership-transfers` | OWNER requests transfer to an existing MANAGER using `{ "newOwnerUserId": number }`. |
| DELETE | `/api/businesses/{businessId}/ownership-transfers/{transferId}` | OWNER revokes a pending transfer. |
| POST | `/api/ownership-transfers/accept` | Intended recipient accepts `{ "token": "..." }`. |

Invitation and transfer tokens expire after seven days. Only token plaintext is returned at creation or
rotation; stored token hashes are not exposed. Successful transfer makes the recipient OWNER and the
previous owner MANAGER.
Invitation responses contain `{id, email, role, status, expiresAt, token, acceptancePath}`; list
responses return `token` and `acceptancePath` as null. Transfer responses contain business and user IDs, status, expiry,
and the one-time token and acceptance path.

## Expenses

Base route: `/api/businesses/{businessId}/expenses`.

| Method | Suffix | Behavior |
| --- | --- | --- |
| POST | `` | Create expense: `expenseDate`, decimal `amount`, `category`, `description`, optional `reference`. |
| GET | `` | List with optional `from`, `to`, `category`, `page`, `size`. |
| GET | `/summary` | Group totals by currency and category for optional date range. Empty results return an empty currency list. |
| PUT | `/{expenseId}` | Replace editable expense fields. |
| DELETE | `/{expenseId}` | Delete expense. |

Amounts are positive `BigDecimal` values with at most 15 integer digits and 4 decimal places. Supported
categories are `RENT`, `UTILITIES`, `PAYROLL`, `MARKETING`, `SUPPLIES`, `TRANSPORT`,
`PROFESSIONAL_SERVICES`, `MAINTENANCE`, and `OTHER`. Date filters are inclusive and limited to 367 days
when both ends are supplied. Listing supports page size 1–100. The expense currency is captured from
business configuration at creation; no conversion is performed. Expenses are separate from analytics sales.
Expense responses have `{id, expenseDate, amount, currency, category, description, reference, createdBy,
createdAt, updatedAt}`. Paginated lists have `{items, total, page, size}`. Summaries return `currencies`,
with each currency's total and category totals.

## Inventory

Base route: `/api/businesses/{businessId}/inventory/items`.

| Method | Suffix | Behavior |
| --- | --- | --- |
| POST | `` | Create item with `name`, optional `sku`, `description`, `openingQuantity`. |
| GET | `` | Paginated item list with optional `active`; page size 1–100. |
| GET | `/{itemId}` | Read item. |
| PATCH | `/{itemId}` | Update name, SKU, description, active status. |
| POST | `/{itemId}/movements` | Add movement with required 1–80 character `Idempotency-Key`, type, quantity and reason. |
| GET | `/{itemId}/movements?page=0&size=20` | Paginated movement history; page size 1–100. |

Movement types are `OPENING_STOCK`, `RECEIPT`, `ADJUSTMENT`, `DAMAGE`, and `COUNT_CORRECTION`.
Quantities support up to 15 integer digits and 4 decimal places. Receipts are positive; damage records a
positive quantity to write off; count correction specifies the counted balance; adjustments accept a
signed delta. Stock cannot fall below zero. Each balance mutation and ledger row are transactional.
No sales import automatically deducts inventory.
Item responses have `{id, name, sku, description, active, quantity, createdAt, updatedAt}`. Movement
responses have `{id, itemId, type, quantityDelta, resultingQuantity, reason, actorUserId, occurredAt}`.
Page responses have `{items, total, page, size}`. Create JSON is `{name, sku, description, openingQuantity}`;
update JSON is `{name, sku, description, active}`.

## CSV exports

All exports require business membership and are returned as UTF-8 CSV attachments. CSV fields are
quoted and formula-like text (including values whose first non-whitespace character is `=`, `+`, `-`,
or `@`) is prefixed with an apostrophe before CSV quoting. XLSX is not implemented.

| Method | Route | Maximum |
| --- | --- | --- |
| GET | `/api/businesses/{businessId}/exports/analytics?from=...&to=...` | Existing 366-day analytics limit; includes each metric's quality status/reason. |
| GET | `/api/businesses/{businessId}/exports/expenses?from=...&to=...` | 5,000 rows; optional inclusive date filters. |
| GET | `/api/businesses/{businessId}/exports/expenses/summary?from=...&to=...` | Category totals by currency; at most 1,000 groups. |
| GET | `/api/businesses/{businessId}/exports/inventory` | 5,000 items. |
| GET | `/api/businesses/{businessId}/exports/inventory/movements?itemId=...` | 10,000 movements; optional item filter. |
| GET | `/api/businesses/{businessId}/exports/datasets/{datasetId}/rows` | 20,000 rows; preserves stored column names and parsed values. |

Exceeding an export limit returns HTTP 413 `EXPORT_TOO_LARGE`. Dataset exports are business-scoped;
the original upload file is not available for export.

## Error responses

Common codes include `UNAUTHORIZED` (401), `FORBIDDEN` (403), `VALIDATION_ERROR` (400),
`UNSUPPORTED_MEDIA_TYPE` (415), `FILE_TOO_LARGE` (413), `NOT_FOUND` or domain-specific not-found codes
(404), `BUSINESS_CONFLICT`, `MEMBERSHIP_CONFLICT`, `IDEMPOTENCY_CONFLICT` (409), and
`INTERNAL_SERVER_ERROR` (sanitized 500). Validation responses can include field-level `errors`.
Malformed JSON returns 400. Unexpected exceptions do not expose exception messages or stack traces.

## Not implemented in the current API

The current source does not implement XLSX, PDF, recurring expenses, sales-driven stock deductions,
or AI-generated explanations.
