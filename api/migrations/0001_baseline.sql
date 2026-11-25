-- Fresh databases ONLY. Inferred from the supplied Worker, not a live schema export.
-- Inspect and reconcile existing databases separately before production use.
CREATE TABLE members (
  id TEXT PRIMARY KEY NOT NULL,
  sub TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  batch INTEGER NOT NULL,
  name TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  draft TEXT,
  prev TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  photo TEXT,
  draft_photo TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX members_batch_status ON members (batch, status);
CREATE INDEX members_updated_at ON members (updated_at);

CREATE TABLE photos (
  key TEXT PRIMARY KEY NOT NULL,
  content_type TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Logical member references preserve the legacy merge/delete ordering.
-- Do not introduce cascading deletion until those routes are migrated together.
CREATE TABLE gallery (
  id TEXT PRIMARY KEY NOT NULL,
  member_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'rejected')),
  bytes INTEGER NOT NULL CHECK (bytes >= 0),
  created_at INTEGER NOT NULL,
  reviewed_by TEXT,
  reviewed_at INTEGER
);
CREATE INDEX gallery_member_id ON gallery (member_id);
CREATE INDEX gallery_status_created_at ON gallery (status, created_at);

CREATE TABLE meet2026 (
  email TEXT PRIMARY KEY NOT NULL,
  member_id TEXT,
  batch INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL,
  institute TEXT NOT NULL DEFAULT '',
  attend TEXT NOT NULL CHECK (attend IN ('Yes', 'No')),
  companions TEXT NOT NULL DEFAULT '',
  companion_count INTEGER NOT NULL DEFAULT 0,
  breakfast TEXT NOT NULL DEFAULT '',
  lunch TEXT NOT NULL DEFAULT '',
  tshirt TEXT NOT NULL DEFAULT '',
  mentor TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX meet2026_member_id ON meet2026 (member_id);
CREATE INDEX meet2026_batch_name ON meet2026 (batch, name COLLATE NOCASE);

CREATE TABLE roles (
  email TEXT PRIMARY KEY NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'core')),
  note TEXT NOT NULL DEFAULT '',
  added_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  sub TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  picture TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_used INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_email_last_used ON sessions (email, last_used DESC);
CREATE INDEX sessions_expires_at ON sessions (expires_at);

CREATE TABLE meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
