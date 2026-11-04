# Soho Suite Frontend Rebuild Design

## Visual direction for the full UI rebuild

Treat existing feature components as a source of working behavior and verified API integration, not as a layout reference. Build a calm, precise “working ledger” identity: a deep forest navigation rail frames a paper-white workspace; mineral teal is reserved for selected navigation and data visualization; brass is used only for warnings and incomplete data. Avoid repeated rounded KPI tiles, decorative icons, oversized editorial headlines, and all-caps labels on every section.

### Compact design tokens

- Color: Forest `#174D3A`, ink `#202923`, paper `#F7F6F0`, white `#FFFFFF`, mineral teal `#168C83`, brass `#B98225`, and clear error red `#B7473D`.
- Type: use a dependable system sans stack for application data and forms, with a restrained Georgia display face only in the signed-out introduction. Keep data numerals tabular and line lengths short.
- Layout: desktop uses a compact fixed navigation rail, a slim workspace header, and a content column aligned to an 1180px measure. Mobile replaces the rail with a five-destination bottom bar and a compact business selector.

```text
Desktop                          Mobile
┌──────┬───────────────────┐     ┌────────────────────┐
│ mark │ workspace / user  │     │ mark   business ▾  │
│ nav  ├───────────────────┤     ├────────────────────┤
│      │ page title  action│     │ page title         │
│      │ useful data       │     │ useful data        │
│      │ records / detail  │     │ records / detail   │
└──────┴───────────────────┘     ├────────────────────┤
                                  │ 5 task destinations│
                                  └────────────────────┘
```

The overview opens with the business and date range, then uses a compact metric strip only when configured metrics are available. When analytics are not configured, replace unavailable metric tiles with one setup explanation and a direct link to Analytics. Keep trend, score, and recent activity in a two-column information layout that collapses to one column. Operational modules lead with their actual task and primary action, then place filters, tables, and detail panes in predictable order.

### Review against the brief

Forest and warm neutrals are requested by the brief, so they remain. The previous spec's generic page headers, four equal metric cards, uppercase section-label treatment, and decorative glyph navigation are not distinctive enough for a product used for daily operations. This update tightens the content measure, lowers the chrome, removes non-informative iconography, and makes empty analytics a single actionable state. Accent color now communicates state or selection instead of decorating panels.

## Intent

Rebuild the frontend into a cohesive, responsive business workspace for small-business owners while preserving the current Firebase Authentication project and integrating only with verified Spring Boot contracts. The backend remains authoritative for data, validation, and permissions.

## Goals

- Make real business workflows easy to find and understand.
- Replace the monolithic workspace with route-oriented, focused features.
- Use a consistent accessible design system based on the Forest & Ivory direction.
- Preserve email/password, Google, email verification, password reset, session restore, profile, business, membership, and dataset workflows.
- Cover every supported backend MVP area: activity, collaboration, dataset lifecycle, analytics/health score, expenses, inventory, and CSV exports.
- Keep API configuration explicit and all business data live from Spring Boot.

## Non-goals and anti-goals

- No backend, database, schema, or authentication-provider changes.
- No Lovable Cloud, frontend database, demo fixtures presented as live, or invented routes/fields.
- No XLSX export, low-stock thresholds, email delivery, health-score recommendations, or unsupported activity filters.
- No service-account, database, or backend secrets in frontend code.
- No large component framework or toolchain upgrade.

## Current-state constraints

- React 19, TypeScript, Vite, Firebase SDK, custom CSS, and Vitest are already configured.
- There is no router or UI library; use a small first-party history/router layer unless the project demonstrates a concrete need for a dependency.
- `WorkspaceApp.tsx` contains existing auth, profile/business, membership, and dataset flows that must be migrated without losing behavior.
- API docs and source confirm token-authenticated endpoints for users, businesses, datasets, analytics, activity, invitations/ownership, expenses, inventory, and CSV exports.
- `VITE_API_BASE_URL` must be required; the present localhost fallback is removed.

## Design and implementation decisions

- Use a responsive left rail on desktop and accessible compact/mobile navigation, with grouped primary tasks and business context.
- Centralize semantic tokens in CSS custom properties: forest `#174D3A`, teal `#168C83`, ivory `#F7F6F0`, white surfaces, text `#202923`/`#68746D`, amber `#D99A32`, and error red `#C54848`. Validate actual foreground/background pairs and keep non-color status labels/icons.
- Split routing/auth/layout/API/domain services from feature screens; preserve feature boundaries instead of retaining a single giant workspace component.
- Centralize Firebase ID-token retrieval and typed API transport, including JSON, multipart, and CSV/blob responses; omit cookies and normalize backend errors.
- Keep server authorization authoritative. UI role checks only hide/disable controls; 401 and 403 remain explicit recoverable states.
- Use real API data and honest incomplete/unavailable/empty states. Date filters only appear where contracts support them.
- Keep charting dependency-free initially; render the documented daily trend accessibly with a compact SVG only if real analytics responses warrant it.

## Acceptance

All backend-supported MVP workflows have real API-backed screens and accurate request shapes; existing Firebase and workspace flows remain available; no unsupported behavior is claimed; routes, forms, dialogs, responsive layouts, keyboard focus, loading/error/empty/success states are coherent; frontend lint/build/tests and manual contract review are reported with exact results. Backend, database, credentials, and Git history remain untouched.

## Remaining to builder

Follow `docs/superpowers/plans/2026-11-04-soho-suite-frontend.md` in its stage order. Revisit a dependency choice only when a focused implementation requirement cannot be met with the existing stack.
