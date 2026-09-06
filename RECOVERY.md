# Database Recovery Runbook

Last reviewed: 2026-09-06

This runbook covers recovery of HebSync's Neon Postgres data. It is deliberately designed so a routine drill cannot mutate production or exercise stored Google credentials.

## Recovery objectives

- Target RPO: at most 15 minutes for an incident discovered inside the configured Neon restore window.
- Target RTO: at most 2 hours from the decision to restore until database validation and application reconnection are complete.
- Confirmed configuration: Neon Free plan, 6-hour history window, no snapshots, and no snapshot schedule as of 2026-09-06.

Neon's current plan limits differ: the Free plan advertises up to a 6-hour instant-restore window, Launch up to 7 days, and Scale up to 30 days. New projects default to 6 hours on Free and 1 day on paid plans. Treat the Console's project setting—not these maxima—as authoritative.

The 15-minute RPO applies only while the required point is still inside that window. A scheduled snapshot policy is needed for recovery from incidents discovered later. On paid plans, configure at least daily snapshots with 14-day retention after reviewing cost and data-retention requirements. If the project is on Free, record the available manual snapshot and restore-window limits and decide whether the remaining risk justifies upgrading.

## Critical assets

- Neon database schema: `db/schema.sql`.
- Production connection: Vercel `DATABASE_URL` (secret).
- Token encryption material: Vercel `APP_ENCRYPTION_KEY` (secret).
- Application environment: `APP_BASE_URL`, Google OAuth settings, and redirect paths in Vercel.

Database recovery alone is insufficient if `APP_ENCRYPTION_KEY` is lost: restored Google refresh tokens cannot be decrypted without the same key. Store a recoverable copy in an approved password manager or secrets vault, separately from Neon and Vercel, and test access to it without exposing the value.

## Safety rules

1. Never restore over the production branch during a drill.
2. Create a new branch from a selected point in production history or from a snapshot.
3. Never assign the recovery connection string to a Vercel Production or Preview environment during a drill.
4. Do not decrypt, print, or use stored Google access or refresh tokens.
5. Run only the repository's read-only verification command against the recovery branch.
6. Delete the temporary branch only after its identity is rechecked and the project owner explicitly approves deletion.

## Quarterly drill

1. In Neon, record the project plan, configured restore window, default branch name, latest snapshot, and project-region timezone. Do not copy credentials into an issue or chat.
2. Capture a UTC drill start time and safe production aggregates for comparison:
   - number of `google_connections` rows;
   - number with a non-null encrypted refresh token;
   - number of `user_sessions` rows;
   - number of unexpired sessions.
3. In **Backup & Restore**, choose a timestamp inside the configured restore window or a retained snapshot. Preview the data and schema before restoring.
4. Restore to a new temporary branch named `recovery-drill-YYYY-MM-DD`. Set it to expire after one day when that option is available.
5. Copy the temporary branch's connection string locally. Do not save it in the repository or shell history.
6. In PowerShell, set the recovery URL and acknowledge that it is isolated:

   ```powershell
   $env:RECOVERY_DATABASE_URL='<temporary branch connection string>'
   $env:RECOVERY_DRILL_ACK='isolated-neon-branch'
   npm run db:verify-recovery
   ```

   If `DATABASE_URL` is also present, the verifier refuses to run when both URLs use the same hostname. It checks required tables, columns, constraints, the session-expiry index, and aggregate row counts. It never selects identities, session hashes, or token values.
7. Compare the safe aggregates with the baseline for the chosen restore point. Small differences are expected if the timestamps differ; explain every material difference.
8. Record start/end timestamps, selected recovery point, verification result, observed RPO, and observed RTO in the drill log below.
9. Unset `RECOVERY_DATABASE_URL`, then delete the temporary branch after explicit approval.

## Real incident procedure

1. Stop or restrict writes if continued writes would make recovery harder.
2. Preserve the current state in a branch or snapshot before changing the production branch.
3. Identify the last known-good UTC timestamp using application logs and Neon Time Travel preview.
4. Restore that point to an isolated branch and run `npm run db:verify-recovery`.
5. Confirm the encryption key is available without displaying it, then perform an authenticated application check with a designated test account.
6. Choose one recovery method:
   - use Neon's finalized restore to keep the existing production connection string; or
   - deliberately update `DATABASE_URL` to the validated recovery branch and redeploy.
7. Obtain owner approval for the chosen production mutation, execute it, and monitor API errors, sign-in, and calendar operations.
8. Keep the pre-restore branch until recovery is accepted. Clean it up later with explicit approval.

## Rollback

If the recovered state is wrong, reconnect to the preserved pre-restore state or restore again from the correct point. Do not delete any preserved state until application checks pass and the owner accepts the recovery.

## Drill log

| Date | Recovery point | Schema/count verification | Observed RPO | Observed RTO | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-06 | 2026-09-06 20:35 Asia/Jerusalem (60 minutes before branch creation) | Passed on isolated `recovery-drill-2026-09-06`: both tables, 16 expected columns, expiry index, cascade FK, and aggregate counts | Historical recovery point 60 minutes old verified within the 6-hour window | Under 2 minutes from branch creation to validated result | Free plan; no snapshots or schedule. Counts: 159 connections, 159 encrypted refresh tokens, 335 sessions, 23 active sessions. No identities or token values inspected. Branch configured to auto-delete after 24 hours. |

## References

- Neon pricing and restore-window limits: <https://neon.com/pricing>
- Neon Backup & Restore release and snapshot availability: <https://neon.com/docs/changelog/2025-10-31>
- Neon current backup-schedule behavior: <https://neon.com/docs/changelog/2026-02-27>
- Neon schema comparison during restore: <https://neon.com/docs/guides/schema-diff>
