# Copy Mockup UI into Production Implementation Plan

> **For agentic workers:** Implement task-by-task in this session. Preserve all existing user changes and do not stage or commit files.

**Goal:** Port the complete `frontend-mockup` visual system and screen layouts into the active production frontend while preserving its Firebase authentication, API-backed workflows, routes, and permissions.

**Architecture:** Copy the mockup’s presentation components, screen compositions, and design tokens into the existing React/Vite app. Keep current production pages as data/action containers or adapt them to the copied components; do not route production through the prototype’s mock fixtures. Render only values and actions supported by current backend contracts.

**Tech Stack:** React 19, TypeScript, Vite, existing Firebase and API clients, mockup React presentation source, CSS/Tailwind tooling only where required by copied UI.

**Spec:** User-provided complete frontend brief in `C:/Users/asus/.codex/attachments/ed235363-869f-464a-a9ca-899ab36adcb4/pasted-text-1.txt`.

## Global Constraints

- Keep all changes frontend-only; do not modify Spring Boot, database, Maven, or backend configuration.
- Preserve Firebase sign-in, registration, Google sign-in, verification, reset, session handling, and protected routes.
- Use current API clients and backend-supported operations; never show mock metrics as live data.
- Keep `frontend-mockup/` intact and preserve all existing modified and untracked files.
- Do not add dependencies unless copied production UI requires them.

## Review Focus

- Unsupported mock dashboard and analytics values: omit the widget or show the existing API availability state; test API-to-view-model mapping with unavailable metrics.
- Read-only memberships: copied controls must remain hidden or disabled per existing role checks; test role-driven rendering or handler guards.
- Empty/failed/pending API responses: preserve existing loading, error, empty, and retry behavior in copied layouts.
- Dataset IDs and dataset detail routes: keep production route destinations and pagination behavior.
- Responsive shell behavior: ensure desktop sidebar and mobile navigation remain keyboard-accessible and do not cover page content.

---

### Task 1: Port mockup presentation source and design tokens

**Files:**
- Create: `frontend/src/soho/**` from `frontend-mockup/src/soho/**` (exclude `mocks/` from production imports; leave original mockup untouched)
- Modify: `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, `frontend/src/styles/tokens.css`
- Test: `frontend/src/soho` component and existing frontend test suite

**Interfaces:**
- Preserve mockup screen/component props where feasible.
- Replace the mockup router adapter with an adapter over `frontend/src/app/navigation.ts`.

- [ ] Copy production presentation components, screens, shell, types, and formatting helpers.
- [ ] Add only dependencies and build configuration needed by those copied files.
- [ ] Run lint, tests, and build; fix import and style pipeline issues.

### Task 2: Make the copied shell the production workspace shell

**Files:**
- Modify: `frontend/src/app/AppShell.tsx`, `frontend/src/app/App.tsx`, `frontend/src/soho/shell/app-shell.tsx`, `frontend/src/soho/router-adapter.tsx`
- Test: existing route tests and production build

**Interfaces:**
- Inputs come from existing `WorkspaceContext`: current user/profile, business list/current business, role, sign-out, and business selection.
- Navigation paths map to existing routes, including dataset details and settings.

- [ ] Adapt the copied shell to real profile/business data and live business switching.
- [ ] Keep active route state, mobile navigation, account settings, and sign-out connected.
- [ ] Verify protected and acceptance routes continue to use the existing auth gate.

### Task 3: Port dashboard, analytics, and dataset screens

**Files:**
- Modify: `frontend/src/features/OverviewPage.tsx`, `AnalyticsPage.tsx`, `DatasetPage.tsx`, `DatasetDetailPage.tsx`
- Test: feature mapping tests plus existing route and API tests

**Interfaces:**
- Data comes from current analytics, health-score, dataset, activity, and export API clients.
- Keep existing dataset upload preview/confirmation, row pagination, and analytics mapping handlers.

- [ ] Reuse the mockup dashboard/analytics/dataset visual components with production view models.
- [ ] Render only real KPI, health-score, daily trend, dataset, and quality finding data.
- [ ] Omit mock insights, comparisons, data-quality scores, and source integrations with no API support.

### Task 4: Port expenses and inventory screens

**Files:**
- Modify: `frontend/src/features/ExpensesPage.tsx`, `InventoryPage.tsx`
- Test: feature tests and full frontend suite

**Interfaces:**
- Continue using current expenses, inventory, movement, pagination, and CSV APIs.
- Preserve owner/manager write restrictions and destructive confirmations.

- [ ] Apply the mockup’s page compositions and table/form components to existing API-driven records.
- [ ] Omit budget, receipt, reorder, unit-cost, velocity, and other unsupported demo data.

### Task 5: Port reports, team, activity, settings, and account layouts

**Files:**
- Modify: `frontend/src/features/ReportsPage.tsx`, `TeamPage.tsx`, `ActivityPage.tsx`, `SettingsPage.tsx`, `frontend/src/app/App.tsx`
- Test: existing report, authorization, route, and frontend tests

**Interfaces:**
- Continue using current membership, profile/business settings, activity pagination, CSV exports, and Firebase auth handlers.
- Report controls call only supported CSV export endpoints.

- [ ] Use mockup styling for remaining supported production screens and account states.
- [ ] Keep role checks, invitations, profile editing, and settings actions connected to current APIs.
- [ ] Omit scheduled reports, report history, PDF/XLSX, and unsupported account actions.

### Task 6: Verify complete frontend integration

**Files:** all touched frontend files

- [ ] Run `npm.cmd test -- --run` in `frontend/`.
- [ ] Run `npm.cmd run lint` in `frontend/`.
- [ ] Run `npm.cmd run build` in `frontend/`.
- [ ] Inspect final Git status and confirm the original `frontend-mockup/` remains unchanged.

