import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime, migrate, seedSession } from './helpers.js';

const memberId = '11111111-1111-4111-8111-111111111111';
const galleryId = '22222222-2222-4222-8222-222222222222';
async function setup(t) {
  const { mf, db } = await runtime(t);
  await migrate(db);
  const data = { Name: 'Test Student', Batch: 2015, EmailId: 'private@example.test', Phone: 9876543210, Phone2: 9876543211, Address: 'Private address', DOB: '2000-01-01', PinCode: 742101, internalNote: 'never public' };
  await db.prepare("INSERT INTO members (id,sub,email,batch,name,data,status,created_at,updated_at) VALUES (?, 'student-sub','student@example.test',2015,'Test Student',?,'approved',1,1)").bind(memberId, JSON.stringify(data)).run();
  await db.prepare("INSERT INTO gallery (id,member_id,status,bytes,created_at) VALUES (?,?,'new',3,1)").bind(galleryId,memberId).run();
  await db.prepare("INSERT INTO roles (email,role,added_by,created_at) VALUES ('core@example.test','core','admin@example.test',1)").run();
  const student = await seedSession(db,'student@example.test','student-sub');
  const core = await seedSession(db,'core@example.test','core-sub');
  const admin = await seedSession(db,'admin@example.test','admin-sub');
  return { mf, db, student, core, admin };
}
const request = (mf,path,headers={},method='GET',body) => mf.dispatchFetch('http://localhost'+path, {headers,method,...(body ? {body:JSON.stringify(body)} : {})});

test('public directory and name lookup never expose contact or unrecognized fields',async t=>{
  const {mf}=await setup(t);
  for(const path of ['/api/batch/2015','/api/batch/2015?v=1','/api/meet/names','/api/meet/names/2015']){
    const res=await request(mf,path);
    assert.equal(res.status,200);
    const body=await res.json();
    assert.notEqual(body.unchanged,true,'old client versions must receive a sanitized payload');
    const row=(body.entries||body.names)[0];
    assert.ok(row);
    for(const key of ['EmailId','email','Phone','Phone2','Address','DOB','PinCode','internalNote']) assert.equal(Object.hasOwn(row,key),false,`${path} leaks ${key}`);
  }
});

test('core may read all batches and meet responses but cannot moderate galleries or change roles',async t=>{
  const {mf,db,core,student,admin}=await setup(t);
  for(const path of ['/api/batch/2015?level=full','/api/batch/2020?level=full','/api/meet/responses']){
    const res=await request(mf,path,core); assert.equal(res.status,200); assert.match(res.headers.get('Cache-Control'),/no-store/);
    assert.equal((await request(mf,path,student)).status,403);
    assert.equal((await request(mf,path)).status,401);
  }
  const full=await (await request(mf,'/api/batch/2015?level=full',core)).json();
  assert.equal(full.entries[0].EmailId,'private@example.test');
  for(const action of ['approve','reject']){
    assert.equal((await request(mf,`/api/review/gallery/${galleryId}/${action}`,core,'POST')).status,403);
    assert.equal((await db.prepare('SELECT status FROM gallery WHERE id=?').bind(galleryId).first()).status,'new');
  }
  assert.equal((await request(mf,`/api/review/gallery/${galleryId}`,core,'DELETE')).status,403);
  assert.equal((await request(mf,'/api/admin/roles',core,'POST',{email:'core@example.test',role:'admin'})).status,403);
  assert.equal((await request(mf,`/api/review/gallery/${galleryId}/approve`,admin,'POST')).status,200);
});

test('student and core can edit only their own profile without assigning roles or login identity',async t=>{
  const {mf,db,student,core}=await setup(t);
  for(const headers of [student,core]){
    assert.equal((await request(mf,`/api/admin/${memberId}`,headers,'PUT',{data:{Name:'Hacked',Batch:2020}})).status,403);
    const result=await request(mf,'/api/me',headers,'PUT',{id:memberId,role:'admin',email:'admin@example.test',data:{Name:'Own Profile',Batch:2015,EmailId:'new-contact@example.test',Phone:'9123456789',role:'admin'}});
    assert.equal(result.status,200);
    const own=await (await request(mf,'/api/me',headers)).json();
    assert.notEqual(own.role,'admin');
    assert.equal(own.member.email,headers===student?'student@example.test':'core@example.test');
    assert.equal((own.member.draft?.EmailId || own.member.data.EmailId),'new-contact@example.test');
  }
  assert.equal((await db.prepare('SELECT sub FROM members WHERE id=?').bind(memberId).first()).sub,'student-sub');
});

test('role removal and expired sessions immediately deny protected reads',async t=>{
  const {mf,db,core,student}=await setup(t);
  assert.equal((await request(mf,'/api/meet/responses',core)).status,200);
  await db.prepare("DELETE FROM roles WHERE email='core@example.test'").run();
  assert.equal((await request(mf,'/api/meet/responses',core)).status,403);
  await db.prepare("UPDATE sessions SET expires_at=1 WHERE email='student@example.test'").run();
  assert.equal((await request(mf,'/api/me',student)).status,401);
});

test('public admin export also excludes contact fields',async t=>{
  const {mf,admin}=await setup(t);
  const res=await request(mf,'/api/admin/export/2015?level=public',admin);
  assert.equal(res.status,200);
  const output=await res.text();
  assert.equal(output.includes('private@example.test'),false);
  assert.equal(output.includes('internalNote'),false);
});

test('students and core members can update their own DP without changing another profile',async t=>{
  const {mf,db,student,core}=await setup(t);
  const coreId='44444444-4444-4444-8444-444444444444';
  await db.prepare("INSERT INTO members (id,sub,email,batch,name,data,status,created_at,updated_at) VALUES (?,'core-sub','core@example.test',2020,'Core Member','{}','approved',1,1)").bind(coreId).run();
  const bytes=new Uint8Array([0x89,0x50,0x4e,0x47,0,0,0,0,0,0,0,0]);
  for(const headers of [student,core]){
    const upload=await mf.dispatchFetch('http://localhost/api/me/photo',{method:'POST',headers,body:bytes});
    assert.equal(upload.status,200);
    const read=await request(mf,'/api/me/photo',headers);
    assert.equal(read.status,200);
    assert.deepEqual(new Uint8Array(await read.arrayBuffer()),bytes);
  }
  const studentRow=await db.prepare('SELECT photo FROM members WHERE id=?').bind(memberId).first();
  const coreRow=await db.prepare('SELECT photo FROM members WHERE id=?').bind(coreId).first();
  assert.match(studentRow.photo,new RegExp(memberId));
  assert.match(coreRow.photo,new RegExp(coreId));
  assert.notEqual(studentRow.photo,coreRow.photo);
});
