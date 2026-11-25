/** Read a request stream with a byte cap, cancelling before oversized content is buffered. */
export async function readBytes(req, limit, HttpError) {
  const reader=req.body?.getReader();if(!reader)return new Uint8Array();
  const chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new HttpError(413,'Request is too large');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
/** Decode bounded JSON and reject malformed payloads or non-object roots. */
export async function readJson(req, HttpError) {
  const text=new TextDecoder().decode(await readBytes(req,16000,HttpError));
  let data;try{data=JSON.parse(text);}catch{throw new HttpError(400,'Send valid JSON');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new HttpError(400,'Send a JSON object');
  return data;
}
