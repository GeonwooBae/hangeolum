const enc=new TextEncoder();
const hex=(a:Uint8Array)=>Array.from(a,n=>n.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const hash=async(s:string)=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))));
export const koreaDay=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,10);
export async function trackVisit(req:Request,user:any,db:any){
 const now=Date.now(),day=koreaDay(now),cookie=req.headers.get('Cookie')||'';
 const read=(name:string)=>cookie.match(new RegExp('(?:^|;\\s*)'+name+'=([a-f0-9]{64})(?:;|$)'))?.[1];
 const visitor=read('onward_visitor')||random();let session=read('onward_visit')||random();const visitorKey=await hash(visitor);let sessionKey=await hash(session);
 const existing=await db.prepare('SELECT user_id FROM analytics_visits WHERE day=? AND session_key=?').bind(day,sessionKey).first();
 if(existing?.user_id&&user?.id&&existing.user_id!==user.id){session=random();sessionKey=await hash(session)}
 const statements=[db.prepare('INSERT OR IGNORE INTO analytics_meta(key,value) VALUES(?,?)').bind('started_at',String(now)),db.prepare('INSERT INTO analytics_visits(day,session_key,visitor_key,user_id,created_at) VALUES(?,?,?,?,?) ON CONFLICT(day,session_key) DO UPDATE SET user_id=COALESCE(excluded.user_id,analytics_visits.user_id)').bind(day,sessionKey,visitorKey,user?.id||null,now)];
 if(user)statements.push(db.prepare('UPDATE analytics_visits SET user_id=? WHERE day=? AND visitor_key=? AND user_id IS NULL').bind(user.id,day,visitorKey));
 await db.batch(statements);
 const secure=new URL(req.url).protocol==='https:'?'; Secure':'';const headers=new Headers({'Cache-Control':'no-store'});
 headers.append('Set-Cookie',`onward_visitor=${visitor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=15552000${secure}`);
 headers.append('Set-Cookie',`onward_visit=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800${secure}`);
 return new Response(null,{status:204,headers})
}
export async function analyticsOverview(db:any,days:number){
 const today=koreaDay(),end=Date.parse(today+'T00:00:00Z'),start=new Date(end-(days-1)*86400000).toISOString().slice(0,10);
 const [meta,visits,signups,total]=await Promise.all([db.prepare('SELECT value FROM analytics_meta WHERE key=?').bind('started_at').first(),db.prepare("SELECT day,COUNT(*) AS visits,COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN 'u:'||user_id ELSE 'v:'||visitor_key END) AS visitors,COUNT(DISTINCT user_id) AS members FROM analytics_visits WHERE day>=? AND day<=? GROUP BY day").bind(start,today).all(),db.prepare("SELECT date(created_at/1000,'unixepoch','+9 hours') AS day,COUNT(*) AS signups FROM users WHERE created_at>=? GROUP BY day").bind(Date.parse(start+'T00:00:00+09:00')).all(),db.prepare('SELECT COUNT(*) AS total FROM users').bind().first()]);
 const first=meta?Number(meta.value):null,firstDay=first?koreaDay(first):null;const byDay=new Map(visits.results.map((r:any)=>[r.day,r])),bySignup=new Map(signups.results.map((r:any)=>[r.day,r.signups]));
 const rows=Array.from({length:days},(_,i)=>{const day=new Date(end-i*86400000).toISOString().slice(0,10),v:any=byDay.get(day);return{day,visitors:firstDay&&day>=firstDay?Number(v?.visitors||0):null,visits:firstDay&&day>=firstDay?Number(v?.visits||0):null,members:firstDay&&day>=firstDay?Number(v?.members||0):null,signups:Number(bySignup.get(day)||0)}});
 return{timezone:'Asia/Seoul',startedAt:first,totalUsers:Number(total.total),today:rows[0],rows,days}
}
