import assert from 'node:assert/strict';
import {test} from 'node:test';
import {runtime,migrate,seedSession} from './helpers.js';
const bytes=new Uint8Array([0x89,0x50,0x4e,0x47,0,0,0,0,0,0,0,0]);
/** Create approved owners and real local bindings for gallery permission checks. */
async function setup(t){const {mf,db}=await runtime(t);await migrate(db);await db.prepare("INSERT INTO members(id,sub,email,batch,name,data,status,created_at,updated_at) VALUES ('member','student-sub','student@example.test',2015,'Student','{}','approved',1,1)").run();return {mf,db,headers:await seedSession(db,'student@example.test','student-sub'),admin:await seedSession(db,'admin@example.test','admin-sub')};}
/** Upload a small image through the same endpoint used by member profiles. */
async function upload(mf,headers){return mf.dispatchFetch('http://localhost/api/me/gallery',{method:'POST',headers,body:bytes});}

test('pending and rejected photos are private while approval publishes and rejection withdraws them',async t=>{const {mf,headers,admin}=await setup(t);const created=await upload(mf,headers);assert.equal(created.status,200);const {id}=await created.json();const url='http://localhost/api/gallery/photo/'+id;assert.equal((await mf.dispatchFetch(url)).status,404);assert.equal((await mf.dispatchFetch(url,{headers})).status,200);let batch=await (await mf.dispatchFetch('http://localhost/api/batch/2015')).json();assert.equal(batch.entries[0].gallery,undefined);assert.equal((await mf.dispatchFetch(`http://localhost/api/review/gallery/${id}/approve`,{method:'POST',headers:admin})).status,200);const publicPhoto=await mf.dispatchFetch(url);assert.equal(publicPhoto.status,200);assert.match(publicPhoto.headers.get('Cache-Control'),/no-store/);assert.equal((await mf.dispatchFetch(`http://localhost/api/review/gallery/${id}/reject`,{method:'POST',headers:admin})).status,200);assert.equal((await mf.dispatchFetch(url)).status,404);});

test('simultaneous uploads cannot exceed five photos per member',async t=>{const {mf,db,headers}=await setup(t);const responses=await Promise.all(Array.from({length:8},()=>upload(mf,headers)));assert.equal(responses.filter(r=>r.status===200).length,5);assert.equal(responses.filter(r=>r.status===409).length,3);assert.equal((await db.prepare('SELECT count(*) AS n FROM gallery').first()).n,5);});

test('gallery rejects invalid and oversized files and enforces delete ownership',async t=>{const {mf,headers,db}=await setup(t);assert.equal((await mf.dispatchFetch('http://localhost/api/me/gallery',{method:'POST',headers,body:'not an image'})).status,415);assert.equal((await mf.dispatchFetch('http://localhost/api/me/gallery',{method:'POST',headers,body:new Uint8Array(240*1024)})).status,413);const {id}=await (await upload(mf,headers)).json();const other=await seedSession(db,'other@example.test','other-sub');assert.equal((await mf.dispatchFetch('http://localhost/api/me/gallery/'+id,{method:'DELETE',headers:other})).status,404);assert.equal((await mf.dispatchFetch('http://localhost/api/me/gallery/'+id,{method:'DELETE',headers})).status,200);assert.equal((await mf.dispatchFetch('http://localhost/api/gallery/photo/'+id,{headers})).status,404);});

test('admin adds historical batch photos without a member account',async t=>{const {mf,admin,headers}=await setup(t);const url='http://localhost/api/admin/batch-photos?batch=2010&caption=School%20reunion';assert.equal((await mf.dispatchFetch(url,{method:'POST',headers,body:bytes})).status,403);const res=await mf.dispatchFetch(url,{method:'POST',headers:admin,body:bytes});assert.equal(res.status,200);const photo=await res.json();const listing=await (await mf.dispatchFetch('http://localhost/api/gallery?batch=2010')).json();assert.equal(listing.photos[0].caption,'School reunion');assert.equal(listing.photos[0].batch,2010);assert.equal((await mf.dispatchFetch(photo.url)).status,200);assert.equal((await mf.dispatchFetch('http://localhost/api/admin/batch-photos/'+photo.id,{method:'DELETE',headers:admin})).status,200);assert.equal((await mf.dispatchFetch(photo.url)).status,404);});

import {galleryRoute,removeGallery} from '../src/gallery.js';
/** Hold only the external KV write to reproduce deletion during an in-flight upload. */
test('deletion during a delayed KV upload leaves no orphan object',async t=>{
 const {db}=await setup(t);let release,started;
 const pending=new Promise(resolve=>{release=resolve;}),ready=new Promise(resolve=>{started=resolve;});const objects=new Map();
 const env={DB:db,GALLERY:{async put(key,value){started();await pending;objects.set(key,value);},async delete(key){objects.delete(key);}}};
 class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
 const h={HttpError,jsonRes:(o,s=200)=>Response.json(o,{status:s}),requireUser:async()=>({email:'student@example.test'}),findMember:async()=>({id:'member',batch:2015,status:'approved'}),now:()=>1,text:v=>v||'',imageType:()=>['image/png','png'],touched:async()=>{}};
 const response=galleryRoute(new Request('http://localhost/api/me/gallery',{method:'POST',body:bytes}),new URL('http://localhost/api/me/gallery'),env,h);
 await ready;const row=await db.prepare('SELECT id FROM gallery').first();await removeGallery(env,row.id);release();
 await assert.rejects(response,error=>error.status===409);assert.equal(objects.size,0);assert.equal((await db.prepare('SELECT count(*) AS n FROM gallery_cleanup').first()).n,0);
});
