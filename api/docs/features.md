# Added backend APIs

All functions have purpose comments. Existing login/profile and Meet routes remain supported.

| Feature | Public/member endpoints | Admin/organizer endpoints |
|---|---|---|
| Gallery | GET /api/gallery?batch=YEAR; own /api/me/gallery | /api/review/gallery; POST /api/admin/batch-photos?batch=YEAR&caption=TEXT; DELETE /api/admin/batch-photos/:id |
| Events | GET /api/events; GET /api/events/:id; GET/PUT /api/events/:id/registration | GET/POST /api/admin/events; PUT /api/admin/events/:id; GET /api/events/:id/registrations (admin/core) |
| Contact | POST /api/contact | GET /api/admin/contact; PUT /api/admin/contact/:id |
| Announcements | GET /api/announcements | GET/POST /api/admin/announcements; PUT/DELETE /api/admin/announcements/:id |
| Representatives | GET /api/representatives | GET/POST/DELETE /api/admin/representatives |
| Visits | POST /api/visits; GET /api/visits/count | Aggregate only |

## Operational requirements

Apply migrations 0002–0004 in order to a verified staging copy before deployment; do not apply the inferred 0001 baseline to an existing production database. Original Meet answers remain in meet2026, and the new event ID `meet2026` delegates registration/organizer views to those existing records. No event date was invented; admins set the schedule.

Gallery writes are limited atomically to five per member. Pending/rejected uploads are available only to their owner and authorized reviewers; public image delivery checks current metadata and uses no-store. Old public image responses already cached by the previous API cannot be recalled; clear external caches during release. Metadata is withdrawn before object deletion; failed KV cleanup stays queued and retries during deletes or the scheduled job. Schedule remains configured in the original production wrangler.toml.

For public production contact/visitor endpoints, configure RATE_LIMIT_SECRET (a random secret). Contact also requires TURNSTILE_SECRET_KEY and the frontend public site key; successful challenge hostnames must match ALLOWED_ORIGINS. Localhost has development-only challenge bypass. No production bypass is enabled. Email notifications remain separately configured and were not sent.

Visitor totals measure approximate daily browser visits, not exact people. IDs are hashed with a secret and daily salt; raw IPs/IDs are not stored. Deduplication hashes older than two days are removed on new visits. Contact submissions allow three requests per source per hour; visits allow sixty. Distributed abuse requires platform protections and monitoring.

Backend deployment, actual schema reconciliation, real Google sign-in, and actual storage usage remain unverified. Main-branch pushes run backend tests/dry-run build before the existing frontend Pages deployment; they do not deploy the API or migrate production data.
