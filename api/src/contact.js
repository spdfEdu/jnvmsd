import {readJson} from './http.js';
import {rateLimit,verifyChallenge} from './abuse.js';
/** Accept bounded contact messages and expose their inbox/status only to administrators. */
export async function contactRoute(req,url,env,h){const path=url.pathname.replace(/\/+$/,''),method=req.method;
 if(path!=='/api/contact'&&!path.startsWith('/api/admin/contact'))return null;
 if(path==='/api/contact'&&method==='POST'){
  const b=await readJson(req,h.HttpError),name=h.text(b.name,80),email=h.text(b.email,160),message=h.text(b.message,3000);
  if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||message.length<10||String(b.message||'').length>3000||b.website)throw new h.HttpError(400,'Provide your name, email, and a message of 10–3000 characters');
  await rateLimit(req,url,env,h,'contact',3,3600);await verifyChallenge(b,url,env,h);
  await env.DB.prepare('INSERT INTO contact_messages(id,name,email,message,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),name,email,message,h.now()).run();return h.jsonRes({ok:true},201,{'Cache-Control':'no-store'});
 }
 await h.requireAdmin(req,env);
 if(path==='/api/admin/contact'&&method==='GET')return h.jsonRes({messages:(await env.DB.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 500').all()).results},200,{'Cache-Control':'private, no-store'});
 const match=path.match(/^\/api\/admin\/contact\/([\w-]+)$/);
 if(match&&method==='PUT'){const b=await readJson(req,h.HttpError);if(!['new','read','resolved'].includes(b.status))throw new h.HttpError(400,'Invalid status');const r=await env.DB.prepare('UPDATE contact_messages SET status=? WHERE id=?').bind(b.status,match[1]).run();if(!r.meta.changes)throw new h.HttpError(404,'Message not found');return h.jsonRes({ok:true});}
 throw new h.HttpError(405,'Method not allowed');}
