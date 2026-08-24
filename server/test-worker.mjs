import fs from 'fs';
const src = fs.readFileSync('./worker.js','utf8');
fs.writeFileSync('./.w.tmp.mjs', src);
const mod = await import('./.w.tmp.mjs?v='+Date.now());
const worker = mod.default;

let calls = [];
const script = {};           // url -> status sequence
globalThis.fetch = async (u, o) => {
  const body = JSON.parse(o.body);
  const key = o.headers.Authorization.replace('Bearer ','');
  calls.push({u, key, model: body.model});
  const st = (script[key] ?? []).shift() ?? 200;
  return new Response(st===200?'{"ok":1}':'{"error":{"message":"x"}}', {status:st});
};

const env = {
  CODES: 'salman,rakib',
  GROQ_KEY: 'gsk_A,gsk_B',
  GEMINI_KEY: 'AIza_C',
};
const post = (code, body={messages:[]}) => worker.fetch(new Request('https://x/', {
  method:'POST', headers:{Authorization:'Bearer '+code,'Content-Type':'application/json'},
  body: JSON.stringify(body)}), env);

let pass=0, fail=0;
const t = (name, cond) => { cond?pass++:fail++; console.log((cond?'  ok  ':'FAIL  ')+name); };

// 1. health
let r = await worker.fetch(new Request('https://x/'), env);
let j = await r.json();
t('health ready', j.ready===true);
t('health counts groq=2 gemini=1', j.keys.groq===2 && j.keys.gemini===1);
t('quota off without KV', j.quota==='off');

// 2. bad code
r = await post('nobody'); t('bad code -> 401', r.status===401);
r = await post('salman'); t('good code -> 200', r.status===200);

// 3. first key used, model filled from server default
calls=[]; await post('salman');
t('uses first groq key', calls[0].key==='gsk_A');
t('server fills model', calls[0].model==='openai/gpt-oss-120b');

// 4. key A rate limited -> falls to key B (same provider)
calls=[]; script['gsk_A']=[429];
await post('salman');
t('429 -> next key same provider', calls.length===2 && calls[1].key==='gsk_B');

// 5. all groq out -> gemini, with its own model
calls=[]; script['gsk_A']=[429]; script['gsk_B']=[429];
r = await post('salman');
t('all groq out -> gemini', calls.length===3 && calls[2].key==='AIza_C');
t('gemini model swapped', calls[2].model==='gemini-3.5-flash');
t('final status 200', r.status===200);

// 6. everything out -> real 429 passed back
calls=[]; script['gsk_A']=[429]; script['gsk_B']=[429]; script['AIza_C']=[429];
r = await post('salman'); t('all out -> 429', r.status===429);

// 7. client model preference respected
calls=[]; await post('salman', {messages:[], model:'llama-3.1-8b-instant'});
t('client model kept', calls[0].model==='llama-3.1-8b-instant');

// 8. hourly quota with a fake KV
const store = new Map();
env.NOVA_KV = { get:async k=>store.get(k)??null, put:async (k,v)=>{store.set(k,v)} };
env.HOURLY_LIMIT = '3';
for (let i=0;i<3;i++) await post('rakib');
r = await post('rakib');
t('4th call over limit -> 429', r.status===429);
j = await r.json();
t('quota msg mentions minutes', /মিনিট/.test(j.error.message));
r = await post('salman'); t('other code unaffected', r.status===200);

console.log(`\n${pass} পাস, ${fail} ফেল`);
process.exit(fail?1:0);
