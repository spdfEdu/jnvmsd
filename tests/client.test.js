import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createApiClient} from '../src/lib/client.js';

test('API client attaches session only to configured API requests and serializes JSON',async()=>{let call;const client=createApiClient('https://api.example.test',()=> 'session-token',async(url,options)=>{call={url,options};return Response.json({ok:true});});assert.deepEqual(await client('/api/me',{method:'PUT',body:{data:{Name:'Student'}}}),{ok:true});assert.equal(call.url,'https://api.example.test/api/me');assert.equal(call.options.headers.get('Authorization'),'Bearer session-token');assert.deepEqual(JSON.parse(call.options.body),{data:{Name:'Student'}});await assert.rejects(client('https://evil.example/steal'),/Invalid API path/);});
test('API client surfaces server errors and clears expired session through callback',async()=>{let expired=false;const client=createApiClient('https://api.example.test',()=> 'expired',async()=>Response.json({error:'Please sign in again'},{status:401}),()=>{expired=true;});await assert.rejects(client('/api/me'),/Please sign in again/);assert.equal(expired,true);});
test('missing production API configuration fails without network calls',async()=>{let called=false;const client=createApiClient('',()=>null,async()=>{called=true;});await assert.rejects(client('/api/events'),/Member services/);assert.equal(called,false);});
