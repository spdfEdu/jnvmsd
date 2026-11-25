import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime, migrate, seedSession } from './helpers.js';

for(const imported of [true,false]){
  test(imported?'name and batch cannot claim an imported profile':'meet signup cannot bypass member approval',async t=>{
    const {mf,db}=await runtime(t); await migrate(db);
    if(imported) await db.prepare("INSERT INTO members (id,email,batch,name,data,status,created_at,updated_at) VALUES ('imported','legacy@jnvmsd.invalid',2015,'Test Student','{}','approved',1,1)").run();
    const headers=await seedSession(db,'new@example.test','new-sub');
    for(let attempt=0;attempt<2;attempt++){
      const res=await mf.dispatchFetch('http://localhost/api/meet/me',{method:'PUT',headers,body:JSON.stringify({data:{Name:'Test Student',Batch:2015,Phone:'9876543210',CurrentStatus:'Working',Attend:'No'}})});
      assert.equal(res.status,200);
      const own=await db.prepare("SELECT * FROM members WHERE sub='new-sub'").first();
      assert.equal(own.status,'pending');
      assert.notEqual(own.id,'imported');
      const response=await db.prepare("SELECT * FROM meet2026 WHERE email='new@example.test'").first();
      assert.equal(response.member_id,own.id);
      assert.equal(response.attend,'No');
    }
    if(imported){
      const original=await db.prepare("SELECT * FROM members WHERE id='imported'").first();
      assert.equal(original.sub,null); assert.equal(original.email,'legacy@jnvmsd.invalid'); assert.equal(original.data,'{}');
    }
  });
}

test('verified matching login email can still link an unclaimed existing profile',async t=>{
  const {mf,db}=await runtime(t); await migrate(db);
  await db.prepare("INSERT INTO members (id,email,batch,name,data,status,created_at,updated_at) VALUES ('matching','student@example.test',2015,'Student','{}','approved',1,1)").run();
  const headers=await seedSession(db,'student@example.test','verified-sub');
  const res=await mf.dispatchFetch('http://localhost/api/me',{headers});
  assert.equal(res.status,200); assert.equal((await res.json()).member.id,'matching');
  assert.equal((await db.prepare("SELECT sub FROM members WHERE id='matching'").first()).sub,'verified-sub');
});

test('admin linking an approved imported profile preserves the pending meet registration',async t=>{
  const {mf,db}=await runtime(t); await migrate(db);
  const target='33333333-3333-4333-8333-333333333333';
  await db.prepare("INSERT INTO members (id,email,batch,name,data,status,created_at,updated_at) VALUES (?,'legacy@jnvmsd.invalid',2015,'Test Student','{\"Name\":\"Test Student\",\"Batch\":2015}','approved',1,1)").bind(target).run();
  const headers=await seedSession(db,'new@example.test','new-sub');
  const registered=await mf.dispatchFetch('http://localhost/api/meet/me',{method:'PUT',headers,body:JSON.stringify({data:{Name:'Test Student',Batch:2015,Phone:'9876543210',CurrentStatus:'Working',Attend:'No'}})});
  assert.equal(registered.status,200);
  const pending=await db.prepare("SELECT id FROM members WHERE sub='new-sub'").first();
  const admin=await seedSession(db,'admin@example.test','admin-sub');
  const merged=await mf.dispatchFetch(`http://localhost/api/admin/${pending.id}/merge`,{method:'POST',headers:admin,body:JSON.stringify({target})});
  assert.equal(merged.status,200);
  const response=await db.prepare("SELECT * FROM meet2026 WHERE email='new@example.test'").first();
  assert.equal(response.member_id,target);
  assert.equal(response.attend,'No');
  const me=await (await mf.dispatchFetch('http://localhost/api/me',{headers})).json();
  assert.equal(me.member.id,target);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM members').first()).n,1);
});
