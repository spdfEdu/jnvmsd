# Progress — 2026-11-25-alumni-backend.md

User approved starting the plan one step at a time. Current milestone: Task 1, local foundation.

- Ruling: source folder has no Git repository; use an isolated copy under `api/` in the authorized workspace on `backend/local-foundation`, retaining the original source unchanged.
- Ruling: no Cloudflare credentials, schema export, or live-data snapshot is available. Build a fresh-database baseline inferred from the supplied SQL, explicitly not a production reconciliation migration. Production inventory and reconciliation remain pending.
- Ruling: preserve existing Worker behavior in this milestone; known access-control and account-linking issues belong to Task 2 and prevent treating this milestone as ready for deployment.
- Pre-flight: new schema must support existing member/photo/session/role/Meet routes; future events preserve legacy Meet responses; frontend continues consuming existing routes until respective feature changes land.
- Verification approach: Node test runner with actual local Miniflare D1 and Worker runtime, synthetic records only. No Google login bypass is added to application code.
- Task 1 environment blocker: npm dependency installation failed with ENOSPC; C: reported zero free bytes. Removed only this attempt's `api/node_modules`, recovering about 195 MiB. Do not delete user files or caches to make room.
- Ruling: add dependency-free Node SQLite checks while retaining the planned Miniflare integration suite. SQLite proves baseline SQL/constraints, not Cloudflare runtime compatibility. Worker tests and production reconciliation remain pending; Task 1 is not complete.
- TDD evidence: dependency-free schema tests ran before the migration existed: 0/4 passed, missing tables as expected.

- User requested D: for everything. Active workspace is now D:/jnvmsd-alumni; dependency cache, temporary files, Wrangler logs/config are under D:/jnvmsd-tools. Original C: source and previous working copy remain untouched. Retrying full dependency installation on D:.

- Task 1 local foundation: verified on D:. `npm test` passed 8/8, `npm run check` passed, `npm run db:migrate:local` applied 16 SQL statements; repeating reported no migrations to apply. `npm run build` completed a dry run with only local placeholder bindings. HTTP /api/health returned ok=true; /api/batch/2015 returned an empty directory.
- Installation blocker resolved after moving to D:. Exact dependency tree saved in api/package-lock.json. Node's experimental SQLite warning and upstream node-domexception deprecation notice are non-failing tool warnings.
- Review: independent reviewer found no remaining actionable issues in baseline/query compatibility and local setup. D: environment script documentation was verified in the review.
- Task 1 production portion remains pending: actual schema/index/constraint inventory, real backup restore/reconciliation, and real Google login configuration. Never apply the inferred fresh baseline to an existing production DB.
- Task 2 is next: correct profile claiming, public email exposure, and core-member gallery moderation permissions. No production deployment or GitHub push has occurred.

- Task 2 started: executing approved permission/identity/privacy work on D:; no production changes.
- TDD: new access/identity suite reproduced 5 failures (public email/unknown fields, core moderation, public export, name/batch claiming, meet auto-approval); 3 existing authorization behaviors passed.
- Ruling: retain verified exact-email linking for unclaimed accounts, but remove public name/batch linking. New Meet registrations remain saved with pending profiles so event participation is not lost while awaiting approval.
- Ruling: public responses explicitly allow known profile fields; omit structured contact and unknown imported fields. Version the Worker cache key and replace the unchanged shortcut with sanitized payloads. Existing clients/cache stores need the documented release update.
- Additional regression found: admin merge orphaned Meet references. Test failed with old member_id; database batch now preserves ownership and registration linkage together.
- Verification: 18/18 tests passed; syntax check and dry-run build passed. Core own-profile/DP edits, all-batch reads, role removal, expiry/logout, and admin review/linking are covered. Production-schema verification remains pending from Task 1.
- Task 2 review: independent reviewer found no actionable correctness/security regressions. Nonblocking coverage follow-ups: explicit failed-merge rollback and preseeded legacy-cache upgrade tests. Successful merge and fresh/cached sanitized response paths are covered; production schema remains unverified.
- Task 2 complete locally: permission/privacy/identity fixes and API compatibility notes are ready. Next milestone is gallery publication and batch-photo management.
