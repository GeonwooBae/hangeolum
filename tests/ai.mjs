import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync('drizzle/0000_handy_grey_gargoyle.sql','utf8'));
const DB={prepare(sql){return {bind(...args){const q=sqlite.prepare(sql);return {async first(){return q.get(...args)||null},async all(){return {results:q.all(...args)}},async run(){return q.run(...args)}}}}}};
const blobs=new Map();const BUCKET={async put(k,b){blobs.set(k,b instanceof Uint8Array?b:new Uint8Array(b))},async get(k){const b=blobs.get(k);return b?{async arrayBuffer(){return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}:null}};
const source=ts.transpileModule(fs.readFileSync('lib/goal-ai.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {goalAI}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const user={id:'test-ai-user',nickname:'테스터'};sqlite.prepare('INSERT INTO users(id,username,nickname,password_hash,salt,created_at) VALUES(?,?,?,?,?,?)').run(user.id,'test_ai','테스터','test','salt',Date.now());
const goal={id:'walking',title:'매일 30분 걷기 10일 달성',description:'꾸준히 해내서 기뻐',date:'',messages:[],logs:[],files:[],showProgress:true};
function seed(){sqlite.prepare('INSERT OR REPLACE INTO records(user_id,key,value,updated_at) VALUES(?,?,?,?)').run(user.id,'goals',JSON.stringify([goal]),Date.now())}
seed();let calls=0;const live=process.argv.includes('--live');const realFetch=globalThis.fetch;let mode='normal',lastRequest;
if(!live)globalThis.fetch=async(url,opts)=>{calls++;lastRequest=JSON.parse(opts.body);if(mode==='failure')return Response.json({error:{code:'credit_balance_exhausted'}},{status:429});return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({reply:'오늘로 10일 중 3일을 걸었네요. 잘하고 있어요!',progress:30,progress_reason:'목표 10일 중 3일 완료',memory:'목표 10일 중 3일 걷기 완료. 체중 70kg.',document:mode==='document'?{filename:'걷기 계획.md',content:'# 나의 계획\n매일 30분 걷기'}:null})}]}]})};
let key='test-key';if(live)key=fs.readFileSync('.env.local','utf8').split('\n').find(x=>x.startsWith('OPENAI_API_KEY=')).split('=').slice(1).join('=').trim();
async function call(mid,text,attachments=[]){return goalAI(new Request('https://test.example/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({goalId:'walking',messageId:mid,text,attachments})}),user,DB,BUCKET,key)}
const r=await call('m1','몸무게는 70kg이고 목표 10일 중 오늘까지 3일을 매일 30분 걸었어. 목표 달성률과 내일의 조언을 알려줘.');const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.ok(d.goals[0].messages.at(-1).text);assert.equal(d.goals[0].messages.at(-1).model,'gpt-6-luna');assert.equal(d.goals[0].logs.length,0);assert.equal(d.goals[0].files.length,0);
if(live){console.log(JSON.stringify({liveResponse:true,reply:d.goals[0].messages.at(-1).text,progress:d.goals[0].aiProgress}));process.exit(0)}
assert.equal(d.goals[0].aiProgress,30);await call('m1','duplicate');assert.equal(calls,1);
mode='document';const doc=await(await call('m2','걷기 계획을 파일로 만들어줘')).json();assert.equal(doc.goals[0].files.length,0);assert.equal(doc.goals[0].logs.length,0);assert.equal(doc.goals[0].messages.at(-1).attachments.length,1);assert.ok([...blobs.values()].length);
mode='failure';const failure=await call('m3','다음은 어떻게 해?');assert.equal(failure.status,502);const stored=JSON.parse(sqlite.prepare('SELECT value FROM records WHERE user_id=? AND key=?').get(user.id,'goals').value)[0];assert.equal(stored.messages.at(-1).role,'user');
const foreign=await goalAI(new Request('https://test.example/api/chat',{method:'POST',body:JSON.stringify({goalId:'walking',messageId:'x',text:'private'})}),{id:'another-user',nickname:'B'},DB,BUCKET,key);assert.equal(foreign.status,404);
console.log('PASS: AI response, progress, goal isolation, idempotent retries, generated-file opt-in, failure preservation, no automatic notes/vault');
