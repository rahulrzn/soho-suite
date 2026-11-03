# Soho Suite Backend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the approved backend MVP phases in the existing Spring Boot project while preserving all prior workspace changes.

**Architecture:** Extend the existing controller/service/repository/DTO patterns and current PostgreSQL/Flyway setup. Retain compatible partial work already present, add only additive migrations after V8, and document actual source behavior.

**Tech Stack:** Java, Spring Boot, Spring Security, Spring Data JPA, JdbcTemplate, PostgreSQL, Flyway, JUnit/MockMvc/Testcontainers already configured.

**Spec:** User-provided pasted task `pasted-text-1.txt` (nine phases, mandatory safety rules).

## Global Constraints

- Preserve pre-existing modified and untracked files; Maven wrapper files and `pom.xml` remain untouched.
- Never modify V1–V8, contact a remote, or connect to/start/migrate/seed the development database.
- Do not run tests, Maven, builds, application startup, Docker, Flyway, or database commands in this task.
- No new dependencies; no secrets, uploaded row contents, or sensitive personal data in logs/activity.
- New schema is additive after V8 and does not assume live migration history.

## Review Focus

- Malformed request parameters and JSON: pin sanitized 400/415 contracts in focused MockMvc tests.
- Cross-business identifiers: keep every service lookup scoped to business and test unauthorized access.
- Concurrent invitation, ownership, and inventory operations: preserve transactional locking and uniqueness constraints.
- Analytics source quality and incomplete data: score/export must preserve unavailable and incomplete states.
- Spreadsheet formulas and export limits: escape untrusted cell values and cap export sizes.

## Phase Tasks

### Task 1: Foundation and contracts

Inspect existing SQL references and supported setup docs; remove unsupported manual Firebase SQL and update its references. Complete stable error handling tests and create `backend/docs/api-contract.md` from controller/DTO/service source. Preserve current Testcontainers safety.

### Task 2: Activity history

Review existing V9 activity schema and service coverage; complete append-only business-scoped events, safe summaries, pagination, retention documentation, and tests without destructive cleanup or scheduled deletion.

### Task 3: Invitations and ownership transfer

Review existing collaboration services/controllers/migration; complete verified-email matching, role and owner invariants, token rotation/revocation/expiry, business scoping, transactional concurrency protection, activity, and isolated tests.

### Task 4: Dataset lifecycle

Complete metadata validation, cross-business isolation, row/config cleanup, dependency conflict behavior, activity, docs, and lifecycle tests using existing schema constraints where possible.

### Task 5: Expenses

Review current implementation for business currency, amount precision, categories, date filtering, role checks, summary correctness, activity, and tests.

### Task 6: Inventory

Complete HTTP controller and service behavior for item CRUD/metadata, stock ledger, safe transactional balance updates, pagination, role isolation, activity, and tests.

### Task 7: Reports and exports

Implement bounded CSV exports for supported authorized analytics, expense, inventory, and dataset data using existing dependencies. Escape spreadsheet formula prefixes, preserve quality status, and test limits, empty results, authorization, and escaping.

### Task 8: Business Health Score

Use only sufficiently reliable existing analytics/expense/inventory inputs. Return explicit insufficient-data state, deterministic component calculations, explanations and limitations; document and test the result.

### Task 9: Integration review

Review isolation, authorization, validation, transaction boundaries, migrations, limits, sensitive data handling, API docs, and changed-file scope. Prepare but do not execute verification commands.

## Execution Notes

The worktree already contains uncommitted partial implementations, tests, documentation edits, and V9. Treat all as pre-existing and inspect before editing. Feature tests may be written, but no verification command may run during this task.
