import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readJson} from '../src/http.js';
/** Retain HTTP status in validation failures for direct boundary tests. */
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
test('oversized streamed JSON is rejected and cancelled before buffering the entire body',async()=>{let cancelled=false,chunks=0;const stream=new ReadableStream({pull(controller){if(chunks++<10)controller.enqueue(new Uint8Array(9000));else controller.close();},cancel(){cancelled=true;}});const req=new Request('http://localhost/api/contact',{method:'POST',body:stream,duplex:'half'});await assert.rejects(readJson(req,HttpError),error=>error.status===413);assert.equal(cancelled,true);});
