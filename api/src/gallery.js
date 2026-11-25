import { readBytes } from './http.js';
/** Remove queued gallery objects after metadata withdrawal; failures remain queued for retry. */
export async function cleanupGallery(env) {
  if (!env.GALLERY) return;
  const { results } = await env.DB.prepare('SELECT id FROM gallery_cleanup ORDER BY created_at LIMIT 100').all();
  for (const row of results) {
    try { await env.GALLERY.delete('g/' + row.id); await env.DB.prepare('DELETE FROM gallery_cleanup WHERE id=?').bind(row.id).run(); }
    catch (error) { console.error('Gallery cleanup failed', row.id, error); }
  }
}

/** Withdraw public metadata atomically before attempting to delete a KV object. */
export async function removeGallery(env, id, historical = false) {
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO gallery_cleanup(id,created_at) VALUES (?,?)').bind(id, Math.floor(Date.now()/1000)),
    env.DB.prepare(historical ? 'DELETE FROM batch_photos WHERE id=?' : 'DELETE FROM gallery WHERE id=?').bind(id),
  ]);
  await cleanupGallery(env);
}

/** Validate bounded image bytes and return their MIME type before storage writes. */
async function readImage(req, h) {
  const bytes = await readBytes(req, 230*1024, h.HttpError);
  if (!bytes.byteLength || bytes.byteLength > 230*1024) throw new h.HttpError(413, 'Photo must be between 1 byte and 230 KB');
  const type = h.imageType(bytes);
  if (!type) throw new h.HttpError(415, 'Use a JPG, PNG or WebP photo');
  return {bytes, type};
}

/** Route gallery reads and writes with ownership, moderation, and atomic upload quotas. */
export async function galleryRoute(req, url, env, h) {
  const path=url.pathname.replace(/\/+$/, ''), method=req.method;
  const relevant=path==='/api/gallery'||path.startsWith('/api/gallery/photo/')||path.startsWith('/api/me/gallery')||path.startsWith('/api/review/gallery')||path.startsWith('/api/admin/batch-photos');
  if(!relevant) return null;
  const {jsonRes,requireUser,requireAdmin,roleOf,isAdminRole,canSeeContacts,findMember,touched,now,text,HttpError}=h;
  const noStore={'Cache-Control':'private, no-store'};
  let match;
  if(method==='GET'&&(match=path.match(/^\/api\/gallery\/photo\/([0-9a-f-]{36})$/))){
    const id=match[1];
    const photo=await env.DB.prepare('SELECT g.*, m.sub, m.email, m.status AS member_status FROM gallery g JOIN members m ON m.id=g.member_id WHERE g.id=?').bind(id).first();
    const historic=photo?null:await env.DB.prepare('SELECT id FROM batch_photos WHERE id=?').bind(id).first();
    if(!photo&&!historic) throw new HttpError(404,'Not found');
    if(photo&&(photo.status!=='approved'||photo.member_status!=='approved')){
      if(!req.headers.has('Authorization'))throw new HttpError(404,'Not found');
      const user=await requireUser(req,env), member=await findMember(env,user);
      if(member?.id!==photo.member_id&&!canSeeContacts(await roleOf(env,user)))throw new HttpError(404,'Not found');
    }
    if(!env.GALLERY)throw new HttpError(503,'Gallery storage is not configured');
    const got=await env.GALLERY.getWithMetadata('g/'+id,{type:'stream'});
    if(!got?.value)throw new HttpError(404,'Not found');
    return new Response(got.value,{headers:{'Content-Type':got.metadata?.ct||'image/webp','Cache-Control':'no-store'}});
  }
  if(path==='/api/gallery'&&method==='GET'){
    const batch=Number(url.searchParams.get('batch'))||null;
    const {results}=await env.DB.prepare("SELECT g.id,m.batch,g.caption,g.created_at FROM gallery g JOIN members m ON m.id=g.member_id WHERE g.status='approved' AND m.status='approved' AND (? IS NULL OR m.batch=?) UNION ALL SELECT id,batch,caption,created_at FROM batch_photos WHERE (? IS NULL OR batch=?) ORDER BY created_at DESC LIMIT 500").bind(batch,batch,batch,batch).all();
    return jsonRes({photos:results.map(p=>({...p,url:url.origin+'/api/gallery/photo/'+p.id}))},200,{'Cache-Control':'no-store'});
  }
  if(path==='/api/me/gallery'&&method==='GET'){
    const member=await findMember(env,await requireUser(req,env));
    const photos=member?(await env.DB.prepare('SELECT id,status,caption,created_at FROM gallery WHERE member_id=? ORDER BY created_at').bind(member.id).all()).results:[];
    return jsonRes({max:5,photos:photos.map(p=>({...p,url:url.origin+'/api/gallery/photo/'+p.id}))},200,noStore);
  }
  if((path==='/api/me/gallery'||path==='/api/admin/batch-photos')&&method==='POST'){
    const historical=path.includes('/admin/');
    const user=historical?await requireAdmin(req,env):await requireUser(req,env);
    const member=historical?null:await findMember(env,user);
    if(!historical&&member?.status!=='approved')throw new HttpError(403,'Profile approval is required');
    const batch=historical?Number(url.searchParams.get('batch')):member.batch;
    if(!Number.isInteger(batch)||batch<2008||batch>2100)throw new HttpError(400,'Choose a valid batch year');
    if(!env.GALLERY)throw new HttpError(503,'Gallery storage is not configured');
    const {bytes,type}=await readImage(req,h), id=crypto.randomUUID(), caption=text(url.searchParams.get('caption'),200);
    const result=historical
      ? await env.DB.prepare('INSERT INTO batch_photos(id,batch,caption,bytes,created_at,added_by) VALUES (?,?,?,?,?,?)').bind(id,batch,caption,bytes.byteLength,now(),user.email).run()
      : await env.DB.prepare("INSERT INTO gallery(id,member_id,status,bytes,created_at,caption) SELECT ?,?,'new',?,?,? WHERE (SELECT COUNT(*) FROM gallery WHERE member_id=?)<5").bind(id,member.id,bytes.byteLength,now(),caption,member.id).run();
    if(!result.meta.changes)throw new HttpError(409,'You can upload up to five photos');
    try{await env.GALLERY.put('g/'+id,bytes,{metadata:{ct:type[0]}});}
    catch(error){await removeGallery(env,id,historical);throw new HttpError(503,'Upload failed; please retry');}
    const retained = await env.DB.prepare(historical ? 'SELECT id FROM batch_photos WHERE id=?' : 'SELECT id FROM gallery WHERE id=?').bind(id).first();
    if (!retained) { await removeGallery(env, id, historical); throw new HttpError(409, 'Upload was deleted before it completed'); }
    await touched(env,url,[batch]);
    return jsonRes({ok:true,id,url:url.origin+'/api/gallery/photo/'+id},200,noStore);
  }
  if(method==='DELETE'&&(match=path.match(/^\/api\/(me\/gallery|admin\/batch-photos)\/([0-9a-f-]{36})$/))){
    const historical=match[1].startsWith('admin'), user=historical?await requireAdmin(req,env):await requireUser(req,env);
    const member=historical?null:await findMember(env,user);
    const row=historical?await env.DB.prepare('SELECT batch FROM batch_photos WHERE id=?').bind(match[2]).first():member&&await env.DB.prepare('SELECT id FROM gallery WHERE id=? AND member_id=?').bind(match[2],member.id).first();
    if(!row)throw new HttpError(404,'Not found');
    await removeGallery(env,match[2],historical);await touched(env,url,[historical?row.batch:member.batch]);return jsonRes({ok:true});
  }
  if(path.startsWith('/api/review/gallery')){
    const user=await requireUser(req,env),role=await roleOf(env,user);
    if(!canSeeContacts(role)||method!=='GET'&&!isAdminRole(role))throw new HttpError(403,'Administrators manage gallery approvals');
    if(path==='/api/review/gallery'&&method==='GET'){
      const status=url.searchParams.get('status'), batch=Number(url.searchParams.get('batch'))||null;
      const {results}=await env.DB.prepare('SELECT g.*,m.name,m.batch FROM gallery g JOIN members m ON m.id=g.member_id WHERE (? IS NULL OR g.status=?) AND (? IS NULL OR m.batch=?) ORDER BY g.created_at DESC LIMIT 400').bind(status,status,batch,batch).all();
      const counts={new:0,approved:0,rejected:0};for(const row of (await env.DB.prepare('SELECT status,count(*) AS n FROM gallery GROUP BY status').all()).results)counts[row.status]=row.n;
      return jsonRes({counts,photos:results.map(p=>({...p,url:url.origin+'/api/gallery/photo/'+p.id}))},200,noStore);
    }
    match=path.match(/^\/api\/review\/gallery\/([0-9a-f-]{36})(?:\/(approve|reject))?$/);
    if(match){const row=await env.DB.prepare('SELECT g.id,m.batch FROM gallery g JOIN members m ON m.id=g.member_id WHERE g.id=?').bind(match[1]).first();if(!row)throw new HttpError(404,'Not found');
      if(method==='POST'&&match[2])await env.DB.prepare('UPDATE gallery SET status=?,reviewed_by=?,reviewed_at=? WHERE id=?').bind(match[2]==='approve'?'approved':'rejected',user.email,now(),row.id).run();
      else if(method==='DELETE'&&!match[2])await removeGallery(env,row.id);else throw new HttpError(405,'Method not allowed');
      await touched(env,url,[row.batch]);return jsonRes({ok:true});
    }
  }
  throw new HttpError(404,'Not found');
}
