/** Reserve a rate-limit slot atomically without storing a visitor's raw IP. */
export async function rateLimit(req,url,env,h,scope,limit,seconds){
 const local=['localhost','127.0.0.1'].includes(url.hostname);
 if(!env.RATE_LIMIT_SECRET&&!local)throw new h.HttpError(503,'Rate limiting is not configured');
 const ip=req.headers.get('CF-Connecting-IP')||'local',window=Math.floor(Date.now()/1000/seconds);
 const key=await h.sha256Hex((env.RATE_LIMIT_SECRET||'local-only')+':'+scope+':'+ip);
 const r=await env.DB.prepare('INSERT INTO rate_limits(key,window,count) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET window=excluded.window,count=CASE WHEN rate_limits.window=excluded.window THEN rate_limits.count+1 ELSE 1 END WHERE rate_limits.window<>excluded.window OR rate_limits.count<?').bind(key,window,limit).run();
 if(!r.meta.changes)throw new h.HttpError(429,'Too many requests; please try again later');
}
/** Validate Turnstile responses on the server; production submissions fail closed without setup. */
export async function verifyChallenge(body,url,env,h){
 if(!env.TURNSTILE_SECRET_KEY){if(['localhost','127.0.0.1'].includes(url.hostname))return;throw new h.HttpError(503,'Contact verification is not configured');}
 if(typeof body.challenge_token!=='string'||!body.challenge_token)throw new h.HttpError(400,'Complete the verification challenge');
 const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:body.challenge_token})});
 if(!response.ok)throw new h.HttpError(503,'Verification is unavailable');
 const result=await response.json(),allowed=String(env.ALLOWED_ORIGINS||'').split(',').filter(Boolean).map(value=>new URL(value.trim()).hostname);
 if(!result.success||!allowed.includes(result.hostname))throw new h.HttpError(400,'Verification failed');
}
