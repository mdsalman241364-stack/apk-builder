import fs from 'fs';
fs.writeFileSync('./.r.tmp.mjs', fs.readFileSync('./worker.js','utf8'));
const worker = (await import('./.r.tmp.mjs?v='+Date.now())).default;

// fake KV that honours expiry
const store = new Map();
const KV = {
  get: async k => store.has(k) ? store.get(k) : null,
  put: async (k,v) => { store.set(k,v); },
  delete: async k => { store.delete(k); },
};
const env = {
  CODES:'salman', NOVA_KV:KV,
  GROQ_KEY:'g1,g2,g3', GEMINI_KEY:'a1,a2,a3',
};
let calls=[]; const script={};
globalThis.fetch = async (u,o) => {
  const key = o.headers.Authorization.replace('Bearer ','');
  calls.push(key);
  const st = (script[key]??[]).shift() ?? 200;
  if (st===429) return new Response(
    JSON.stringify({error:{message:'Rate limit reached. Please try again in 1h26m33s'}}),
    {status:429});
  if (st===401) return new Response(
    JSON.stringify({error:{message:'Invalid API Key'}}), {status:401});
  return new Response('{"ok":1}',{status:200});
};
const post = () => worker.fetch(new Request('https://x/',{method:'POST',
  headers:{Authorization:'Bearer salman','Content-Type':'application/json'},
  body:'{"messages":[]}'}), env);
const health = async () => (await (await worker.fetch(new Request('https://x/'),env)).json());

let pass=0,fail=0;
const t=(n,c)=>{c?pass++:fail++;console.log((c?'  ok  ':'FAIL  ')+n)};

// 1. normal: always the first key
calls=[]; await post(); await post(); await post();
t('সবসময় ১ নম্বর key', calls.join()==='g1,g1,g1');

// 2. g1 hits its limit -> g2 takes over, g1 rests
calls=[]; script['g1']=[429];
let r = await post();
t('১ শেষ -> ২ ধরল', calls.join()==='g1,g2' && r.status===200);
t('উত্তর পেল', r.status===200);

// 3. next calls skip the resting g1 and stay on g2 (NOT g3)
calls=[]; await post(); await post();
t('২ চলছে, ৩ এ যায়নি', calls.join()==='g2,g2');

// 4. g2 also dies -> g3
calls=[]; script['g2']=[429];
await post();
t('২ শেষ -> ৩ ধরল', calls.join()==='g2,g3');
calls=[]; await post();
t('৩ এ থেমেছে', calls.join()==='g3');

// 5. g1's rest expires -> it must come back, NOT stay on g3
store.set('rest:groq#1', String(Date.now()-1000));
calls=[]; await post();
t('১ সচল হলে ১ এ ফিরল', calls.join()==='g1');

// 6. all groq out -> crosses to gemini
store.clear();
calls=[]; script['g1']=[429]; script['g2']=[429]; script['g3']=[429];
r = await post();
t('সব groq শেষ -> ai studio', calls.join()==='g1,g2,g3,a1' && r.status===200);
calls=[]; await post();
t('ai studio তে থিতু', calls.join()==='a1');

// 7. health shows the pool
const h = await health();
t('হেলথে ৬ key', h.keys.groq===3 && h.keys.gemini===3);
t('হেলথে ৩ বিশ্রামে', h.resting.length===3 && h.active===3);
t('বিশ্রামের সময় দেখাচ্ছে', h.resting[0].mins>80 && h.resting[0].mins<90);

// 8. everything down -> real error, no crash
store.clear();
['g1','g2','g3','a1','a2','a3'].forEach(k=>script[k]=[429]);
r = await post();
t('সব শেষ -> 429', r.status===429);

// 9. a dead key must not block the pool
store.clear(); calls=[];
script['g1']=[401,401,401,401];
r = await post();
t('নষ্ট key -> পরেরটা ধরল', calls.join()==='g1,g2' && r.status===200);
calls=[]; await post();
t('নষ্ট key বাদ পড়েছে', calls.join()==='g2');

console.log(`\n${pass} পাস, ${fail} ফেল`);
fs.unlinkSync('./.r.tmp.mjs');
process.exit(fail?1:0);
