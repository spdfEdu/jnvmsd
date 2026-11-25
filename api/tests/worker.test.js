import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';

async function runtime(t) {
  const mf = new Miniflare({
    modules: true,
    scriptPath: fileURLToPath(new URL('../index.js', import.meta.url)),
    compatibilityDate: '2026-01-01',
    d1Databases: ['DB'],
    kvNamespaces: ['GALLERY'],
    bindings: { ADMIN_EMAILS: 'admin@example.test', ALLOWED_ORIGINS: 'http://localhost:5173', GOOGLE_CLIENT_ID: 'test-only' },
  });
  t.after(() => mf.dispose());
  return { mf, db: await mf.getD1Database('DB') };
}

async function migrate(db) {
  const directory = new URL('../migrations/', import.meta.url);
  const files = await readdir(directory).catch(e => { if (e.code === 'ENOENT') return []; throw e; });
  for (const file of files.filter(f => f.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(file, directory), 'utf8');
    // SQL files in this baseline have no semicolons inside literals or triggers.
    const statements = sql.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean);
    await db.batch(statements.map(s => db.prepare(s)));
  }
}

async function seedSession(db, email, sub) {
  const token = `local-test-token-${sub}`;
  const hash = createHash('sha256').update(token).digest('hex');
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO sessions (token_hash, sub, email, name, picture, created_at, last_used, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(hash, sub, email, 'Test Student', '', now, now, now + 3600).run();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

test('fresh schema supports an empty public directory instead of a database error', async t => {
  const { mf, db } = await runtime(t);
  await migrate(db);
  const res = await mf.dispatchFetch('http://localhost/api/batch/2015');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 0);
  assert.deepEqual(body.entries, []);
  assert.deepEqual(body.slides, []);
});

test('schema supports signup, admin approval, own profile reads, and logout', async t => {
  const { mf, db } = await runtime(t);
  await migrate(db);
  const headers = await seedSession(db, 'student@example.test', 'student-sub');
  const admin = await seedSession(db, 'admin@example.test', 'admin-sub');
  const saved = await mf.dispatchFetch('http://localhost/api/me', {
    method: 'PUT', headers, body: JSON.stringify({ data: { Name: 'Test Student', Batch: 2015, Phone: '9876543210' } }),
  });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).state, 'pending');
  const pending = await (await mf.dispatchFetch('http://localhost/api/me', { headers })).json();
  const id = pending.member.id;
  const approval = await mf.dispatchFetch(`http://localhost/api/admin/${id}/approve`, { method: 'POST', headers: admin });
  assert.equal(approval.status, 200);
  const profile = await (await mf.dispatchFetch('http://localhost/api/me', { headers })).json();
  assert.equal(profile.member.status, 'approved');
  assert.equal(profile.member.data.Phone, 9876543210);
  assert.equal(profile.member.id, id);
  const logout = await mf.dispatchFetch('http://localhost/api/session', { method: 'DELETE', headers });
  assert.equal(logout.status, 200);
  assert.equal((await mf.dispatchFetch('http://localhost/api/me', { headers })).status, 401);
});

test('schema preserves linked profile, photo, gallery, role, and meet answers in a restored fixture', async t => {
  const { mf, db } = await runtime(t);
  await migrate(db);
  const fixture = await readFile(new URL('./fixtures/representative.sql', import.meta.url), 'utf8');
  await db.batch(fixture.split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)));
  // Read the restored records through real routes, not a mock database.
  const headers = await seedSession(db, 'student@example.test', 'student-sub');
  const admin = await seedSession(db, 'admin@example.test', 'admin-sub');
  const profile = await (await mf.dispatchFetch('http://localhost/api/me', { headers })).json();
  assert.equal(profile.member.id, '11111111-1111-4111-8111-111111111111');
  assert.equal(profile.member.photo, 'live/student.webp');
  assert.equal(profile.member.data.Name, 'Test Student');
  assert.equal(profile.role, 'core');
  const photo = await mf.dispatchFetch('http://localhost/api/me/photo', { headers });
  assert.equal(photo.status, 200);
  assert.deepEqual([...new Uint8Array(await photo.arrayBuffer())], [1, 2, 3]);
  const gallery = await (await mf.dispatchFetch('http://localhost/api/me/gallery', { headers })).json();
  assert.equal(gallery.photos[0].id, '22222222-2222-4222-8222-222222222222');
  const responses = await (await mf.dispatchFetch('http://localhost/api/meet/responses', { headers: admin })).json();
  assert.equal(responses.count, 1);
  assert.equal(responses.responses[0].linked, true);
  assert.equal(responses.responses[0].Attend, 'Yes');
  assert.equal(responses.responses[0].CompanionCount, 2);
  assert.equal(responses.responses[0].Tshirt, 'M');
  assert.equal(responses.responses[0].Phone, '9876543210');
});

test('schema prevents duplicate Google ownership and duplicate meet responses', async t => {
  const { db } = await runtime(t);
  await migrate(db);
  const fixture = await readFile(new URL('./fixtures/representative.sql', import.meta.url), 'utf8');
  await db.batch(fixture.split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)));
  await assert.rejects(db.prepare("INSERT INTO members (id, sub, email, batch, name, created_at, updated_at) VALUES ('other', 'student-sub', 'other@example.test', 2016, 'Other', 1, 1)").run(), /UNIQUE/);
  await assert.rejects(db.prepare("INSERT INTO members (id, sub, email, batch, name, created_at, updated_at) VALUES ('other', 'other-sub', 'student@example.test', 2016, 'Other', 1, 1)").run(), /UNIQUE/);
  await assert.rejects(db.prepare("INSERT INTO meet2026 (email, batch, name, phone, status, attend, created_at, updated_at) VALUES ('student@example.test', 2015, 'Test', '9876543210', 'Working', 'No', 1, 1)").run(), /UNIQUE/);
});
