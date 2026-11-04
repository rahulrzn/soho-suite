# Soho Suite Full UI Rebuild Implementation Plan

> **For agentic workers:** Execute task-by-task with test-first changes. Do not commit or perform remote Git operations.

**Goal:** Rebuild every customer-facing Soho Suite screen as one polished responsive workspace while preserving existing Firebase auth, API contracts, and useful behavior.

**Architecture:** Keep React/TypeScript/Vite/Firebase and the verified typed API clients. Treat route-oriented feature pages as behavior to preserve while reworking the shared shell, visual tokens, hierarchy, and screen-level interactions. Keep the API workbench isolated at its existing route.

**Tech Stack:** Existing React 19, TypeScript, Vite, Firebase SDK, CSS, Vitest. No additional runtime dependency planned.

**Spec:** `docs/superpowers/specs/2026-11-04-soho-suite-frontend-design.md`

## Global constraints

- Spring Boot is the source of truth; use only verified backend routes and DTOs.
- Keep Firebase authentication and the existing Firebase project; never expose backend credentials or environment-file contents.
- Require `VITE_API_BASE_URL`; never invent a production URL or silently use localhost.
- Do not modify backend, migrations, database, Maven wrapper, production resources, or Git history.
- Do not display invented data, metrics, permissions, routes, score factors, thresholds, filters, or functionality.
- Preserve existing auth, profile/business, membership, dataset import, and idempotency behavior.

## Review focus

- Token refresh, sign-out/session restoration, email verification and 401/403 behavior.
- Multipart upload idempotency, 5 MiB/20,000 row/100 column limits, preview confirmation, and cross-business state reset.
- Per-route role behavior remains server-authoritative and rejected mutations do not appear successful.
- Date range, pagination, decimal precision, currency, inventory quantity and idempotency constraints match controller/service contracts.
- CSV is downloaded as CSV, server errors/413 remain visible, and sensitive tokens/emails are not logged or displayed unintentionally.

## Visual system

- Forest `#174D3A`, ink `#202923`, paper `#F7F6F0`, white `#FFFFFF`, mineral teal `#168C83`, brass `#B98225`, error red `#B7473D`.
- System sans for app UI and forms; reserve Georgia for the signed-out introduction only.
- Desktop: compact forest navigation rail, slim workspace header, 1180px content measure; mobile: compact business selector and five-destination bottom bar.
- Dashboard with real analytics: compact metrics, readable trend, sales-direction score, recent activity. Unconfigured analytics: one setup state with a working Analytics link.
- Use quiet surfaces, short human-readable labels, clear primary actions, accessible focus, and reduced-motion support. No fabricated metrics or decorative chart data.

## Delivery stages

1. **Foundation and shell:** replace generic glyph navigation with labelled task navigation; refine business/account context, responsive mobile navigation, type/color/spacing tokens, and base controls. Keep the integration workbench isolated.
2. **Overview and analytics:** make the overview's configured/unconfigured/error/loading states distinct; remove internal score formulas from ordinary dashboard view; ensure analytics mapping, date filters, export, and explanations follow the actual API contract.
3. **Data and operations:** redesign datasets/import/detail, expenses, and inventory/stock history with their existing upload limits, confirmations, filters, pagination, mutation feedback, and CSV actions.
4. **People and settings:** redesign team, invitations, ownership acceptance, profile/business settings, authentication, verification, and onboarding without changing Firebase or backend behavior.
5. **Cross-screen review:** audit every visible control and route; run lint/build/tests, inspect responsive rendering with available local tooling, and report any journey that cannot be exercised without configured services or credentials.

## Audit evidence and boundaries

- Frontend routes are in `frontend/src/app/routes.ts`; app chrome is `frontend/src/app/AppShell.tsx`; page composition is `frontend/src/features/WorkspacePage.tsx`.
- API endpoints and limitations are documented in `backend/docs/api-contract.md` and implemented by existing typed modules under `frontend/src/api/`.
- Preserve unrelated pre-existing work. Do not edit backend/database/auth-provider settings, secrets, environment values, or Git history.

## Stage 1 — Foundation

1. Add failing tests for required API URL parsing, normalized API errors, token/header/no-cookie behavior, and route resolution.
2. Implement a small route map, auth/session context and guards; retain a route for the existing integration workbench.
3. Build CSS tokens, responsive shell, semantic navigation, common buttons/fields/panels/tables/dialog/status/loading/empty/error components.
4. Replace API helper fallback with typed JSON/multipart/blob transport and domain error types.
5. Verify route/API/auth utility tests, lint, and build.

**Acceptance:** desktop/mobile shell, accessible signed-out/loading/unverified states, protected business routes, bearer tokens/no cookies, explicit config errors, current auth flows retained.

## Stage 2 — Workspace and dashboard

1. Migrate profile onboarding/editing, business selection/create/edit, member listing/role-aware controls into focused features.
2. Create overview using actual configured analytics and activity responses only, with useful no-business/no-dataset/unconfigured/incomplete states.
3. Preserve business-scoped session selection and clear data on identity/business changes.

**Acceptance:** no hardcoded live-looking KPIs; all mutation outcomes and 403s are explicit; existing flows remain usable.

## Stage 3 — Dataset lifecycle

1. Migrate upload, idempotency, preview, findings, confirmation, detail and paginated row inspection.
2. Add metadata editing and confirmed deletion using verified endpoints.
3. Add tests for upload transport/idempotency and domain state boundaries where practical.

**Acceptance:** accurate file constraints/statuses, no false import success, preserved idempotency, real server paging.

## Stage 4 — Analytics, activity, score

1. Add typed API/domain models for dataset configuration, overview metric statuses, daily trend, paginated activity and health score.
2. Build mapping/configuration UX, date-range analytics, data-quality explanations, activity pagination, score limitations/insufficient-data view.

**Acceptance:** date bounds match contract, metric status/reason remains visible, one score component only, no unsupported filters/recommendations.

## Stage 5 — Expenses and inventory

1. Implement expense list/date/category filters, summary, create/edit/delete forms, currency and validation display.
2. Implement item list/create/edit/detail, movement form and paginated movement history.
3. Keep write controls role-aware, respect API errors, and prevent duplicate movement submissions with idempotency keys.

**Acceptance:** field names, precision, limits, currency semantics and supported movement types match backend; no threshold/automatic deduction UI.

## Stage 6 — Team collaboration

1. Add invitation creation/list/resend/revoke and accept-token route; explain copyable link and no email delivery.
2. Add ownership transfer initiation/revocation/acceptance where API response allows; do not invent a pending-transfer listing.
3. Verify OWNER/MANAGER/VIEWER affordances while relying on server authorization.

**Acceptance:** one-time token display is deliberate and safe; unavailable data/actions are not fabricated.

## Stage 7 — CSV reports and exports

1. Add typed blob download helper and links/actions for verified analytics, expense, summary, inventory, movement, and dataset-row exports.
2. Add filenames, progress, success/error handling including export-size failures.

**Acceptance:** downloads are explicitly CSV, no XLSX claim, server limits and escaping remain intact.

## Stage 8 — Integration readiness

1. Review every route against source/controller DTOs and authorization.
2. Run frontend test/lint/build, inspect responsive and accessible behavior, check Git status and diff.
3. Document required environment names and deployment CORS setup without exposing values or changing external resources.

**Acceptance:** all implemented workflows have observed verification results; limitations and anything unverified are listed; backend/database/Git history unchanged.
