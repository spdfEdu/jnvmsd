import {readJson} from './http.js';
import {rateLimit} from './abuse.js';
/** Count approximate daily browser visits, deduplicating hashes without retaining raw identifiers. */
export async function visitsRoute(req,url,env,h){const path=url.pathname.replace(/\/+$/,'');
 if(path==='/api/visits/count'&&req.method==='GET')return h.jsonRes({count:(await env.DB.prepare('SELECT count FROM visitor_totals WHERE id=1').first()).count,label:'Daily browser visits'},200,{'Cache-Control':'no-store'});
 if(path!=='/api/visits')return null;if(req.method!=='POST')throw new h.HttpError(405,'Method not allowed');
 const b=await readJson(req,h.HttpError);if(typeof b.visitor_id!=='string'||!/^[0-9a-f-]{36}$/.test(b.visitor_id))throw new h.HttpError(400,'Invalid visitor identifier');
 await rateLimit(req,url,env,h,'visit',60,3600);
 const day=new Date().toISOString().slice(0,10),hash=await h.sha256Hex((env.RATE_LIMIT_SECRET||'local-only')+':'+day+':'+b.visitor_id);
 await env.DB.batch([env.DB.prepare('INSERT OR IGNORE INTO visitor_daily(day,visitor_hash) VALUES (?,?)').bind(day,hash),env.DB.prepare('UPDATE visitor_totals SET count=count+1 WHERE id=1 AND changes()>0'),env.DB.prepare('DELETE FROM visitor_daily WHERE day<?').bind(new Date(Date.now()-2*86400000).toISOString().slice(0,10))]);
 return h.jsonRes({ok:true},200,{'Cache-Control':'no-store'});}
