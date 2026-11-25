# JNV Murshidabad Alumni

React/Vite website and Cloudflare Worker API for alumni profiles, batch galleries, events, announcements, and administration.

## Development on D drive

Workspace: D:/jnvmsd-alumni. Run `. ./api/use-d-drive.ps1` before npm commands to keep caches, temporary files, and Worker logs on D:.

Install root and api dependencies with `npm ci` and `npm ci --prefix api`. Copy `.env.example` to `.env.local` for local public frontend settings. Start the API using the local configuration described in [API setup](api/docs/setup.md), then run `npm run dev`. The frontend is served under `/jnvmsd/`.

## Checks before main pushes

- `npm run lint`
- `npm test` (3 API-client tests)
- `npm run test:browser` (9 real React browser flows with mocked API responses)
- `npm test --prefix api` (31 backend/schema tests)
- `npm run build --prefix api` (Worker dry run)
- `npm run build`

Browser tests use installed Edge on Windows; Linux CI installs Chromium. They do not verify real Google sign-in or production database compatibility. Functions have purpose comments. Commits use only the owner's configured Git identity, with no coauthor trailer.

## Live configuration still required

Set GitHub repository Actions variables `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, and `VITE_TURNSTILE_SITE_KEY`. They are public browser configuration, never secrets. The Pages build reads them; rerun the workflow after changes. The API URL must point to the deployed Worker implementing this repository's API.

Configure the matching Google client ID and website origin in the Worker and Google OAuth console. Configure Turnstile and the rate-limit secret in Cloudflare, following [feature configuration](api/docs/features.md). Never put secret keys in VITE variables or Git.

Before deploying the Worker or applying migrations to an existing database, inspect its actual schema, back up and restore into staging, then reconcile using [API setup](api/docs/setup.md). The baseline is for a fresh database only. Production migration and real Google login have not been verified.

The main workflow runs all checks before publishing GitHub Pages. It builds the API as a dry run; it does not deploy the Worker.

## Access rules

Students edit their own profile and photographs. Core members read contacts and participation across all batches and can edit their own account. Administrators manage records, gallery approvals, events, announcements, roles, representatives, and the contact inbox. The API enforces these permissions independently of navigation visibility; see [access documentation](api/docs/access.md).

Live API supplied by the owner: `https://api.jnvmurshidabad.workers.dev` (omit `/api/batch/2018` from the base URL). Read-only checks on 2026-11-25 confirmed health HTTP 200, but events/announcements/representatives return 404. Responses currently omit Access-Control-Allow-Origin for `https://spdfedu.github.io`. Update and verify the Worker, database schema, allowed origins, and Google authorized origins before setting the Pages build variables. The public client ID in .env.example comes from the existing Worker config; its console settings remain unverified.
