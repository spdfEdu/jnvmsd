import {readJson} from './http.js';
/** Normalize an optional timestamp and require an explicit timezone. */
function dateValue(value,h){if(value==null||value==='')return null;if(typeof value!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw new h.HttpError(400,'Use an ISO date with timezone');return new Date(value).toISOString();}
/** Validate event publication and schedule fields before persistence. */
function eventInput(body,h){const title=h.text(body.title,120),status=body.status||'draft';if(title.length<2||!['draft','published','closed'].includes(status))throw new h.HttpError(400,'Provide a title and valid status');const starts_at=dateValue(body.starts_at,h),ends_at=dateValue(body.ends_at,h),registration_deadline=dateValue(body.registration_deadline,h);if(ends_at&&(!starts_at||ends_at<starts_at)||registration_deadline&&starts_at&&registration_deadline>starts_at)throw new h.HttpError(400,'Check event dates and registration deadline');return {title,description:h.text(body.description,3000),venue:h.text(body.venue,200),starts_at,ends_at,registration_deadline,status};}
/** Serve public events, own registrations, and privileged organizer views. */
export async function eventsRoute(req,url,env,h){
  const path=url.pathname.replace(/\/+$/,''),method=req.method;
  if(!path.startsWith('/api/events')&&!path.startsWith('/api/admin/events'))return null;
  const {jsonRes,requireAdmin,requireUser,roleOf,canSeeContacts,HttpError,now}=h,privateHeaders={'Cache-Control':'private, no-store'};
  let m;
  if(path==='/api/events'&&method==='GET')return jsonRes({events:(await env.DB.prepare("SELECT * FROM events WHERE status<>'draft' ORDER BY starts_at,created_at").all()).results},200,{'Cache-Control':'no-store'});
  if(path.startsWith('/api/admin/events')){
    await requireAdmin(req,env);
    if(path==='/api/admin/events'&&method==='GET')return jsonRes({events:(await env.DB.prepare('SELECT * FROM events ORDER BY created_at DESC').all()).results},200,privateHeaders);
    m=path.match(/^\/api\/admin\/events(?:\/([\w-]+))?$/);
    if(m&&(method==='POST'&&!m[1]||method==='PUT'&&m[1])){
      const data=eventInput(await readJson(req,HttpError),h),id=m[1]||crypto.randomUUID();
      if(m[1]&&!await env.DB.prepare('SELECT id FROM events WHERE id=?').bind(id).first())throw new HttpError(404,'Event not found');
      await env.DB.prepare('INSERT INTO events(id,title,description,venue,starts_at,ends_at,registration_deadline,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,venue=excluded.venue,starts_at=excluded.starts_at,ends_at=excluded.ends_at,registration_deadline=excluded.registration_deadline,status=excluded.status,updated_at=excluded.updated_at').bind(id,data.title,data.description,data.venue,data.starts_at,data.ends_at,data.registration_deadline,data.status,now(),now()).run();
      return jsonRes({event:{id,...data}},m[1]?200:201,privateHeaders);
    }throw new HttpError(405,'Method not allowed');
  }
  m=path.match(/^\/api\/events\/([\w-]+)(?:\/(registration|registrations))?$/);if(!m)throw new HttpError(404,'Not found');
  const event=await env.DB.prepare('SELECT * FROM events WHERE id=?').bind(m[1]).first();if(!event||event.status==='draft')throw new HttpError(404,'Event not found');
  if(!m[2]&&method==='GET')return jsonRes({event},200,{'Cache-Control':'no-store'});
  const user=await requireUser(req,env);
  if(m[2]==='registrations'&&method==='GET'){
    if(!canSeeContacts(await roleOf(env,user)))throw new HttpError(403,'Organizers only');
    if(event.id==='meet2026')return h.route(req,new URL('/api/meet/responses',url),env);
    return jsonRes({registrations:(await env.DB.prepare('SELECT * FROM event_registrations WHERE event_id=? ORDER BY name').bind(event.id).all()).results},200,privateHeaders);
  }
  if(m[2]==='registration'){
    if(method==='PUT'&&(event.status!=='published'||event.registration_deadline&&Date.parse(event.registration_deadline)<=Date.now()))throw new HttpError(409,'Registration is closed');
    if(event.id==='meet2026')return h.route(req,new URL('/api/meet/me',url),env);
    if(method==='GET')return jsonRes({registration:await env.DB.prepare('SELECT * FROM event_registrations WHERE event_id=? AND sub=?').bind(event.id,user.sub).first()},200,privateHeaders);
    if(method==='PUT'){
      const b=await readJson(req,HttpError),name=h.text(b.name,80),phone=h.phoneOf(b.phone),attend=b.attend,companions=b.companions??0;
      if(name.length<2||!phone||!['Yes','No'].includes(attend)||!Number.isInteger(companions)||companions<0||companions>10)throw new HttpError(400,'Provide valid name, phone, attendance and companion count');
      const result=await env.DB.prepare("INSERT INTO event_registrations(event_id,sub,email,name,phone,attend,companions,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM events WHERE id=? AND status='published' AND (registration_deadline IS NULL OR registration_deadline>?)) ON CONFLICT(event_id,sub) DO UPDATE SET email=excluded.email,name=excluded.name,phone=excluded.phone,attend=excluded.attend,companions=excluded.companions,updated_at=excluded.updated_at").bind(event.id,user.sub,user.email,name,String(phone),attend,attend==='Yes'?companions:0,now(),now(),event.id,new Date().toISOString()).run();
      if(!result.meta.changes)throw new HttpError(409,'Registration is closed');return jsonRes({ok:true},200,privateHeaders);
    }
  }throw new HttpError(405,'Method not allowed');
}
