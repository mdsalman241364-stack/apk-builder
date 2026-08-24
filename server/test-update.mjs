import fs from 'fs';
fs.writeFileSync('./.u.tmp.mjs', fs.readFileSync('./worker.js','utf8'));
const worker = (await import('./.u.tmp.mjs?v='+Date.now())).default;

const store = new Map();
const KV = { get:async k=>store.get(k)??null, put:async(k,v)=>{store.set(k,v)},
             delete:async k=>{store.delete(k)} };
const env = { CODES:'salman', ADMIN:'s3cret', NOVA_KV:KV, GROQ_KEY:'g1',
              UI_VERSION:'0' };
globalThis.fetch = async () => new Response('{"ok":1}',{status:200});

const GOOD = '<!doctype html><html><body>'+'x'.repeat(6000)+'</body></html>';
let pass=0,fail=0;
const t=(n,c)=>{c?pass++:fail++;console.log((c?'  ok  ':'FAIL  ')+n)};
const req=(p,o={})=>worker.fetch(new Request('https://x'+p,o),env);

// version endpoint
let r = await req('/ui/version'); let j = await r.json();
t('version শুরুতে 0', j.version===0);

// no UI uploaded yet
r = await req('/ui/html'); t('UI নেই -> 404', r.status===404);

// upload needs the admin code
r = await req('/ui/html',{method:'PUT',headers:{Authorization:'Bearer wrong'},body:GOOD});
t('ভুল অ্যাডমিন -> 401', r.status===401);

// truncated file rejected
r = await req('/ui/html',{method:'PUT',headers:{Authorization:'Bearer s3cret'},body:'<html>tiny'});
t('অসম্পূর্ণ ফাইল আটকাল', r.status===400);

// real upload
r = await req('/ui/html',{method:'PUT',headers:{Authorization:'Bearer s3cret'},body:GOOD});
j = await r.json();
t('আপলোড হলো', r.status===200 && j.bytes===GOOD.length);

// now served
r = await req('/ui/html'); const back = await r.text();
t('ডাউনলোডে হুবহু ফেরত', r.status===200 && back===GOOD);

// bump version
env.UI_VERSION='3';
r = await req('/ui/version'); j = await r.json();
t('version বাড়ল', j.version===3);

// upload page renders
r = await req('/ui/upload'); const page = await r.text();
t('আপলোড পাতা এল', r.status===200 && page.includes('অ্যাডমিন কোড'));

// chat still works alongside
r = await req('/',{method:'POST',headers:{Authorization:'Bearer salman',
  'Content-Type':'application/json'},body:'{"messages":[]}'});
t('চ্যাট আগের মতোই চলছে', r.status===200);

console.log(`\n${pass} পাস, ${fail} ফেল`);
fs.unlinkSync('./.u.tmp.mjs');
process.exit(fail?1:0);
