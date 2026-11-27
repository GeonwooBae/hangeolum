// ZIP (stored entries, UTF-8, data descriptors). Stream file bodies to keep Worker memory bounded.
const enc=new TextEncoder();
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function bytes(size:number,values:[number,number,number][]){const b=new Uint8Array(size),v=new DataView(b.buffer);for(const[o,n,len]of values)len===2?v.setUint16(o,n,true):v.setUint32(o,n,true);return b}
export async function backup(user:any,db:any,bucket:any){
 const rows=(await db.prepare('SELECT key,value FROM records WHERE user_id=?').bind(user.id).all()).results.filter((r:any)=>!r.key.startsWith('__'));
 const records=Object.fromEntries(rows.map((r:any)=>[r.key,JSON.parse(r.value)]));
 const files=(await db.prepare('SELECT * FROM files WHERE user_id=?').bind(user.id).all()).results;
 if(files.length>60000||files.reduce((n:number,f:any)=>n+f.size,0)>3*1024**3)return Response.json({error:'백업 용량이 커서 다운로드할 수 없어요. 파일을 나누어 보관해 주세요.'},{status:413});
 const refs=new Map<string,string>();for(const g of records.goals||[])for(const f of [...(g.files||[]),...(g.messages||[]).flatMap((m:any)=>m.attachments||[])])refs.set(f.id,f.name||f.filename||f.id);
 const manifest=files.map((f:any)=>({id:f.id,name:refs.get(f.id)||f.id,type:f.type,size:f.size,path:'files/'+f.id+'_'+(refs.get(f.id)||f.id).replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(0,120)}));
 const stream=new TransformStream(),writer=stream.writable.getWriter();
 void (async()=>{let offset=0;const central:Uint8Array[]=[];let count=0;const push=async(b:Uint8Array)=>{await writer.write(b);offset+=b.length};
 async function entry(name:string,body:ReadableStream|Uint8Array){const path=enc.encode(name),start=offset;await push(bytes(30,[[0,0x04034b50,4],[4,20,2],[6,0x808,2],[26,path.length,2]]));await push(path);let crc=0xffffffff,size=0;const chunk=async(b:Uint8Array)=>{for(const n of b)crc=table[(crc^n)&255]^(crc>>>8);size+=b.length;await push(b)};if(body instanceof Uint8Array)await chunk(body);else{const reader=body.getReader();try{while(true){const r=await reader.read();if(r.done)break;await chunk(r.value)}}finally{reader.releaseLock()}}crc=(crc^0xffffffff)>>>0;await push(bytes(16,[[0,0x08074b50,4],[4,crc,4],[8,size,4],[12,size,4]]));central.push(bytes(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x808,2],[16,crc,4],[20,size,4],[24,size,4],[28,path.length,2],[42,start,4]]),path);count++}
 try{await entry('records.json',enc.encode(JSON.stringify({format:'onward-backup',version:1,exportedAt:new Date().toISOString(),account:{username:user.username,nickname:user.nickname},records,files:manifest},null,2)));
 await entry('읽어주세요.txt',enc.encode('한걸음 기록 백업\nrecords.json: 목표, 대화, 메모, 하루 돌아보기 기록\nfiles/: 첨부파일 (원래 이름은 records.json의 files 목록 참고)\n비밀번호와 복구 코드는 포함하지 않습니다. 앱으로 다시 가져오는 기능은 아직 없습니다.\n'));
 for(let i=0;i<files.length;i++){const object=await bucket.get(files[i].object_key);if(!object)throw Error('missing_file');await entry(manifest[i].path,object.body)}const start=offset;for(const b of central)await push(b);const length=offset-start;await push(bytes(22,[[0,0x06054b50,4],[8,count,2],[10,count,2],[12,length,4],[16,start,4]]));await writer.close()}catch(e){await writer.abort(e)}
 })().catch(()=>{});return new Response(stream.readable,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="onward-backup-'+new Date().toISOString().slice(0,10)+'.zip"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
}
