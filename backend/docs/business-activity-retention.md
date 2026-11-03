# Business activity retention

Business activity is append-only through the application API. No automatic cleanup job is enabled.
The approved retention period is 12 months; deletion is an explicit operator action after review.

Before a retention run, confirm the target environment and inspect the candidate count:

```sql
SELECT count(*)
FROM public.business_activity
WHERE occurred_at < CURRENT_TIMESTAMP - INTERVAL '12 months';
```

After the count and retention cutoff have been reviewed and the maintenance action is explicitly
authorized for that environment, run the reviewed cutoff in a separate maintenance window:

```sql
BEGIN;
DELETE FROM public.business_activity
WHERE occurred_at < CURRENT_TIMESTAMP - INTERVAL '12 months';
```

Keep the transaction open and review the affected row count. Commit only when it matches the approved
retention operation:

```sql
COMMIT;
```

Otherwise run `ROLLBACK;`. This is not part of application startup, Flyway, or a scheduled process.
Do not run it against an environment whose schema and retention authorization have not been confirmed.
