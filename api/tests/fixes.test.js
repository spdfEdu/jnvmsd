import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime, migrate, seedSession } from './helpers.js';

const request = (mf, path, headers = {}, method = 'GET', body) =>
  mf.dispatchFetch('http://localhost' + path, { headers, method, ...(body === undefined ? {} : { body: typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body) }) });

test('a sign-up whose email belongs to another Google account gets 409, not a server error', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  await db.prepare("INSERT INTO members (id,sub,email,batch,name,data,status,created_at,updated_at) VALUES ('11111111-1111-4111-8111-111111111111','old-sub','dup@example.test',2015,'Old','{}','approved',1,1)").run();
  const headers = await seedSession(db, 'dup@example.test', 'new-sub');
  const res = await request(mf, '/api/me', headers, 'PUT', { data: { Name: 'New Person', Batch: 2015 } });
  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /another Google account/);
});

test('removing a role with a malformed encoded email is a 400', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  const admin = await seedSession(db, 'admin@example.test', 'admin-sub');
  const res = await request(mf, '/api/admin/roles/%E0%A4%A', admin, 'DELETE');
  assert.equal(res.status, 400);
});

test('the Meet form also updates Institute on an approved profile', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  await db.prepare("INSERT INTO members (id,sub,email,batch,name,data,status,created_at,updated_at) VALUES ('11111111-1111-4111-8111-111111111111','s-sub','s@example.test',2015,'Student','{\"Name\":\"Student\"}','approved',1,1)").run();
  const headers = await seedSession(db, 's@example.test', 's-sub');
  const res = await request(mf, '/api/meet/me', headers, 'PUT', { data: { Name: 'Student', Batch: 2015, Phone: '9876543210', CurrentStatus: 'Studying', Institute: 'IIT Kharagpur', Attend: 'No' } });
  assert.equal(res.status, 200);
  const data = JSON.parse((await db.prepare("SELECT data FROM members WHERE sub='s-sub'").first()).data);
  assert.equal(data.Institute, 'IIT Kharagpur');
});

test('an oversized profile photo is refused with 413', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  await db.prepare("INSERT INTO members (id,sub,email,batch,name,data,status,created_at,updated_at) VALUES ('11111111-1111-4111-8111-111111111111','s-sub','s@example.test',2015,'Student','{}','approved',1,1)").run();
  const { Authorization } = await seedSession(db, 's@example.test', 's-sub');
  const big = new Uint8Array(260 * 1024); big.set([0xff, 0xd8, 0xff]);
  const res = await request(mf, '/api/me/photo', { Authorization }, 'POST', big);
  assert.equal(res.status, 413);
  assert.equal(await db.prepare('SELECT key FROM photos').first(), null);
});

/* ---------- login and session improvements ---------- */
const fakeGoogleToken = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0.c2ln';

test('a Google ID token is not accepted outside POST /api/session', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  const res = await request(mf, '/api/me', { Authorization: 'Bearer ' + fakeGoogleToken });
  assert.equal(res.status, 401);
});

test('a session ends at the 90-day hard limit even if it is still being used', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  const headers = await seedSession(db, 's@example.test', 's-sub');
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('UPDATE sessions SET created_at = ?, expires_at = ?').bind(now - 91 * 86400, now + 10 * 86400).run();
  assert.equal((await request(mf, '/api/me', headers)).status, 401);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM sessions').first()).n, 0, 'the expired session row is removed');
});

test('a sliding refresh never pushes a session past the hard limit', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  const headers = await seedSession(db, 's@example.test', 's-sub');
  const now = Math.floor(Date.now() / 1000), created = now - 80 * 86400;
  await db.prepare('UPDATE sessions SET created_at = ?, last_used = ?').bind(created, now - 2 * 86400).run();
  assert.equal((await request(mf, '/api/me', headers)).status, 200);
  const row = await db.prepare('SELECT expires_at FROM sessions').first();
  assert.equal(row.expires_at, created + 90 * 86400);
});

test('sign out everywhere ends every session of that person only', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  const phone = await seedSession(db, 's@example.test', 's-sub');
  await db.prepare("INSERT INTO sessions (token_hash,sub,email,name,picture,created_at,last_used,expires_at) VALUES ('laptop','s-sub','s@example.test','','',?,?,?)").bind(Math.floor(Date.now()/1000), Math.floor(Date.now()/1000), Math.floor(Date.now()/1000) + 3600).run();
  await seedSession(db, 'other@example.test', 'other-sub');
  const res = await request(mf, '/api/sessions', phone, 'DELETE');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ended, 2);
  assert.equal((await request(mf, '/api/me', phone)).status, 401);
  assert.equal((await db.prepare("SELECT count(*) AS n FROM sessions WHERE sub='other-sub'").first()).n, 1);
});

test('deleting a member signs them out everywhere', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  const id = '11111111-1111-4111-8111-111111111111';
  await db.prepare("INSERT INTO members (id,sub,email,batch,name,data,status,created_at,updated_at) VALUES (?,'s-sub','s@example.test',2015,'Student','{}','approved',1,1)").bind(id).run();
  const student = await seedSession(db, 's@example.test', 's-sub');
  const admin = await seedSession(db, 'admin@example.test', 'admin-sub');
  assert.equal((await request(mf, '/api/admin/' + id, admin, 'DELETE')).status, 200);
  assert.equal((await request(mf, '/api/me', student)).status, 401);
});

test('every response says nosniff and cannot be framed', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  for (const path of ['/api/health', '/api/batch/2015', '/api/nope']) {
    const res = await request(mf, path);
    assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.match(res.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  }
});

test('approving a pending sign-up with a photo publishes the photo in the same step', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  const id = '11111111-1111-4111-8111-111111111111';
  await db.prepare("INSERT INTO members (id,sub,email,batch,name,data,draft,status,draft_photo,created_at,updated_at) VALUES (?,'s-sub','s@example.test',2015,'Student','{}','{\"Name\":\"Student\",\"Batch\":2015}','pending','pending/x.jpg',1,1)").bind(id).run();
  await db.prepare("INSERT INTO photos (key,content_type,data,created_at) VALUES ('pending/x.jpg','image/jpeg','/9j/',1)").run();
  const admin = await seedSession(db, 'admin@example.test', 'admin-sub');
  assert.equal((await request(mf, `/api/admin/${id}/approve`, admin, 'POST')).status, 200);
  const mem = await db.prepare('SELECT photo, draft_photo, status FROM members WHERE id = ?').bind(id).first();
  assert.equal(mem.status, 'approved'); assert.equal(mem.draft_photo, null); assert.match(mem.photo, /^live\//);
  assert.ok(await db.prepare('SELECT key FROM photos WHERE key = ?').bind(mem.photo).first());
  assert.equal((await request(mf, '/api/photo/' + mem.photo)).status, 200);
});

test('the public name list does not expose internal member ids', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  await db.prepare("INSERT INTO members (id,email,batch,name,data,status,created_at,updated_at) VALUES ('11111111-1111-4111-8111-111111111111','s@example.test',2015,'Student','{}','approved',1,1)").run();
  const { names } = await (await request(mf, '/api/meet/names')).json();
  assert.deepEqual(names, [{ name: 'Student', batch: 2015 }]);
});

/* ---------- privacy choices: blood group for approved alumni, no automatic Google photo ---------- */
async function privacySetup(t) {
  const { mf, db } = await runtime(t); await migrate(db);
  const data = { Name: 'Donor', BloodGroup: 'O +ve', gpic: 'https://lh3.googleusercontent.com/a/old' };
  await db.prepare("INSERT INTO members (id,sub,email,batch,name,data,status,created_at,updated_at) VALUES ('11111111-1111-4111-8111-111111111111','d-sub','d@example.test',2015,'Donor',?,'approved',1,1)").bind(JSON.stringify(data)).run();
  await db.prepare("INSERT INTO members (id,sub,email,batch,name,data,status,created_at,updated_at) VALUES ('22222222-2222-4222-8222-222222222222','p-sub','p@example.test',2015,'Pending','{}','pending',1,1)").run();
  return { mf, db, approved: await seedSession(db, 'd@example.test', 'd-sub'), pending: await seedSession(db, 'p@example.test', 'p-sub'), stranger: await seedSession(db, 'x@example.test', 'x-sub') };
}

test('blood group and Google photo are not public', async t => {
  const { mf } = await privacySetup(t);
  const [row] = (await (await request(mf, '/api/batch/2015')).json()).entries;
  assert.equal(row.BloodGroup, undefined); assert.equal(row.gpic, undefined);
});

test('only approved alumni get blood groups; strangers and pending sign-ups get 403', async t => {
  const { mf, approved, pending, stranger } = await privacySetup(t);
  assert.equal((await request(mf, '/api/batch/2015?level=member')).status, 401);
  assert.equal((await request(mf, '/api/batch/2015?level=member', stranger)).status, 403);
  assert.equal((await request(mf, '/api/batch/2015?level=member', pending)).status, 403);
  const res = await request(mf, '/api/batch/2015?level=member', approved);
  assert.equal(res.status, 200); assert.match(res.headers.get('Cache-Control'), /no-store/);
  const [row] = (await res.json()).entries;
  assert.equal(row.BloodGroup, 'O +ve'); assert.equal(row.gpic, undefined); assert.equal(row.Phone, undefined);
});

test('signing in no longer copies the Google photo onto the profile', async t => {
  const { mf, db } = await runtime(t); await migrate(db);
  await db.prepare("INSERT INTO members (id,sub,email,batch,name,data,status,created_at,updated_at) VALUES ('11111111-1111-4111-8111-111111111111','d-sub','d@example.test',2015,'Donor','{}','approved',1,1)").run();
  const headers = await seedSession(db, 'd@example.test', 'd-sub');
  await db.prepare("UPDATE sessions SET picture='https://lh3.googleusercontent.com/a/new'").run();
  assert.equal((await request(mf, '/api/me', headers)).status, 200);
  assert.equal((await db.prepare('SELECT data FROM members').first()).data, '{}');
});
