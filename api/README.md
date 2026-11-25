# JNV Murshidabad Alumni API

Local working copy of the supplied Cloudflare Worker. Includes a fresh-database baseline, local configuration, and tested ownership/privacy/role corrections.

```powershell
. ./use-d-drive.ps1
npm ci
npm run db:migrate:local
npm test
npm run dev
```

Active workspace: `D:/jnvmsd-alumni`. Run these commands inside its `api` directory. The environment script routes cache, temporary files, and Wrangler logs/config to `D:/jnvmsd-tools`. Node.js 22.13 or newer is required. The development server binds to `127.0.0.1`; visit `http://127.0.0.1:8787/api/health`.

See [setup and database reconciliation](docs/setup.md) before connecting any real account or existing database. The original `wrangler.toml` is retained for reference; package scripts explicitly select `wrangler.local.toml` and local resources. There is no deploy script.

## Current status

- Fresh schema passes the dependency-free SQLite tests (`npm run test:schema`). Node currently emits an experimental SQLite warning.
- Installation succeeded on D:. All 18 SQLite/Worker integration tests pass; local migration, repeat migration, syntax check, dry-run build, and server health/directory requests have been verified.
- Live schema inventory, production reconciliation, backup restoration, and real Google sign-in verification are pending.
- Public structured contact fields are hidden; core gallery writes are denied; new Meet signups require profile approval. See [access changes](docs/access.md) for compatibility and deployment notes. Gallery publication/storage improvements are the next milestone.
