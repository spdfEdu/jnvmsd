CREATE TABLE contact_messages(id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','read','resolved')),created_at INTEGER NOT NULL);
CREATE TABLE announcements(id TEXT PRIMARY KEY NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('draft','published')),created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE representatives(batch INTEGER NOT NULL,member_id TEXT NOT NULL,PRIMARY KEY(batch,member_id));
CREATE TABLE rate_limits(key TEXT PRIMARY KEY NOT NULL,window INTEGER NOT NULL,count INTEGER NOT NULL);
CREATE TABLE visitor_daily(day TEXT NOT NULL,visitor_hash TEXT NOT NULL,PRIMARY KEY(day,visitor_hash));
CREATE TABLE visitor_totals(id INTEGER PRIMARY KEY CHECK(id=1),count INTEGER NOT NULL DEFAULT 0);
INSERT INTO visitor_totals(id,count) VALUES (1,0);
