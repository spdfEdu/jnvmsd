# Alumni website progress — 27 November 2026

## Implemented and pushed to main

- Google session handling and member sign-in screens; students edit their own profile and DP.
- Role permissions: admins manage records; core members read contacts and event participation across all batches and edit their own account.
- Public directory excludes private contact details; new profiles and identity changes require approval.
- Member gallery uploads, admin moderation, and historical batch-photo management.
- Events and own registrations, with existing Meet2026 answers preserved.
- Contact form and private admin inbox, announcements, batch representatives, and approximate visitor counts.
- Member, core, and admin screens connected to the new API implementation; function purpose comments added.
- Automated tests and checks gate GitHub Pages deployment. Feature code was pushed through commit fb32887; its deployment workflow succeeded.

## Validation recorded for the feature release

- 31 backend/schema tests, 3 API-client tests, and 9 browser tests passed.
- Frontend lint, frontend production build, and Worker dry-run build passed.
- Browser tests use API fixtures; real Google login and production database migration remain unverified.

## Required before services work live

- Inspect the existing Cloudflare D1 schema, back up and restore into staging, and reconcile migrations before applying production changes.
- Deploy the updated Worker at https://api.jnvmurshidabad.workers.dev.
- Allow the website origin in API CORS; configure frontend API URL, Google authorized origins/client ID, and Turnstile.
- Assign initial admin/core accounts and verify real login, own edits, approvals, and registration end to end.

The last live check on 25 November found health HTTP 200, but new event/announcement/representative routes returned 404 and the GitHub Pages origin lacked CORS permission. This note records that check rather than claiming a new live verification.

This PR adds progress documentation. The feature implementation is already on main; merging this PR does not deploy the Worker or migrate production data.

## Current notes-branch verification

- Re-run on the latest main base: 31 backend tests and 3 client tests passed.
- Browser verification encountered unresolved frontend imports, including cn and CSS package imports, in the current local environment. The latest frontend is not claimed verified by this documentation PR. Dependency installation and import resolution need checking before a new frontend release.
- The prior feature-release results above describe the earlier tested commit, not these newer design changes.
