# Local setup and existing-database reconciliation

## What this milestone does

The three supplied files did not include SQL schema, migrations, tests, or dependency metadata. `migrations/0001_baseline.sql` reconstructs the tables required by the Worker **for a fresh database**. It does not establish what exists in production. No production database, KV namespace, email service, or Google account has been accessed.

The original source folder and production `wrangler.toml` remain unchanged. The working `index.js` includes the Task 2 permission/privacy fixes. The working copy is separate from the source folder. All standard scripts select the local configuration explicitly. Tests use ephemeral Miniflare D1/KV, fabricated accounts, and test sessions inserted directly into the test database. They do not bypass authentication in the application and do not test real Google token issuance.

## Run locally

Active workspace: `D:/jnvmsd-alumni`. From its `api` directory, use Node 22.13+. Dot-source `use-d-drive.ps1` in each new PowerShell session to keep npm cache, temporary files, and Wrangler logs/config on D:.

```powershell
. ./use-d-drive.ps1
npm ci
npm run db:migrate:local
npm test
npm run check
npm run build
npm run dev
```

`build` is a Wrangler dry run, not a deployment. `dev` listens on loopback. Migration commands use `--local`; running the same command again should report no pending migrations and preserve local data.

Health endpoint: `http://127.0.0.1:8787/api/health`.
Empty directory endpoint after migration: `http://127.0.0.1:8787/api/batch/2015`.

The synthetic test fixture contains a member, linked DP metadata/content, gallery metadata, a core role, and Meet 2026 answers. Its fake DP bytes test storage round trips, not image decoding. Gallery-object backup/restore is not covered by this database fixture.

## Database inventory inferred from code

| Table | Purpose | Important relationships/constraints |
|---|---|---|
| members | Approved profile JSON, drafts, previous version, login ownership | Unique ID, email, and Google subject; imported entries may have no subject |
| photos | DP content stored as base64, content type | Key referenced by member photo/draft_photo |
| gallery | Upload ownership, moderation state and metadata | Member ID and KV object `g/<id>` |
| meet2026 | Attendance and event answers | Unique account email; optional member ID |
| roles | Admin/core role assignments | Unique email; owners come from ADMIN_EMAILS |
| sessions | Hashed bearer tokens and expiry | Token hash key; Google subject and email |
| meta | Public cache version | Key/value |

Member/photo/gallery references are not newly given cascading foreign keys in this baseline: the legacy code deletes/moves records in multiple statements during merges. Adding cascades without adjusting and testing those flows could lose answers or photos. Referential checks and transactional merge improvements must accompany that future change.

## Google login and application settings

1. Create or reuse a development Google OAuth web client; add the exact local frontend origins in Google Console.
2. Copy `.dev.vars.example` to `.dev.vars` and set that client's ID and the intended admin Google email. No client secret is required by the existing ID-token verification flow.
3. Use the same client ID in the frontend's Google sign-in integration. Set its API base URL to the local Worker.
4. Keep the original production Google client ID and allowed Blogspot origins unchanged until the React deployment origin has been confirmed.
5. For production, configure `ADMIN_EMAILS` in Cloudflare, and verify the intended admin account before opening membership registration. Never allow the browser to assign roles.
6. Email binding and daily reminder scheduling are absent from local configuration; no email is sent by local setup. Configure and separately verify the email provider before enabling production notifications.

## Existing database: required reconciliation before any production migration

Do not apply `0001_baseline.sql` to an existing database. It deliberately uses normal CREATE TABLE statements rather than silently accepting incompatible existing tables with IF NOT EXISTS.

An authorized administrator must first provide read-only Cloudflare access or a sanitized schema export. Inspect:

```sql
SELECT type, name, tbl_name, sql FROM sqlite_schema
WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name;
PRAGMA table_info(members);
PRAGMA index_list(members);
PRAGMA foreign_key_list(members);
```

Repeat the PRAGMA inspections for all seven tables. Record counts, schema/migration history, null/duplicate identities, invalid statuses, and missing referenced photo/gallery/member records. Inspect environment settings by name without exposing secret values. Store backups outside Git; `backups/` is ignored.

Then:

1. Back up the existing D1 database and KV gallery content/metadata through authorized tools. Check that backups can actually be restored.
2. Restore a copy into a separate staging database and storage namespace.
3. Compare the actual schema with this inferred baseline; create an additive reconciliation migration from the real differences. Do not replace tables or drop data merely to match this file.
4. If the existing schema already matches, establish migration history deliberately after verifying every table/index. Do not mark a baseline applied without checking it.
5. Test preservation of member IDs/Google ownership, DP and gallery bytes, roles, sessions, and every Meet answer. Compare counts and values before and after; synthetic tests alone are not proof of production compatibility.
6. Record rollback/restore steps and staging test results for review before any production application.

No reconciliation migration is supplied yet because the actual database schema is unavailable. This is a pending prerequisite, not a completed production migration.

## Documentation references

- [Cloudflare D1 local development](https://developers.cloudflare.com/d1/best-practices/local-development/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Miniflare D1 testing](https://developers.cloudflare.com/workers/testing/miniflare/storage/d1/)

Direct dependency versions and the dependency tree are pinned in package.json and package-lock.json. Installation succeeded on D:. Thirty-one tests pass, local migration and repeat application succeed, and the dry-run build and live local health/directory checks pass. Production compatibility and real Google sign-in remain unverified.

Without installing dependencies, `npm run test:schema` executes the baseline against Node's built-in SQLite. These tests cover fresh tables, synthetic restoration, unique identities, and safe refusal to reapply to an existing schema. They do not substitute for Miniflare/D1 integration tests or live-data migration rehearsal. Node emits its experimental SQLite warning on the installed version.
