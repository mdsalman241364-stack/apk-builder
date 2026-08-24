import fs from 'fs';
fs.writeFileSync('./.k.tmp.mjs', fs.readFileSync('./worker.js','utf8'));
const worker = (await import('./.k.tmp.mjs?v='+Date.now())).default;

const store=new Map();
const KV={get:async k=>store.get(k)??null,put:async(k,v)=>{store.set(k,v)},delete:async k=>{store.delete(k)}};
const env={CODES:'salman',ADMIN:'s3cret',NOVA_KV:KV,GROQ_KEY:'gsk_env1'};
const dead=new Set(['gsk_bad']);
let seen=[];
globalThis.fetch=async(u,o)=>{
  const k=o.headers.Authorization.replace('Bearer ','');seen.push(k);
  if(dead.has(k))return new Response(JSON.stringify({error:{message:'Invalid API Key'}}),{status:401});
  return new Response('{"ok":1}',{status:200});
};
let pass=0,fail=0;const t=(n,c)=>{c?pass++:fail++;console.log((c?'  ok  ':'FAIL  ')+n)};
const add=(key,adm='s3cret')=>worker.fetch(new Request('https://x/keys/add',{method:'POST',
  headers:{Authorization:'Bearer '+adm,'Content-Type':'application/json'},
  body:JSON.stringify({key})}),env);

let r=await add('gsk_newone_abcdefghij','wrong');
t('ভুল অ্যাডমিন আটকাল', r.status===401);

r=await add('short'); t('ছোট key আটকাল', r.status===400);

r=await add('xyz_notaprovider_abcdefghij');
t('অচেনা ফরম্যাট আটকাল', r.status===400);

// dead key rejected before saving
dead.add('gsk_deadkey_aaaaaaaaaaaaaa');
r=await add('gsk_deadkey_aaaaaaaaaaaaaa');
let j=await r.json();
t('নষ্ট key জমা হলো না', r.status===400 && /চলছে না/.test(j.error.message));
t('KV তে ঢোকেনি', !store.get('keys:groq'));

// good key accepted
r=await add('gsk_goodkey_bbbbbbbbbbbbbb'); j=await r.json();
t('ভালো key যোগ হলো', r.status===200 && j.added===true && j.provider==='groq');

// duplicate
r=await add('gsk_goodkey_bbbbbbbbbbbbbb'); j=await r.json();
t('একই key দুবার নয়', r.status===200 && j.added===false);

// gemini detected by prefix
r=await add('AIza_something_cccccccccccc'); j=await r.json();
t('AIza -> gemini', j.provider==='gemini');

// now the pool has env + kv keys
r=await worker.fetch(new Request('https://x/'),env); j=await r.json();
t('হেলথে env+kv মিলে', j.keys.groq===2 && j.keys.gemini===1);

// chat uses them
seen=[];
r=await worker.fetch(new Request('https://x/',{method:'POST',
  headers:{Authorization:'Bearer salman','Content-Type':'application/json'},
  body:'{"messages":[]}'}),env);
t('চ্যাট চলছে', r.status===200);

// /keys page reports each one
r=await worker.fetch(new Request('https://x/keys'),env); j=await r.json();
t('/keys সব দেখাল', j.keys.length===3 && j.keys.every(k=>k.ok));

console.log(`\n${pass} পাস, ${fail} ফেল`);
fs.unlinkSync('./.k.tmp.mjs');
process.exit(fail?1:0);
