import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';

const directory = new URL('../migrations/', import.meta.url);
function migrate(db) {
  const files = existsSync(directory) ? readdirSync(directory) : [];
  for (const file of files.filter(f => f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file, directory), 'utf8'));
}
function database(t) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  migrate(db);
  return db;
}
function fixture(db) {
  db.exec(readFileSync(new URL('./fixtures/representative.sql', import.meta.url), 'utf8'));
}

test('fresh schema contains the seven stores required by existing routes', t => {
  const db = database(t);
  const names = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r => r.name);
  assert.deepEqual(names, ['gallery', 'meet2026', 'members', 'meta', 'photos', 'roles', 'sessions']);
});

test('restoring representative data preserves IDs, ownership, photo bytes and meet answers', t => {
  const db = database(t);
  fixture(db);
  const member = db.prepare('SELECT * FROM members').get();
  assert.equal(member.id, '11111111-1111-4111-8111-111111111111');
  assert.equal(member.sub, 'student-sub');
  assert.equal(member.email, 'student@example.test');
  assert.equal(JSON.parse(member.data).Phone, 9876543210);
  assert.equal(member.draft, null);
  assert.equal(member.prev, null);
  const photo = db.prepare('SELECT data FROM photos WHERE key = ?').get(member.photo);
  assert.deepEqual([...Buffer.from(photo.data, 'base64')], [1, 2, 3]);
  assert.equal(db.prepare('SELECT member_id FROM gallery').get().member_id, member.id);
  assert.equal(db.prepare('SELECT role FROM roles').get().role, 'core');
  const meet = db.prepare('SELECT * FROM meet2026').get();
  assert.equal(meet.member_id, member.id);
  assert.equal(meet.attend, 'Yes');
  assert.equal(meet.companion_count, 2);
  assert.equal(meet.phone, '9876543210');
  assert.equal(meet.tshirt, 'M');
  assert.equal(meet.institute, 'Example Institute');
});

test('database rejects duplicate ownership and allows unclaimed imported members', t => {
  const db = database(t);
  fixture(db);
  const add = db.prepare('INSERT INTO members (id, sub, email, batch, name, created_at, updated_at) VALUES (?, ?, ?, 2015, ?, 1, 1)');
  assert.throws(() => add.run('two', 'student-sub', 'two@example.test', 'Second'), /UNIQUE/);
  assert.throws(() => add.run('two', 'second-sub', 'student@example.test', 'Second'), /UNIQUE/);
  add.run('import-one', null, 'one@jnvmsd.invalid', 'Imported One');
  add.run('import-two', null, 'two@jnvmsd.invalid', 'Imported Two');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM members').get().n, 3);
  assert.throws(() => db.exec("INSERT INTO meet2026 (email, batch, name, phone, status, attend, created_at, updated_at) VALUES ('student@example.test', 2015, 'Duplicate', '9876543210', 'Working', 'No', 1, 1)"), /UNIQUE/);
});

test('baseline refuses reapplication to existing tables without deleting records', t => {
  const db = database(t);
  fixture(db);
  assert.throws(() => migrate(db), /already exists/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM members').get().n, 1);
  assert.equal(db.prepare('SELECT companion_count FROM meet2026').get().companion_count, 2);
});
