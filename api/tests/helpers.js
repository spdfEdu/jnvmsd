import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Miniflare } from 'miniflare';

export async function runtime(t) {
  const mf = new Miniflare({
    modules: true,
    modulesRules: [{ type: 'ESModule', include: ['**/*.js'] }],
    scriptPath: fileURLToPath(new URL('../index.js', import.meta.url)),
    compatibilityDate: '2026-01-01',
    d1Databases: ['DB'],
    kvNamespaces: ['GALLERY'],
    bindings: { ADMIN_EMAILS: 'admin@example.test', ALLOWED_ORIGINS: 'http://localhost:5173', GOOGLE_CLIENT_ID: 'test-only' },
  });
  t.after(() => mf.dispose());
  return { mf, db: await mf.getD1Database('DB') };
}

export async function migrate(db) {
  const directory = new URL('../migrations/', import.meta.url);
  const files = await readdir(directory).catch(e => { if (e.code === 'ENOENT') return []; throw e; });
  for (const file of files.filter(f => f.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(file, directory), 'utf8');
    // SQL files in this baseline have no semicolons inside literals or triggers.
    const statements = sql.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean);
    await db.batch(statements.map(s => db.prepare(s)));
  }
}

export async function seedSession(db, email, sub) {
  const token = `local-test-token-${sub}`;
  const hash = createHash('sha256').update(token).digest('hex');
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO sessions (token_hash, sub, email, name, picture, created_at, last_used, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(hash, sub, email, 'Test Student', '', now, now, now + 3600).run();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
