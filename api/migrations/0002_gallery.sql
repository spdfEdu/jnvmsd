ALTER TABLE gallery ADD COLUMN caption TEXT NOT NULL DEFAULT '';
CREATE TABLE batch_photos (id TEXT PRIMARY KEY NOT NULL, batch INTEGER NOT NULL, caption TEXT NOT NULL DEFAULT '', bytes INTEGER NOT NULL, created_at INTEGER NOT NULL, added_by TEXT NOT NULL);
CREATE INDEX batch_photos_batch ON batch_photos(batch, created_at);
CREATE TABLE gallery_cleanup (id TEXT PRIMARY KEY NOT NULL, created_at INTEGER NOT NULL);
