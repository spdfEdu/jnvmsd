// JNV MSD alumni API (Cloudflare Worker + D1)
// Public pages read approved data; members edit their own entry; admins approve.

const HOUSES = ["Aravali", "Nilgiri", "Shivalik", "Udaigiri"];
const BLOOD = ["A +ve", "A -ve", "B +ve", "B -ve", "AB +ve", "AB -ve", "O +ve", "O -ve"];
// plain text fields and their max length
const TEXT = {
  Name: 80, EmailId: 120, District: 60, Address: 200, CurrentStatus: 60, Institute: 160,
  HQD: 160, Employment: 160, Bio: 400, Occupation: 100, Company: 100, WorkCity: 80,
  linkedin: 120, twitter: 80, youtube: 120, rip: 40,
  City: 80, Skills: 300, Languages: 200, Memories: 1200,
};
// repeatable lists: rows joined by "~", columns by "|" (Year | Course | Institute | City, etc.)
const LISTS = { EduList: 6, WorkList: 5, JnvVisits: 3 }; // education: from|to|course|institute|city|highest, work: from|to|place|position|city
const MAX_ROWS = 10;
const HANDLES = ["fb", "insta"]; // stored as the bare username
// Explicit public fields: contact details and unknown imported fields stay private.
const PUBLIC_KEYS = new Set([
  "Name", "Batch", "District", "CurrentStatus", "Institute", "HQD", "Employment",
  "Bio", "Occupation", "Company", "WorkCity", "City", "Skills", "Languages", "Memories",
  "Achievements", "EduList", "WorkList", "JnvVisits", "House", "BloodGroup",
  "linkedin", "twitter", "youtube", "fb", "insta", "rip", "ppl", "gpic", "photo", "tag", "gallery",
]);
const KEEP_KEYS = ["ppl", "rip", "gpic"]; // old Drive photo id, memorial year, and the Google photo (saved at sign-in); not edited on the forms
const SESSION_DAYS = 30; // how long a sign-in lasts after the last visit
const MAX_SESSIONS = 10; // devices per person
const MAX_GALLERY = 5; // gallery photos per member (each shrunk to about 200 KB WebP by the browser)
const MAX_GALLERY_BYTES = 230 * 1024;
const MAX_PHOTO = 250 * 1024; // photos are stored in the database; the form shrinks them to ~40 KB first

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/* ---------- small helpers ---------- */
const now = () => Math.floor(Date.now() / 1000);
const jsonRes = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...headers } });

function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const h = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

/* ---------- Google sign-in check ---------- */
let jwks = null, jwksAt = 0;
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const b64uJson = (s) => JSON.parse(new TextDecoder().decode(b64u(s)));

async function googleKey(kid) {
  if (!jwks || Date.now() - jwksAt > 3600e3 || !jwks.some((k) => k.kid === kid)) {
    const r = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!r.ok) throw new HttpError(503, "Cannot reach Google to check the login");
    jwks = (await r.json()).keys;
    jwksAt = Date.now();
  }
  const jwk = jwks.find((k) => k.kid === kid);
  if (!jwk) throw new HttpError(401, "Unknown signing key");
  return crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
}

async function verifyGoogle(token, env) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new HttpError(401, "Please sign in");
  let header, claims;
  try { header = b64uJson(parts[0]); claims = b64uJson(parts[1]); } catch { throw new HttpError(401, "Bad token"); }
  if (header.alg !== "RS256") throw new HttpError(401, "Bad token");
  const key = await googleKey(header.kid);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) throw new HttpError(401, "Bad token");
  if (!["https://accounts.google.com", "accounts.google.com"].includes(claims.iss)) throw new HttpError(401, "Bad token");
  if (claims.aud !== env.GOOGLE_CLIENT_ID) throw new HttpError(401, "Token is for another app");
  if (!claims.exp || claims.exp < now()) throw new HttpError(401, "Login expired, please sign in again");
  if (!claims.email || claims.email_verified !== true) throw new HttpError(401, "Email not verified");
  return { sub: claims.sub, email: String(claims.email).toLowerCase(), name: claims.name || "", picture: claims.picture || "" };
}

async function sha256Hex(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// A session token is a long random string made after a Google sign-in. Only its hash is stored.
async function sessionUser(env, token) {
  const hash = await sha256Hex(token);
  const row = await env.DB.prepare("SELECT * FROM sessions WHERE token_hash = ?").bind(hash).first();
  if (!row || row.expires_at < now()) throw new HttpError(401, "Your sign-in expired. Please sign in again.");
  if (now() - row.last_used > 86400) { // each visit pushes the end date out again (at most once a day)
    await env.DB.prepare("UPDATE sessions SET last_used = ?, expires_at = ? WHERE token_hash = ?").bind(now(), now() + SESSION_DAYS * 86400, hash).run();
  }
  return { sub: row.sub, email: row.email, name: row.name || "", picture: row.picture || "" };
}

async function requireUser(req, env) {
  const h = req.headers.get("Authorization") || "";
  if (!h.startsWith("Bearer ")) throw new HttpError(401, "Please sign in");
  const t = h.slice(7);
  if (t.split(".").length === 3) return verifyGoogle(t, env); // a Google sign-in token (valid for an hour)
  return sessionUser(env, t); // our own session token
}

// Roles: "owner" comes from the ADMIN_EMAILS setting and can never be removed. "admin" and "core" come from the roles table.
const owners = (env) => String(env.ADMIN_EMAILS || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
async function roleOf(env, user) {
  if (owners(env).includes(user.email)) return "owner";
  const r = await env.DB.prepare("SELECT role FROM roles WHERE email = ?").bind(user.email).first();
  return r ? r.role : null;
}
const isAdminRole = (role) => role === "owner" || role === "admin";
const canSeeContacts = (role) => isAdminRole(role) || role === "core";

async function requireAdmin(req, env) {
  const user = await requireUser(req, env);
  if (!isAdminRole(await roleOf(env, user))) throw new HttpError(403, "Admins only");
  return user;
}

/* ---------- validation ---------- */
const text = (v, max) =>
  String(v ?? "").replace(/[\u0000-\u001f<>"\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

function handleOf(v) {
  let s = text(v, 120);
  const pid = s.match(/profile\.php\?id=(\d+)/i);
  if (pid) return pid[1];
  s = s.replace(/^https?:\/\/(www\.|m\.)?[^/]+\//i, "").replace(/\?.*$/, "").replace(/^@/, "").replace(/\/+$/, "");
  return s.slice(0, 80);
}

// rows of one-line items joined by "~"
function linesOf(v, max) {
  return String(v ?? "").split("~").map((r) => text(r.replace(/\|/g, " "), max)).filter(Boolean).slice(0, MAX_ROWS).join("~");
}
// rows of columns: keep the column count, drop empty rows
function listOf(v, cols) {
  return String(v ?? "").split("~").map((r) => {
    const c = r.split("|").slice(0, cols).map((x) => text(x, 120));
    while (c.length < cols) c.push("");
    return c;
  }).filter((c) => c.some(Boolean)).slice(0, MAX_ROWS).map((c) => c.join("|")).join("~");
}

function phoneOf(v) {
  const raw = String(v ?? "").trim();
  if (raw.startsWith("+") && !raw.startsWith("+91")) {
    const intl = raw.replace(/\D/g, ""); // numbers from abroad are kept as text, like +447586595751
    return intl.length >= 8 && intl.length <= 15 ? "+" + intl : null;
  }
  let d = raw.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(-10);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.length === 10 ? Number(d) : null;
}

export function clean(input, accountEmail) {
  const inp = input && typeof input === "object" ? input : {};
  const out = {};
  const errors = [];
  for (const [k, max] of Object.entries(TEXT)) {
    const v = text(inp[k], max);
    if (v) out[k] = v;
  }
  const ach = linesOf(inp.Achievements, 120);
  if (ach) out.Achievements = ach;
  for (const [k, cols] of Object.entries(LISTS)) { const v = listOf(inp[k], cols); if (v) out[k] = v; }
  for (const k of HANDLES) { const v = handleOf(inp[k]); if (v) out[k] = v; }

  const name = text(inp.Name, 80);
  if (name.length < 2) errors.push("Name is required");
  const batch = parseInt(inp.Batch, 10);
  if (!(batch >= 2008 && batch <= 2100)) errors.push("Batch (Class XII pass-out year) is required");
  else out.Batch = batch;

  if (inp.BloodGroup) {
    if (BLOOD.includes(inp.BloodGroup)) out.BloodGroup = inp.BloodGroup; else errors.push("Blood group is not valid");
  }
  if (inp.House) {
    if (HOUSES.includes(inp.House)) out.House = inp.House; else errors.push("House is not valid");
  }
  for (const k of ["Phone", "Phone2"]) {
    if (inp[k] !== undefined && String(inp[k]).trim() !== "") {
      const p = phoneOf(inp[k]);
      if (p) out[k] = p; else errors.push(k + " must be a 10 digit number");
    }
  }
  if (inp.PinCode !== undefined && String(inp.PinCode).trim() !== "") {
    const pin = String(inp.PinCode).replace(/\D/g, "");
    if (pin.length === 6) out.PinCode = Number(pin); else errors.push("Pin code must be 6 digits");
  }
  if (inp.DOB) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(inp.DOB)) out.DOB = inp.DOB; else errors.push("Date of birth must look like 2001-05-17");
  }
  if (out.EmailId && !/^[^\s@]+(@[^\s@]+\.[^\s@]+)?$/.test(out.EmailId)) errors.push("Email is not valid");
  if (!out.EmailId && accountEmail) out.EmailId = accountEmail;
  out.Name = name;
  return { data: out, errors };
}

function keepLegacy(live, data) {
  for (const k of KEEP_KEYS) if (live && live[k] !== undefined && data[k] === undefined) data[k] = live[k];
  return data;
}

/* ---------- daily email about pending approvals ---------- */
const escHtml = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dayIST = (t) => new Date(t * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
// Sends one email to one randomly chosen admin when anything waits for approval. It runs every day, so an unanswered request is mailed again the next day.
async function notifyPending(env) {
  const { results } = await env.DB.prepare("SELECT id, name, batch, status, data, draft, draft_photo, updated_at FROM members WHERE draft IS NOT NULL OR draft_photo IS NOT NULL ORDER BY updated_at").all();
  if (!results.length) return { sent: false, pending: 0, reason: "Nothing is waiting for approval" };
  const roleRows = (await env.DB.prepare("SELECT email FROM roles WHERE role = 'admin'").all()).results || [];
  const admins = [...new Set([...owners(env), ...roleRows.map((r) => String(r.email).toLowerCase())])].filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !/@jnvmsd\.invalid$/.test(e));
  if (!admins.length) return { sent: false, pending: results.length, reason: "There is no admin email to send to" };
  const to = admins[Math.floor(Math.random() * admins.length)];
  if (!env.EMAIL || !env.MAIL_FROM) return { sent: false, pending: results.length, to, reason: "Email is not set up yet (needs the EMAIL binding and MAIL_FROM)" };

  const origin = String(env.ALLOWED_ORIGINS || "").split(",")[0].trim();
  const link = env.ADMIN_URL || (origin ? origin + "/p/admin.html" : "");
  const lines = results.slice(0, 25).map((r) => {
    const live = r.status === "approved" ? parse(r.data) || {} : {};
    const dr = parse(r.draft) || {};
    const who = (dr.Name || live.Name || r.name) + " (Batch " + (dr.Batch || live.Batch || r.batch) + ")";
    if (r.status !== "approved") return { kind: "New sign-up", text: who + ", sent " + dayIST(r.updated_at) };
    if (r.draft) {
      const ch = [];
      if (dr.Name && dr.Name !== (live.Name || r.name)) ch.push("name: " + (live.Name || r.name) + " to " + dr.Name);
      if (dr.Batch && Number(dr.Batch) !== Number(r.batch)) ch.push("batch: " + r.batch + " to " + dr.Batch);
      return { kind: "Name or batch change", text: who + (ch.length ? ", " + ch.join(", ") : "") + ", sent " + dayIST(r.updated_at) };
    }
    return { kind: "New photo", text: who + ", sent " + dayIST(r.updated_at) };
  });
  const more = results.length - lines.length;
  const n = results.length;
  const subject = n + (n === 1 ? " approval is" : " approvals are") + " waiting - JNV Murshidabad Alumni";
  const textBody = "Hello,\n\n" + n + (n === 1 ? " request is" : " requests are") + " waiting for approval on the alumni site:\n\n" +
    lines.map((l) => "- " + l.kind + ": " + l.text).join("\n") + (more > 0 ? "\n- and " + more + " more" : "") +
    (link ? "\n\nOpen the admin page: " + link : "") + "\n\nThis reminder is sent once a day while anything is pending, to one admin chosen at random.\n";
  const htmlBody = "<p>Hello,</p><p><b>" + n + "</b>" + (n === 1 ? " request is" : " requests are") + " waiting for approval on the alumni site:</p><ul>" +
    lines.map((l) => "<li><b>" + escHtml(l.kind) + ":</b> " + escHtml(l.text) + "</li>").join("") + (more > 0 ? "<li>and " + more + " more</li>" : "") + "</ul>" +
    (link ? '<p><a href="' + escHtml(link) + '">Open the admin page</a></p>' : "") +
    '<p style="color:#666;font-size:12px">This reminder is sent once a day while anything is pending, to one admin chosen at random.</p>';
  try {
    await env.EMAIL.send({ from: { email: env.MAIL_FROM, name: "JNV Murshidabad Alumni" }, to, subject, text: textBody, html: htmlBody });
    return { sent: true, pending: n, to };
  } catch (e) {
    console.error("pending mail failed", e);
    return { sent: false, pending: n, to, reason: "Sending failed: " + (e && e.message ? e.message : e) };
  }
}

/* ---------- Alumni Meet 2026 ---------- */
const YESNO = ["Yes", "No"];
export function cleanMeet(input) {
  const inp = input && typeof input === "object" ? input : {};
  const e = [], o = {};
  o.name = text(inp.Name, 80);
  if (o.name.length < 2) e.push("Name is required");
  o.batch = parseInt(inp.Batch, 10);
  if (!(o.batch >= 2008 && o.batch <= 2100)) e.push("Batch is required");
  const p = phoneOf(inp.Phone);
  if (!p) e.push("Phone must be a valid number");
  o.phone = p ? String(p) : "";
  o.status = text(inp.CurrentStatus, 60);
  if (!o.status) e.push("Current status is required");
  o.institute = text(inp.Institute, 160);
  o.attend = YESNO.includes(inp.Attend) ? inp.Attend : "";
  if (!o.attend) e.push("Please tell us whether you will attend");
  Object.assign(o, { companions: "", companion_count: 0, breakfast: "", lunch: "", tshirt: "", mentor: "" });
  if (o.attend === "Yes") { // the rest only matters for people who are coming
    o.companions = YESNO.includes(inp.Companions) ? inp.Companions : "";
    if (!o.companions) e.push("Please say whether someone will accompany you");
    if (o.companions === "Yes") {
      const n = parseInt(inp.CompanionCount, 10);
      if (n >= 1 && n <= 10) o.companion_count = n; else e.push("Say how many people will accompany you (1 to 10)");
    }
    o.breakfast = YESNO.includes(inp.Breakfast) ? inp.Breakfast : "";
    if (!o.breakfast) e.push("Please answer the breakfast question");
    o.lunch = YESNO.includes(inp.Lunch) ? inp.Lunch : "";
    if (!o.lunch) e.push("Please answer the lunch question");
    o.tshirt = text(inp.Tshirt, 20);
    if (!o.tshirt) e.push("Please choose a T-shirt size");
    o.mentor = text(inp.Mentor, 80);
    if (!o.mentor) e.push("Please answer the mentoring / stage question");
  }
  return { data: o, errors: e };
}
const meetOut = (r) => ({
  email: r.email, Batch: r.batch, Name: r.name, Phone: r.phone, CurrentStatus: r.status, Institute: r.institute || "",
  Attend: r.attend, Companions: r.companions || "", CompanionCount: r.companion_count || 0, Breakfast: r.breakfast || "",
  Lunch: r.lunch || "", Tshirt: r.tshirt || "", Mentor: r.mentor || "", updated_at: r.updated_at, linked: !!r.member_id,
});

/* ---------- views ---------- */
function entryOf(row, level, origin, tag, gallery) {
  const d = JSON.parse(row.data || "{}");
  d.Batch = row.batch;
  d.Name = d.Name || row.name;
  if (row.photo) { d.photo = origin + "/api/photo/" + row.photo; delete d.gpic; } // an uploaded photo always wins
  if (tag) d.tag = tag; // "Admin" or "Core Member", shown on the profile
  if (gallery && gallery.length) d.gallery = gallery; // every uploaded photo shows on the profile
  if (level !== "full") {
    for (const k of Object.keys(d)) if (!PUBLIC_KEYS.has(k)) delete d[k];
  }
  return d;
}

const parse = (t) => (t ? JSON.parse(t) : null);
const toRow = (m) => ({
  id: m.id, email: m.email, batch: m.batch, name: m.name, status: m.status,
  data: parse(m.data) || {}, draft: parse(m.draft), has_prev: !!m.prev,
  photo: m.photo, draft_photo: m.draft_photo, created_at: m.created_at, updated_at: m.updated_at,
});
const stable = (o) => JSON.stringify(Object.keys(o || {}).sort().map((k) => [k, o[k]]));

/* ---------- member lookup ---------- */
async function findMember(env, user) {
  let m = await env.DB.prepare("SELECT * FROM members WHERE sub = ?").bind(user.sub).first();
  if (!m) {
    m = await env.DB.prepare("SELECT * FROM members WHERE email = ? AND sub IS NULL").bind(user.email).first();
    if (m) {
      await env.DB.prepare("UPDATE members SET sub = ?, updated_at = ? WHERE id = ?").bind(user.sub, now(), m.id).run();
      m.sub = user.sub;
    }
  }
  return m || null;
}

/* ---------- photos ---------- */
function imageType(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ["image/jpeg", "jpg"];
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return ["image/png", "png"];
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return ["image/webp", "webp"];
  return null;
}

function toB64(buf) {
  const b = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < b.length; i += 0x8000) out += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(out);
}

async function photoResponse(env, key, cache) {
  const row = await env.DB.prepare("SELECT content_type, data FROM photos WHERE key = ?").bind(key).first();
  if (!row) throw new HttpError(404, "Not found");
  const bin = atob(row.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { headers: { "Content-Type": row.content_type, "Cache-Control": cache } });
}

const dropPhoto = (env, key) => (key ? env.DB.prepare("DELETE FROM photos WHERE key = ?").bind(key).run() : null);

async function promotePhoto(env, mem) {
  // move a pending photo to live, return the new key
  const there = await env.DB.prepare("SELECT key FROM photos WHERE key = ?").bind(mem.draft_photo).first();
  if (!there) return mem.photo;
  const key = "live/" + mem.id + "-" + Date.now() + "." + mem.draft_photo.split(".").pop();
  await env.DB.prepare("UPDATE photos SET key = ? WHERE key = ?").bind(key, mem.draft_photo).run();
  await dropPhoto(env, mem.photo);
  return key;
}

// One number that goes up whenever anything public changes. Pages keep their copy and ask "has it changed?".
async function getVer(env) {
  const r = await env.DB.prepare("SELECT value FROM meta WHERE key = 'ver'").first();
  return r ? Number(r.value) || 1 : 1;
}
async function bumpVer(env) {
  await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('ver', '2') ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1").run();
}
async function touched(env, url, years) {
  await bumpVer(env);
  await dropPublicCache(url, years);
}

async function dropGalleryPhoto(env, id) {
  if (env.GALLERY) { try { await env.GALLERY.delete("g/" + id); } catch {} }
  await env.DB.prepare("DELETE FROM gallery WHERE id = ?").bind(id).run();
}

async function dropPublicCache(url, years) {
  if (typeof caches === "undefined" || !caches.default) return;
  for (const y of new Set(years)) {
    try { await caches.default.delete(new Request(url.origin + "/api/batch/" + y + "?level=public&privacy=2")); } catch {}
  }
}

/* ---------- routes ---------- */
async function route(req, url, env) {
  const path = url.pathname.replace(/\/+$/, "");
  const method = req.method;
  let m;

  if (path === "/api/health") return jsonRes({ ok: true });

  // public: approved entries of one batch (live data, cached for a minute)
  if (method === "GET" && (m = path.match(/^\/api\/batch\/(\d{4})$/))) {
    const level = url.searchParams.get("level") === "full" ? "full" : "public";
    const year = Number(m[1]);
    const ver = await getVer(env);
    // Always send sanitized data, including to clients holding an older public payload.
    let cacheKey = null;
    if (level === "public" && typeof caches !== "undefined" && caches.default) {
      cacheKey = new Request(url.origin + "/api/batch/" + year + "?level=public&privacy=2");
      const hit = await caches.default.match(cacheKey);
      if (hit) return new Response(hit.body, hit);
    }
    if (level === "full") {
      // phone, address and pin code: admins and core members only
      const user = await requireUser(req, env);
      if (!canSeeContacts(await roleOf(env, user))) throw new HttpError(403, "Contact details are for admins and core members");
    }
    const { results } = await env.DB.prepare("SELECT * FROM members WHERE status = 'approved' AND batch = ? ORDER BY name COLLATE NOCASE").bind(year).all();
    const roleRows = (await env.DB.prepare("SELECT email, role FROM roles").all()).results || [];
    const tags = new Map(roleRows.map((x) => [String(x.email).toLowerCase(), x.role === "admin" ? "Admin" : "Core Member"]));
    for (const e of owners(env)) tags.set(e, "Admin");
    // gallery: every photo shows on its owner's profile, approved ones also join the batch slider
    const gal = (await env.DB.prepare(
      "SELECT g.id, g.member_id, g.status FROM gallery g JOIN members m ON m.id = g.member_id WHERE m.status = 'approved' AND m.batch = ? ORDER BY g.created_at"
    ).bind(year).all()).results || [];
    const byMember = new Map();
    for (const g of gal) { if (!byMember.has(g.member_id)) byMember.set(g.member_id, []); byMember.get(g.member_id).push(url.origin + "/api/gallery/photo/" + g.id); }
    const slides = gal.filter((g) => g.status === "approved").map((g) => url.origin + "/api/gallery/photo/" + g.id);
    const res = jsonRes(
      { batch: year, ver, count: results.length, slides, entries: results.map((r) => entryOf(r, level, url.origin, tags.get(String(r.email).toLowerCase()), byMember.get(r.id))) },
      200,
      { "Cache-Control": level === "full" ? "private, no-store" : "public, max-age=60" }
    );
    if (cacheKey) await caches.default.put(cacheKey, res.clone());
    return res;
  }

  // public: live photos only
  if (method === "GET" && (m = path.match(/^\/api\/photo\/(live\/[A-Za-z0-9._-]+)$/))) {
    return photoResponse(env, m[1], "public, max-age=86400");
  }

  // 30 day sign-in: trade a Google sign-in token for our own session token
  if (path === "/api/session" && method === "POST") {
    const h = req.headers.get("Authorization") || "";
    if (!h.startsWith("Bearer ") || h.slice(7).split(".").length !== 3) throw new HttpError(401, "Sign in with Google first");
    const user = await verifyGoogle(h.slice(7), env);
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const token = btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const t = now();
    await env.DB.prepare("INSERT INTO sessions (token_hash, sub, email, name, picture, created_at, last_used, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(await sha256Hex(token), user.sub, user.email, user.name || "", user.picture || "", t, t, t + SESSION_DAYS * 86400).run();
    // tidy up: expired sessions, and only the newest few per person
    await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(t).run();
    await env.DB.prepare("DELETE FROM sessions WHERE email = ? AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE email = ? ORDER BY last_used DESC LIMIT ?)").bind(user.email, user.email, MAX_SESSIONS).run();
    return jsonRes({ ok: true, session: token, expires_in: SESSION_DAYS * 86400, user }, 200, { "Cache-Control": "no-store" });
  }
  if (path === "/api/session" && method === "DELETE") {
    const h = req.headers.get("Authorization") || "";
    if (h.startsWith("Bearer ") && h.slice(7).split(".").length !== 3) {
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(h.slice(7))).run(); // signing out ends it on the server too
    }
    return jsonRes({ ok: true });
  }

  // signed-in member
  if (path === "/api/me" && method === "GET") {
    const user = await requireUser(req, env);
    const mem = await findMember(env, user);
    const role = await roleOf(env, user);
    if (mem && mem.status === "approved" && /^https:\/\/[\w.-]+\.googleusercontent\.com\//.test(user.picture || "")) { // used on the profile only until they upload their own photo
      const d = parse(mem.data) || {};
      if (d.gpic !== user.picture) {
        d.gpic = user.picture;
        await env.DB.prepare("UPDATE members SET data = ? WHERE id = ?").bind(JSON.stringify(d), mem.id).run(); // not an edit: no undo copy, date unchanged
        mem.data = JSON.stringify(d);
        await touched(env, url, [mem.batch]);
      }
    }
    return jsonRes({ user, role, isAdmin: isAdminRole(role), isCore: role === "core", member: mem ? toRow(mem) : null }, 200, { "Cache-Control": "no-store" });
  }

  if (path === "/api/me" && method === "PUT") {
    const user = await requireUser(req, env);
    let body;
    try { body = await req.json(); } catch { throw new HttpError(400, "Send JSON"); }
    const { data, errors } = clean(body && body.data, user.email);
    if (errors.length) throw new HttpError(400, errors.join(". "));
    delete data.rip;
    const mem = await findMember(env, user);
    const t = now();

    // 1) first time with this Gmail: a new entry that waits for the admin (keeps fake sign-ups out)
    if (!mem) {
      await env.DB.prepare(
        "INSERT INTO members (id, sub, email, batch, name, data, draft, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '{}', ?, 'pending', ?, ?)"
      ).bind(crypto.randomUUID(), user.sub, user.email, data.Batch, data.Name, JSON.stringify(data), t, t).run();
      return jsonRes({ ok: true, state: "pending", message: "Saved. It will show on the site after the admin approves it." });
    }

    // 2) not approved yet: replace the pending entry
    if (mem.status !== "approved") {
      await env.DB.prepare("UPDATE members SET draft = ?, status = 'pending', updated_at = ? WHERE id = ?").bind(JSON.stringify(data), t, mem.id).run();
      return jsonRes({ ok: true, state: "pending", message: "Saved. It will show on the site after the admin approves it." });
    }

    // 3) already registered: details go live at once. Only a new name or batch waits for the admin.
    const live = parse(mem.data) || {};
    const oldName = live.Name || mem.name;
    const asksIdentity = data.Name !== oldName || data.Batch !== mem.batch;
    const next = keepLegacy(live, { ...data, Name: oldName, Batch: mem.batch });
    const changed = stable(next) !== stable(live);
    const draft = asksIdentity ? JSON.stringify({ Name: data.Name, Batch: data.Batch }) : null;
    if (changed) {
      await env.DB.prepare("UPDATE members SET data = ?, prev = ?, draft = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(next), mem.data, draft, t, mem.id).run();
      await touched(env, url, [mem.batch]);
    } else {
      await env.DB.prepare("UPDATE members SET draft = ?, updated_at = ? WHERE id = ?").bind(draft, t, mem.id).run();
    }
    return jsonRes({ ok: true, state: "saved", needsApproval: asksIdentity, message: asksIdentity ? "Saved. Your name or batch change needs admin approval." : "Saved. It is live on the site." });
  }

  /* ----- Alumni Meet 2026 ----- */
  // public: batches and names only; login emails are never exposed
  if (method === "GET" && path === "/api/meet/batches") {
    const { results } = await env.DB.prepare("SELECT batch, COUNT(*) AS n FROM members WHERE status = 'approved' GROUP BY batch ORDER BY batch").all();
    return jsonRes({ batches: results }, 200, { "Cache-Control": "public, max-age=60" });
  }
  if (method === "GET" && (m = path.match(/^\/api\/meet\/names(?:\/(\d{4}))?$/))) {
    const year = m[1] ? Number(m[1]) : null; // no year: every batch, for the search box
    const q = env.DB.prepare("SELECT id, name, batch FROM members WHERE status = 'approved'" + (year ? " AND batch = ?" : "") + " ORDER BY batch, name COLLATE NOCASE");
    const { results } = await (year ? q.bind(year) : q).all();
    const names = results.map((r) => ({ id: r.id, name: r.name, batch: r.batch }));
    return jsonRes({ batch: year, names }, 200, { "Cache-Control": "public, max-age=60" });
  }
  // signed in: what the form needs (profile details to pre-fill, an earlier response, and whether to show View Responses)
  if (path === "/api/meet/me" && method === "GET") {
    const user = await requireUser(req, env);
    const role = await roleOf(env, user);
    const mem = await findMember(env, user);
    const md = mem ? (mem.status === "approved" ? parse(mem.data) : parse(mem.draft)) || {} : {};
    const row = await env.DB.prepare("SELECT * FROM meet2026 WHERE email = ?").bind(user.email).first();
    return jsonRes({
      user: { email: user.email, name: user.name },
      canView: canSeeContacts(role),
      member: mem ? { locked: mem.status === "approved", Name: md.Name || mem.name, Batch: mem.batch, Phone: md.Phone ?? "", CurrentStatus: md.CurrentStatus || "", Institute: md.Institute || "" } : null,
      response: row ? meetOut(row) : null,
    }, 200, { "Cache-Control": "no-store" });
  }
  // signed in: save or update my response (the Gmail comes from the verified token, never from the request)
  if (path === "/api/meet/me" && method === "PUT") {
    const user = await requireUser(req, env);
    let body;
    try { body = await req.json(); } catch { throw new HttpError(400, "Send JSON"); }
    const { data: d, errors } = cleanMeet(body && body.data);
    if (errors.length) throw new HttpError(400, errors.join(". "));
    const t = now();
    // Meet registration does not prove alumni identity. New directory profiles require admin approval.
    const c = clean({ Name: d.name, Batch: d.batch, Phone: d.phone, CurrentStatus: d.status, Institute: d.institute }, user.email);
    if (c.errors.length) throw new HttpError(400, c.errors.join(". "));
    const extra = {};
    for (const k of ["Phone", "CurrentStatus"]) if (c.data[k] !== undefined && c.data[k] !== "") extra[k] = c.data[k];
    let mem = await findMember(env, user);
    let memberId = null, batch = d.batch, name = d.name, tail = "";

    if (mem && mem.status === "approved") {
      // already listed: name and batch stay as they are, the new phone / status / institute go into the profile
      const live = parse(mem.data) || {};
      const next = { ...live, ...extra };
      if (stable(next) !== stable(live)) {
        await env.DB.prepare("UPDATE members SET data = ?, prev = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(next), mem.data, t, mem.id).run();
        await touched(env, url, [mem.batch]);
      }
      memberId = mem.id; batch = mem.batch; name = live.Name || mem.name;
    } else if (mem) {
      // signed up earlier and still waiting for approval: keep that request up to date
      const draft = { ...c.data, ...(parse(mem.draft) || {}), ...extra };
      await env.DB.prepare("UPDATE members SET draft = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(draft), t, mem.id).run();
      memberId = mem.id;
      tail = " Your profile is waiting for the admin to approve it.";
    } else {
      const taken = await env.DB.prepare("SELECT id FROM members WHERE email = ?").bind(user.email).first();
      if (taken) throw new HttpError(409, "This Gmail already belongs to another Google account");
      // Never attach a Google account to an imported profile using a public name/batch.
      // Admins verify pending signups and explicitly merge them with imported records.
      memberId = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO members (id, sub, email, batch, name, data, draft, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '{}', ?, 'pending', ?, ?)")
        .bind(memberId, user.sub, user.email, c.data.Batch, c.data.Name, JSON.stringify(c.data), t, t).run();
      tail = " Your profile is waiting for the admin to approve or link it to an existing entry.";
    }

    await env.DB.prepare(
      "INSERT INTO meet2026 (email, member_id, batch, name, phone, status, institute, attend, companions, companion_count, breakfast, lunch, tshirt, mentor, created_at, updated_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(email) DO UPDATE SET member_id = excluded.member_id, batch = excluded.batch, name = excluded.name, phone = excluded.phone, status = excluded.status, " +
      "institute = excluded.institute, attend = excluded.attend, companions = excluded.companions, companion_count = excluded.companion_count, breakfast = excluded.breakfast, " +
      "lunch = excluded.lunch, tshirt = excluded.tshirt, mentor = excluded.mentor, updated_at = excluded.updated_at"
    ).bind(user.email, memberId, batch, name, d.phone, d.status, d.institute, d.attend, d.companions, d.companion_count, d.breakfast, d.lunch, d.tshirt, d.mentor, t, t).run();
    return jsonRes({ ok: true, message: "Saved. You can come back with the same Gmail to change your answers." + tail });
  }
  // core members and admins: every response
  if (path === "/api/meet/responses" && method === "GET") {
    const user = await requireUser(req, env);
    if (!canSeeContacts(await roleOf(env, user))) throw new HttpError(403, "Core members and admins only");
    const { results } = await env.DB.prepare("SELECT * FROM meet2026 ORDER BY batch, name COLLATE NOCASE").all();
    return jsonRes({ count: results.length, responses: results.map(meetOut) }, 200, { "Cache-Control": "private, no-store" });
  }

  if (path === "/api/me/photo" && method === "GET") {
    const user = await requireUser(req, env);
    const mem = await findMember(env, user);
    const key = mem && (mem.draft_photo || mem.photo);
    if (!key) throw new HttpError(404, "No photo");
    return photoResponse(env, key, "private, no-store");
  }

  if (path === "/api/me/photo" && method === "POST") {
    const user = await requireUser(req, env);
    const mem = await findMember(env, user);
    if (!mem) throw new HttpError(400, "Save your details first, then add the photo");
    const bytes = await req.arrayBuffer();
    if (!bytes.byteLength) throw new HttpError(400, "No photo received");
    if (bytes.byteLength > MAX_PHOTO) throw new HttpError(413, "Photo must be under 250 KB");
    const type = imageType(bytes);
    if (!type) throw new HttpError(415, "Use a JPG, PNG or WebP photo");
    const approved = mem.status === "approved";
    const key = (approved ? "live/" : "pending/") + mem.id + "-" + Date.now() + "." + type[1];
    await env.DB.prepare("INSERT INTO photos (key, content_type, data, created_at) VALUES (?, ?, ?, ?)").bind(key, type[0], toB64(bytes), now()).run();
    if (approved) {
      await dropPhoto(env, mem.photo);
      await dropPhoto(env, mem.draft_photo);
      await env.DB.prepare("UPDATE members SET photo = ?, draft_photo = NULL, updated_at = ? WHERE id = ?").bind(key, now(), mem.id).run();
      await touched(env, url, [mem.batch]);
    } else {
      await dropPhoto(env, mem.draft_photo);
      await env.DB.prepare("UPDATE members SET draft_photo = ?, updated_at = ? WHERE id = ?").bind(key, now(), mem.id).run();
    }
    return jsonRes({ ok: true });
  }

  // gallery photo (public: every uploaded photo shows on its owner's public profile)
  if (method === "GET" && (m = path.match(/^\/api\/gallery\/photo\/([0-9a-f-]{36})$/))) {
    if (!env.GALLERY) throw new HttpError(503, "Gallery storage is not set up");
    const got = await env.GALLERY.getWithMetadata("g/" + m[1], { type: "stream" });
    if (!got || !got.value) throw new HttpError(404, "Not found");
    return new Response(got.value, { headers: { "Content-Type": (got.metadata && got.metadata.ct) || "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  }

  // my gallery: up to 5 photos
  if (path === "/api/me/gallery" && method === "GET") {
    const user = await requireUser(req, env);
    const mem = await findMember(env, user);
    if (!mem) return jsonRes({ photos: [], max: MAX_GALLERY }, 200, { "Cache-Control": "no-store" });
    const { results } = await env.DB.prepare("SELECT id, created_at FROM gallery WHERE member_id = ? ORDER BY created_at").bind(mem.id).all();
    return jsonRes({ max: MAX_GALLERY, photos: results.map((g) => ({ id: g.id, url: url.origin + "/api/gallery/photo/" + g.id, created_at: g.created_at })) }, 200, { "Cache-Control": "no-store" });
  }
  if (path === "/api/me/gallery" && method === "POST") {
    const user = await requireUser(req, env);
    const mem = await findMember(env, user);
    if (!mem || mem.status !== "approved") throw new HttpError(403, "You can add photos once your profile is approved");
    if (!env.GALLERY) throw new HttpError(503, "Gallery storage is not set up");
    const have = await env.DB.prepare("SELECT count(*) AS n FROM gallery WHERE member_id = ?").bind(mem.id).first();
    if (have.n >= MAX_GALLERY) throw new HttpError(409, "You can add up to " + MAX_GALLERY + " photos. Delete one to add another.");
    const bytes = await req.arrayBuffer();
    if (!bytes.byteLength) throw new HttpError(400, "No photo received");
    if (bytes.byteLength > MAX_GALLERY_BYTES) throw new HttpError(413, "Photo must be under 200 KB");
    const type = imageType(bytes);
    if (!type) throw new HttpError(415, "Use a JPG, PNG or WebP photo");
    const id = crypto.randomUUID();
    await env.GALLERY.put("g/" + id, bytes, { metadata: { ct: type[0] } });
    await env.DB.prepare("INSERT INTO gallery (id, member_id, status, bytes, created_at) VALUES (?, ?, 'new', ?, ?)").bind(id, mem.id, bytes.byteLength, now()).run();
    await touched(env, url, [mem.batch]);
    return jsonRes({ ok: true, id, url: url.origin + "/api/gallery/photo/" + id });
  }
  if (method === "DELETE" && (m = path.match(/^\/api\/me\/gallery\/([0-9a-f-]{36})$/))) {
    const user = await requireUser(req, env);
    const mem = await findMember(env, user);
    const g = mem && await env.DB.prepare("SELECT id FROM gallery WHERE id = ? AND member_id = ?").bind(m[1], mem.id).first();
    if (!g) throw new HttpError(404, "Not found");
    await dropGalleryPhoto(env, g.id);
    await touched(env, url, [mem.batch]);
    return jsonRes({ ok: true });
  }

  // review: admins moderate; core members may only read
  if (path.startsWith("/api/review/gallery")) {
    const user = await requireUser(req, env);
    const role = await roleOf(env, user);
    if (!canSeeContacts(role)) throw new HttpError(403, "Only admins and core members can view photo review");
    if (method !== "GET" && !isAdminRole(role)) throw new HttpError(403, "Only admins can moderate photos");
    if (path === "/api/review/gallery" && method === "GET") {
      const st = url.searchParams.get("status");
      const yr = Number(url.searchParams.get("batch")) || 0;
      const where = [], args = [];
      if (["new", "approved", "rejected"].includes(st)) { where.push("g.status = ?"); args.push(st); }
      if (yr) { where.push("m.batch = ?"); args.push(yr); }
      const { results } = await env.DB.prepare(
        "SELECT g.id, g.status, g.created_at, m.id AS member_id, m.name, m.batch FROM gallery g JOIN members m ON m.id = g.member_id" +
        (where.length ? " WHERE " + where.join(" AND ") : "") + " ORDER BY g.created_at DESC LIMIT 400"
      ).bind(...args).all();
      const c = (await env.DB.prepare("SELECT status, count(*) AS n FROM gallery GROUP BY status").all()).results || [];
      const counts = { new: 0, approved: 0, rejected: 0 };
      for (const r of c) counts[r.status] = r.n;
      return jsonRes({ counts, photos: results.map((g) => ({ ...g, url: url.origin + "/api/gallery/photo/" + g.id })) }, 200, { "Cache-Control": "no-store" });
    }
    if ((m = path.match(/^\/api\/review\/gallery\/([0-9a-f-]{36})\/(approve|reject)$/)) && method === "POST") {
      const g = await env.DB.prepare("SELECT g.id, m.batch FROM gallery g JOIN members m ON m.id = g.member_id WHERE g.id = ?").bind(m[1]).first();
      if (!g) throw new HttpError(404, "Not found");
      await env.DB.prepare("UPDATE gallery SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").bind(m[2] === "approve" ? "approved" : "rejected", user.email, now(), g.id).run();
      await touched(env, url, [g.batch]);
      return jsonRes({ ok: true });
    }
    if ((m = path.match(/^\/api\/review\/gallery\/([0-9a-f-]{36})$/)) && method === "DELETE") {
      if (!isAdminRole(role)) throw new HttpError(403, "Only admins can delete photos");
      const g = await env.DB.prepare("SELECT g.id, m.batch FROM gallery g JOIN members m ON m.id = g.member_id WHERE g.id = ?").bind(m[1]).first();
      if (!g) throw new HttpError(404, "Not found");
      await dropGalleryPhoto(env, g.id);
      await touched(env, url, [g.batch]);
      return jsonRes({ ok: true });
    }
  }

  // admin
  if (path.startsWith("/api/admin/")) {
    const me = await requireAdmin(req, env);

    if (path === "/api/admin/list" && method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM members ORDER BY updated_at DESC LIMIT 2000").all();
      return jsonRes({ members: results.map(toRow) }, 200, { "Cache-Control": "no-store" });
    }

    // sends the pending-approvals email now, so it can be tested without waiting for 4 pm
    if (path === "/api/admin/pending-mail" && method === "POST") {
      return jsonRes(await notifyPending(env), 200, { "Cache-Control": "no-store" });
    }

    // owners (from settings, cannot be removed), admins and core members
    if (path === "/api/admin/roles" && method === "GET") {
      const { results } = await env.DB.prepare("SELECT email, role, note, created_at FROM roles ORDER BY role, email").all();
      return jsonRes({ owners: owners(env), roles: results }, 200, { "Cache-Control": "no-store" });
    }
    if (path === "/api/admin/roles" && method === "POST") {
      let body;
      try { body = await req.json(); } catch { throw new HttpError(400, "Send JSON"); }
      const email = String((body && body.email) || "").toLowerCase().trim();
      const role = body && body.role;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email");
      if (!["admin", "core"].includes(role)) throw new HttpError(400, "Role must be admin or core");
      if (owners(env).includes(email)) throw new HttpError(400, "That email is an owner already");
      await env.DB.prepare("INSERT INTO roles (email, role, note, added_by, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET role = excluded.role, note = excluded.note")
        .bind(email, role, text(body.note, 120), me.email, now()).run();
      await bumpVer(env);
      return jsonRes({ ok: true });
    }
    if (method === "DELETE" && (m = path.match(/^\/api\/admin\/roles\/(.+)$/))) {
      const email = decodeURIComponent(m[1]).toLowerCase().trim();
      if (owners(env).includes(email)) throw new HttpError(400, "An owner cannot be removed here");
      await env.DB.prepare("DELETE FROM roles WHERE email = ?").bind(email).run();
      await bumpVer(env);
      return jsonRes({ ok: true });
    }

    if (method === "GET" && (m = path.match(/^\/api\/admin\/photo\/((?:pending|live)\/[A-Za-z0-9._-]+)$/))) {
      return photoResponse(env, m[1], "private, no-store");
    }

    if (method === "GET" && (m = path.match(/^\/api\/admin\/export\/(\d{4})$/))) {
      const level = url.searchParams.get("level") === "public" ? "public" : "full";
      const { results } = await env.DB.prepare("SELECT * FROM members WHERE status = 'approved' AND batch = ? ORDER BY name COLLATE NOCASE").bind(Number(m[1])).all();
      const when = new Date().toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
      const body = "const date = ['" + when + "'];\nconst all = " + JSON.stringify(results.map((r) => entryOf(r, level, url.origin)), null, 4) + "\n";
      return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    }

    if ((m = path.match(/^\/api\/admin\/([0-9a-f-]{36})(?:\/(approve|reject|undo|merge))?$/))) {
      const id = m[1];
      const mem = await env.DB.prepare("SELECT * FROM members WHERE id = ?").bind(id).first();
      if (!mem) throw new HttpError(404, "Not found");

      if (m[2] === "approve" && method === "POST") {
        if (!mem.draft && !mem.draft_photo) throw new HttpError(400, "Nothing to approve");
        const base = mem.status === "approved" ? parse(mem.data) || {} : {};
        const { data, errors } = clean({ ...base, ...(parse(mem.draft) || {}) }, mem.email);
        if (errors.length) throw new HttpError(400, errors.join(". "));
        keepLegacy(base, data);
        const photo = mem.draft_photo ? await promotePhoto(env, mem) : mem.photo;
        await env.DB.prepare(
          "UPDATE members SET data = ?, prev = ?, batch = ?, name = ?, photo = ?, draft = NULL, draft_photo = NULL, status = 'approved', updated_at = ? WHERE id = ?"
        ).bind(JSON.stringify(data), mem.status === "approved" ? mem.data : mem.prev, data.Batch, data.Name, photo, now(), id).run();
        await touched(env, url, [mem.batch, data.Batch]);
        return jsonRes({ ok: true });
      }

      if (m[2] === "reject" && method === "POST") {
        await dropPhoto(env, mem.draft_photo);
        const hasLive = mem.status === "approved";
        await env.DB.prepare("UPDATE members SET draft = NULL, draft_photo = NULL, status = ?, updated_at = ? WHERE id = ?")
          .bind(hasLive ? "approved" : "rejected", now(), id).run();
        return jsonRes({ ok: true });
      }

      if (m[2] === "undo" && method === "POST") {
        if (!mem.prev) throw new HttpError(400, "Nothing to undo");
        const back = parse(mem.prev) || {};
        await env.DB.prepare("UPDATE members SET data = ?, prev = NULL, batch = ?, name = ?, updated_at = ? WHERE id = ?")
          .bind(mem.prev, back.Batch || mem.batch, back.Name || mem.name, now(), id).run();
        await touched(env, url, [mem.batch, back.Batch || mem.batch]);
        return jsonRes({ ok: true });
      }

      // a new sign-up that really is an existing alumnus (different Gmail): fold it into that entry
      if (m[2] === "merge" && method === "POST") {
        let body;
        try { body = await req.json(); } catch { throw new HttpError(400, "Send JSON"); }
        const target = await env.DB.prepare("SELECT * FROM members WHERE id = ?").bind(String(body && body.target)).first();
        if (!target || target.id === mem.id) throw new HttpError(400, "Pick the existing alumnus to link to");
        if (mem.status === "approved") throw new HttpError(400, "Only a new sign-up can be linked");
        if (target.sub) throw new HttpError(409, "That entry already belongs to another Google account");
        const tdata = parse(target.data) || {};
        const { data, errors } = clean({ ...tdata, ...(parse(mem.draft) || {}), Name: tdata.Name || target.name, Batch: target.batch }, mem.email);
        if (errors.length) throw new HttpError(400, errors.join(". "));
        keepLegacy(tdata, data);
        const sub = mem.sub, email = mem.email, draftPhoto = mem.draft_photo;
        // Keep ownership and registration references together if any statement fails.
        await env.DB.batch([
          env.DB.prepare("DELETE FROM members WHERE id = ?").bind(mem.id),
          env.DB.prepare("UPDATE members SET sub = ?, email = ?, data = ?, prev = ?, updated_at = ? WHERE id = ?")
            .bind(sub, email, JSON.stringify(data), target.data, now(), target.id),
          env.DB.prepare("UPDATE meet2026 SET member_id = ? WHERE member_id = ?")
            .bind(target.id, mem.id),
        ]);
        if (draftPhoto) {
          const moved = await promotePhoto(env, { ...target, draft_photo: draftPhoto });
          await env.DB.prepare("UPDATE members SET photo = ? WHERE id = ?").bind(moved, target.id).run();
        }
        await touched(env, url, [target.batch]);
        return jsonRes({ ok: true });
      }

      if (!m[2] && method === "GET") return jsonRes({ member: toRow(mem) }, 200, { "Cache-Control": "no-store" });

      if (!m[2] && method === "PUT") {
        let body;
        try { body = await req.json(); } catch { throw new HttpError(400, "Send JSON"); }
        const { data, errors } = clean(body && body.data, mem.email);
        if (errors.length) throw new HttpError(400, errors.join(". "));
        const email = body.email ? String(body.email).toLowerCase().trim() : mem.email;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Email is not valid");
        const dup = await env.DB.prepare("SELECT id FROM members WHERE email = ? AND id <> ?").bind(email, id).first();
        if (dup) throw new HttpError(409, "Another entry already uses that email");
        if (mem.status !== "approved") {
          await env.DB.prepare("UPDATE members SET draft = ?, email = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(data), email, now(), id).run();
        } else {
          keepLegacy(parse(mem.data) || {}, data);
          if (body && body.data && body.data.ppl) data.ppl = text(body.data.ppl, 80);
          await env.DB.prepare("UPDATE members SET data = ?, prev = ?, batch = ?, name = ?, email = ?, updated_at = ? WHERE id = ?")
            .bind(JSON.stringify(data), mem.data, data.Batch, data.Name, email, now(), id).run();
          await touched(env, url, [mem.batch, data.Batch]);
        }
        return jsonRes({ ok: true });
      }

      if (!m[2] && method === "DELETE") {
        for (const k of [mem.photo, mem.draft_photo]) await dropPhoto(env, k);
        const gs = (await env.DB.prepare("SELECT id FROM gallery WHERE member_id = ?").bind(mem.id).all()).results || [];
        for (const g of gs) await dropGalleryPhoto(env, g.id);
        await env.DB.prepare("DELETE FROM members WHERE id = ?").bind(id).run();
        await touched(env, url, [mem.batch]);
        return jsonRes({ ok: true });
      }
    }
  }

  throw new HttpError(404, "Not found");
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(notifyPending(env).then((r) => console.log("pending mail:", JSON.stringify(r))).catch((e) => console.error("pending mail error", e)));
  },
  async fetch(req, env) {
    const cors = corsHeaders(req.headers.get("Origin"), env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      res = await route(req, new URL(req.url), env);
    } catch (e) {
      if (e instanceof HttpError) res = jsonRes({ error: e.message }, e.status);
      else { console.error(e); res = jsonRes({ error: "Server error" }, 500); }
    }
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
