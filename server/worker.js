/*
 * NOVA relay — Cloudflare Worker
 * ------------------------------------------------------------------
 * এই ফাইলটা তোমার API key ধরে রাখে, অ্যাপ ধরে না।
 * অ্যাপ শুধু একটা অ্যাকসেস কোড পাঠায়; key কখনো ফোনে যায় না।
 *
 * বসানোর নিয়ম README-server.md তে আছে।
 * ------------------------------------------------------------------
 */

// প্রতি কোডে ঘণ্টায় কয়টা মেসেজ। শেষ হলে ১ ঘণ্টা পর নিজেই সচল।
const HOURLY_LIMIT = 40;

// একটা রিকোয়েস্টে সর্বোচ্চ কত বাইট (ছবি পাঠানোর জায়গা রাখা আছে)
const MAX_BODY = 6 * 1024 * 1024;

const UPSTREAM = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  gemini:
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function err(message, code, status) {
  return json({ error: { message, code } }, status);
}

/**
 * অ্যাকসেস কোড যাচাই।
 * CODES সিক্রেটে কমা দিয়ে আলাদা করা কোড থাকে, যেমন:  salman,rakib,tanvir
 * ফাঁকা রাখলে যে কেউ ঢুকতে পারবে — সেটা কোরো না।
 */
function checkCode(env, code) {
  const raw = (env.CODES || "").trim();
  if (!raw) return false;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.indexOf((code || "").trim()) >= 0;
}

/**
 * দিনে কয়টা মেসেজ হলো তার হিসাব।
 *
 * KV বাঁধা না থাকলে গোনা বাদ দিয়ে দেয় — কোড ছাড়া কেউ তো ঢুকতেই পারছে না,
 * তাই লিমিট না থাকলেও অ্যাপ চলবে। KV থাকলে প্রতি কোড প্রতি দিন আলাদা করে গোনে।
 */
async function bumpQuota(env, code) {
  if (!env.NOVA_KV) return { ok: true, used: 0, limit: 0, mins: 0 };

  // ঘণ্টার ঘরে গোনা হয়, তাই ঘড়ির কাঁটা ঘুরলেই আপনাআপনি সচল
  const now = new Date();
  const slot = now.toISOString().slice(0, 13); // 2026-08-16T18
  const key = "q:" + slot + ":" + code;
  const used = parseInt((await env.NOVA_KV.get(key)) || "0", 10);
  const limit = parseInt(env.HOURLY_LIMIT || HOURLY_LIMIT, 10);
  const mins = 60 - now.getUTCMinutes(); // আর কত মিনিট পর রিসেট

  if (used >= limit) return { ok: false, used, limit, mins };
  // ঘণ্টা পেরোলেই লাইনটা নিজে থেকে মুছে যায়
  await env.NOVA_KV.put(key, String(used + 1), { expirationTtl: 7200 });
  return { ok: true, used: used + 1, limit, mins };
}

/**
 * সব key একসাথে সাজায়।
 *
 * একটা সিক্রেটে কমা দিয়ে কয়েকটা key দেওয়া যায় — যেমন GROQ_KEY তে
 * তিনটা Groq অ্যাকাউন্টের key। একটার কোটা শেষ হলে পরেরটা ধরবে,
 * সব Groq শেষ হলে Gemini, তারপর বাকিগুলো।
 */
function guessProvider(key) {
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("AIza")) return "gemini";
  if (key.startsWith("sk-or-")) return "openrouter";
  if (key.startsWith("sk-")) return "openai";
  return null;
}

function defaultModelFor(env, prov) {
  if (prov === "groq") return env.GROQ_MODEL || "openai/gpt-oss-120b";
  if (prov === "gemini") return env.GEMINI_MODEL || "gemini-3.5-flash";
  if (prov === "openrouter") {
    return env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  }
  return env.OPENAI_MODEL || "gpt-4o-mini";
}

/** KV তে অ্যাপ থেকে যোগ করা key গুলো। */
async function kvKeys(env) {
  if (!env.NOVA_KV) return {};
  const out = {};
  for (const p of ["groq", "gemini", "openrouter", "openai"]) {
    const v = await env.NOVA_KV.get("keys:" + p);
    if (v) { try { out[p] = JSON.parse(v); } catch (e) {} }
  }
  return out;
}

function buildLanes(env, extra) {
  const defs = [
    ["groq", env.GROQ_KEY, env.GROQ_MODEL || "openai/gpt-oss-120b"],
    ["gemini", env.GEMINI_KEY, env.GEMINI_MODEL || "gemini-3.5-flash"],
    ["openrouter", env.OPENROUTER_KEY,
      env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free"],
    ["openai", env.OPENAI_KEY, env.OPENAI_MODEL || "gpt-4o-mini"],
  ];
  const lanes = [];
  for (const [name, raw, model] of defs) {
    const fromEnv = String(raw || "").split(",").map((k) => k.trim())
      .filter(Boolean);
    const fromKv = (extra && extra[name]) || [];
    const all = fromEnv.concat(fromKv.filter((k) => fromEnv.indexOf(k) < 0));
    all.forEach((key, i) => lanes.push({
      name, key, model, n: i + 1, id: name + "#" + (i + 1),
    }));
  }
  return lanes;
}

// ── কোন key কতক্ষণ বিশ্রামে ───────────────────────────────────────────
//
// একটা key কোটা শেষ করলে তাকে "বিশ্রামে" পাঠানো হয়, ঠিক যতক্ষণ প্রোভাইডার
// বলেছে ততক্ষণ। তখন পরেরটা কাজ করে। কিন্তু ক্রম বদলায় না — বিশ্রাম শেষ
// হলেই আবার আগের key-তেই ফিরে আসে। তাই ১ সচল থাকলে ২ ধরা হয় না।

/** প্রোভাইডারের এরর থেকে "আর কত সেকেন্ড" বের করে। */
function parseRetrySecs(res, text) {
  const h = res && res.headers && res.headers.get("retry-after");
  if (h && !isNaN(parseInt(h, 10))) return parseInt(h, 10);
  const m = /try again in\s*(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i.exec(text || "");
  if (m) {
    const secs = (parseInt(m[1] || 0, 10) * 3600)
      + (parseInt(m[2] || 0, 10) * 60)
      + Math.ceil(parseFloat(m[3] || 0));
    if (secs > 0) return secs;
  }
  return 3600; // বলা না থাকলে এক ঘণ্টা ধরে নাও
}

/** এখন কোন key-গুলো বিশ্রামে আছে তার তালিকা। */
async function restingSet(env, lanes) {
  const out = {};
  if (!env.NOVA_KV) return out;
  const now = Date.now();
  await Promise.all(lanes.map(async (l) => {
    const v = await env.NOVA_KV.get("rest:" + l.id);
    if (v && parseInt(v, 10) > now) out[l.id] = parseInt(v, 10);
  }));
  return out;
}

async function restKey(env, lane, secs) {
  if (!env.NOVA_KV) return;
  const until = Date.now() + secs * 1000;
  await env.NOVA_KV.put("rest:" + lane.id, String(until),
    { expirationTtl: Math.max(60, Math.min(secs + 60, 86400)) });
}

async function wakeKey(env, lane) {
  if (!env.NOVA_KV) return;
  await env.NOVA_KV.delete("rest:" + lane.id);
}

/** একটা প্রোভাইডারে চেষ্টা। স্ট্রিম হুবহু পাস করে দেয়। */
async function callUpstream(p, body) {
  const out = { ...body };
  // ক্লায়েন্ট মডেল না দিলে সার্ভারের ডিফল্ট
  if (!out.model) out.model = p.model;

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + p.key,
  };
  if (p.name === "openrouter") {
    headers["HTTP-Referer"] = "https://nova.app";
    headers["X-Title"] = "NOVA";
  }

  return fetch(UPSTREAM[p.name], {
    method: "POST",
    headers,
    body: JSON.stringify(out),
  });
}

/** কোন key চলে আর কোনটা নষ্ট — চোখে দেখার পাতা। */
function keysPage(rows) {
  const good = rows.filter((r) => r.ok || r.status === 429).length;
  const li = rows.map((r) => {
    const fine = r.ok || r.status === 429;
    return `<li class="${fine ? "y" : "n"}"><b>${fine ? "\u2713" : "\u2717"}</b>`
      + `<span><code>${r.id}</code> <small>(${r.tail})</small>`
      + (r.why ? `<br><small style="color:#8a8377">${r.why}</small>` : "")
      + `</span></li>`;
  }).join("");

  const html = `<!doctype html><html lang="bn"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NOVA \u2014 key যাচাই</title><style>
*{box-sizing:border-box}
body{margin:0;padding:26px 18px;background:#faf9f5;color:#1f1d1a;
 font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.w{max-width:520px;margin:0 auto}
h1{font:600 26px/1.3 Georgia,serif;margin:0 0 4px}
.s{color:#8a8377;margin:0 0 20px;font-size:15px}
.card{background:#fff;border:1px solid #e4e0d6;border-radius:16px;padding:18px 20px}
ul{list-style:none;margin:0;padding:0}
li{display:flex;gap:11px;padding:11px 0;align-items:flex-start}
li+li{border-top:1px solid #f2f0ea}
.y b{color:#2d9c6f}.n b{color:#d1453b}
code{background:#f2f0ea;padding:2px 7px;border-radius:6px;font-size:14px}
.top{border-radius:14px;padding:15px 18px;font-weight:600;margin-bottom:16px}
.ok{background:#2d9c6f;color:#fff}.bad{background:#fdf1ec;border:1px solid #d97757;color:#c4633f}
.hint{color:#8a8377;font-size:14px;margin-top:16px}
</style></head><body><div class="w">
<h1>key যাচাই</h1>
<p class="s">প্রতিটা key সত্যিই বাজিয়ে দেখা হয়েছে</p>
<div class="top ${good ? "ok" : "bad"}">${good
  ? "\u2713 " + good + " / " + rows.length + " টা key চলছে"
  : "\u26a0 একটাও key চলছে না"}</div>
<div class="card"><ul>${li}</ul>
<p class="hint">যেগুলোয় ✗ আছে সেগুলো Cloudflare \u2192 Settings \u2192 Variables
এ গিয়ে বাদ দাও বা ঠিক করো। কমা দিয়ে লেখার সময় ফাঁকা জায়গা বা
নতুন লাইন যেন না থাকে।</p></div>
</div></body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...CORS },
  });
}

/** ব্রাউজার থেকে ui.html আপলোড করার ছোট্ট পাতা। */
function uploadPage() {
  return `<!doctype html><html lang="bn"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NOVA \u2014 UI আপলোড</title><style>
*{box-sizing:border-box}
body{margin:0;padding:26px 18px;background:#faf9f5;color:#1f1d1a;
 font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.w{max-width:520px;margin:0 auto}
h1{font:600 25px/1.3 Georgia,serif;margin:0 0 6px}
p.s{color:#8a8377;margin:0 0 22px;font-size:15px}
.card{background:#fff;border:1px solid #e4e0d6;border-radius:16px;padding:20px;margin-bottom:16px}
label{display:block;font-weight:600;margin:0 0 7px;font-size:15px}
input{width:100%;padding:13px 14px;border:1px solid #d6d1c4;border-radius:11px;
 font-size:16px;font-family:inherit;background:#fff;margin-bottom:18px}
button{width:100%;padding:15px;border:none;border-radius:13px;background:#d97757;
 color:#fff;font:600 16px inherit;font-family:inherit}
button:disabled{opacity:.5}
#out{margin-top:16px;padding:14px;border-radius:12px;display:none;font-size:15px}
.ok{background:#e8f6ef;color:#1d7a55}.bad{background:#fdecea;color:#b3352c}
ol{padding-left:20px;color:#4a453d;font-size:15px}
li{margin:7px 0}
code{background:#f2f0ea;padding:2px 7px;border-radius:6px;font-size:14px}
</style></head><body><div class="w">
<h1>UI আপলোড</h1>
<p class="s">নতুন চেহারা পাঠাও \u2014 কারো APK বদলাতে হবে না</p>
<div class="card">
<label>অ্যাডমিন কোড</label>
<input id="adm" type="password" placeholder="ADMIN">
<label>ui.html ফাইল</label>
<input id="f" type="file" accept=".html,text/html">
<button id="go">পাঠাও</button>
<div id="out"></div>
</div>
<div class="card">
<label>এরপর</label>
<ol>
<li>Cloudflare \u2192 nova \u2192 Settings \u2192 Variables</li>
<li><code>UI_VERSION</code> এর সংখ্যাটা ১ বাড়াও</li>
<li>Deploy চাপো</li>
</ol>
<p style="color:#8a8377;font-size:14px;margin:12px 0 0">
সবার অ্যাপ পরেরবার খুললেই নতুন চেহারা পাবে।</p>
</div>
</div>
<script>
var out=document.getElementById('out');
function say(m,ok){out.style.display='block';out.className=ok?'ok':'bad';out.textContent=m}
document.getElementById('go').onclick=function(){
  var a=document.getElementById('adm').value.trim();
  var f=document.getElementById('f').files[0];
  if(!a){say('অ্যাডমিন কোড দাও',false);return}
  if(!f){say('ফাইল বেছে নাও',false);return}
  var b=this;b.disabled=true;b.textContent='পাঠাচ্ছি...';
  var r=new FileReader();
  r.onload=function(){
    fetch('/ui/html',{method:'PUT',
      headers:{'Authorization':'Bearer '+a,'Content-Type':'text/html; charset=utf-8'},
      body:r.result})
    .then(function(x){return x.json().then(function(j){return {s:x.status,j:j}})})
    .then(function(z){
      if(z.s===200)say('হয়ে গেছে \u2014 '+z.j.bytes+' বাইট পাঠানো হয়েছে। এবার UI_VERSION বাড়াও।',true);
      else say(z.j.error?z.j.error.message:'পাঠানো যায়নি',false);
    })
    .catch(function(e){say('সমস্যা: '+e,false)})
    .then(function(){b.disabled=false;b.textContent='পাঠাও'});
  };
  r.readAsText(f);
};
</script></body></html>`;
}

/** ফোনে খুললে যা দেখাবে — কী বাকি আছে সেটা পরিষ্কার করে বলে। */
function statusPage(st, lanes, resting) {
  const row = (ok, good, bad) =>
    `<li class="${ok ? "y" : "n"}"><b>${ok ? "\u2713" : "\u2717"}</b>` +
    `<span>${ok ? good : bad}</span></li>`;

  const nKeys = lanes.length;
  const names = Object.keys(st.keys)
    .map((k) => k + " \u00d7 " + st.keys[k]).join(", ");

  const html = `<!doctype html><html lang="bn"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NOVA সার্ভার</title><style>
*{box-sizing:border-box}
body{margin:0;padding:26px 18px;background:#faf9f5;color:#1f1d1a;
 font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.w{max-width:520px;margin:0 auto}
h1{font:600 27px/1.3 Georgia,serif;margin:0 0 4px}
.sub{color:#8a8377;margin:0 0 22px;font-size:15px}
.card{background:#fff;border:1px solid #e4e0d6;border-radius:16px;padding:18px 20px;margin-bottom:16px}
.big{font:600 19px/1.4 Georgia,serif;margin:0 0 12px}
ul{list-style:none;margin:0;padding:0}
li{display:flex;gap:11px;padding:8px 0;align-items:flex-start}
li+li{border-top:1px solid #f2f0ea}
li b{font-size:15px;line-height:1.6}
.y b{color:#2d9c6f}.n b{color:#d1453b}
.n span{color:#4a453d}
.ok{background:#2d9c6f;color:#fff;border-radius:14px;padding:15px 18px;font-weight:600}
.wait{background:#fdf1ec;border:1px solid #d97757;color:#c4633f;border-radius:14px;padding:15px 18px;font-weight:600}
code{background:#f2f0ea;padding:2px 7px;border-radius:6px;font-size:14px}
.hint{color:#8a8377;font-size:14px;margin-top:14px}
</style></head><body><div class="w">
<h1>NOVA সার্ভার</h1>
<p class="sub">${st.ready ? "চালু আছে" : "সেটআপ শেষ হয়নি"}</p>
<div class="${st.ready ? "ok" : "wait"}">${st.ready
  ? "\u2713 সব ঠিক আছে \u2014 অ্যাপে ঠিকানা আর কোড বসাও"
  : "\u26a0 আর একটু বাকি \u2014 নিচে দেখো"}</div>
<div class="card">
<p class="big">অবস্থা</p>
<ul>
${row(nKeys > 0, "API key বসানো আছে (" + names + ")",
      "কোনো API key বসাওনি \u2014 Settings \u2192 Variables \u2192 GROQ_KEY")}
${row(st.codes > 0, st.codes + " টা অ্যাকসেস কোড আছে",
      "কোনো কোড বসাওনি \u2014 Settings \u2192 Variables \u2192 CODES")}
${row(st.quota === "on", "ঘণ্টার কোটা গোনা চালু",
      "কোটা গোনা বন্ধ (ঐচ্ছিক) \u2014 চাইলে Settings \u2192 Bindings \u2192 KV, নাম NOVA_KV")}
</ul>
</div>
<div class="card">
<p class="big">key-এর অবস্থা</p>
<ul>
<li class="y"><b>\u2713</b><span>${st.active} টা key এখন কাজ করছে</span></li>
${(resting || []).map((r) =>
  `<li class="n"><b>\u23f8</b><span>${r.id} \u2014 আর ${r.mins} মিনিট বিশ্রামে</span></li>`
).join("")}
</ul>
<p class="hint">কোটা শেষ হলে key বিশ্রামে যায়, পরেরটা কাজ চালায়।
সময় হলে সে নিজের জায়গায় ফিরে আসে।</p>
</div>
<div class="card">
<p class="big">অ্যাপে যা বসাবে</p>
<ul>
<li><b>\u2022</b><span>প্রোভাইডার \u2014 <code>NOVA সার্ভার (কোড দিয়ে)</code></span></li>
<li><b>\u2022</b><span>ঠিকানা \u2014 এই পাতার URL</span></li>
<li><b>\u2022</b><span>কোড \u2014 <code>CODES</code> এ যেটা দিয়েছ</span></li>
<li><b>\u2022</b><span>মডেল \u2014 ফাঁকা রাখো</span></li>
</ul>
<p class="hint">key কখনো ফোনে যায় না। কোড ছাড়া এই সার্ভার কাউকে ঢুকতে দেয় না।</p>
</div>
</div></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    // ব্রাউজারে খুললে বোঝা যাক সার্ভার জীবিত
    if (request.method === "GET" && url.pathname === "/") {
      const lanes = buildLanes(env, await kvKeys(env));
      const counts = {};
      lanes.forEach((l) => { counts[l.name] = (counts[l.name] || 0) + 1; });
      const rest = await restingSet(env, lanes);
      const restList = lanes.filter((l) => rest[l.id]).map((l) => ({
        id: l.id,
        mins: Math.max(1, Math.round((rest[l.id] - Date.now()) / 60000)),
      }));
      const codes = (env.CODES || "").split(",").map((s) => s.trim())
        .filter(Boolean);
      const state = {
        ok: true,
        service: "NOVA relay",
        ready: lanes.length > 0 && codes.length > 0,
        keys: counts,
        codes: codes.length,
        quota: env.NOVA_KV ? "on" : "off",
        active: lanes.length - restList.length,
        resting: restList,
      };
      // ফোনের ব্রাউজারে খুললে পড়ার মতো পাতা, অ্যাপ চাইলে JSON
      const wantsHtml = (request.headers.get("Accept") || "")
        .indexOf("text/html") >= 0;
      return wantsHtml ? statusPage(state, lanes, restList) : json(state);
    }

    // ── UI আপডেট ──────────────────────────────────────────────────
    // অ্যাপের চেহারা একটা HTML ফাইল। সেটা এখানে রাখা থাকলে অ্যাপ
    // নিজেই টেনে নেয় — APK আবার বানাতে হয় না।
    if (request.method === "GET" && url.pathname === "/ui/version") {
      const v = parseInt(env.UI_VERSION || "0", 10);
      return json({ version: v, has: !!env.NOVA_KV });
    }
    if (request.method === "GET" && url.pathname === "/ui/html") {
      if (!env.NOVA_KV) return err("UI স্টোরেজ নেই", "no_kv", 404);
      const html = await env.NOVA_KV.get("ui:html");
      if (!html) return err("কোনো UI আপলোড করা হয়নি", "no_ui", 404);
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8", ...CORS },
      });
    }
    // নতুন UI আপলোড: PUT /ui/html, হেডারে ADMIN কোড
    if (request.method === "PUT" && url.pathname === "/ui/html") {
      const adm = (request.headers.get("Authorization") || "")
        .replace(/^Bearer\s+/i, "").trim();
      if (!env.ADMIN || adm !== env.ADMIN) {
        return err("অ্যাডমিন কোড লাগবে", "not_admin", 401);
      }
      if (!env.NOVA_KV) return err("আগে KV যোগ করো", "no_kv", 503);
      const html = await request.text();
      if (html.length < 5000 || html.indexOf("</html>") < 0) {
        return err("ফাইলটা অসম্পূর্ণ মনে হচ্ছে", "bad_html", 400);
      }
      await env.NOVA_KV.put("ui:html", html);
      return json({ ok: true, bytes: html.length,
        note: "এবার UI_VERSION বাড়িয়ে Deploy করো" });
    }

    // ব্রাউজার থেকে আপলোড — Termux ছাড়াই
    if (request.method === "GET" && url.pathname === "/ui/upload") {
      return new Response(uploadPage(), {
        headers: { "Content-Type": "text/html; charset=utf-8", ...CORS },
      });
    }

    // অ্যাপ থেকে key যোগ করা। KV তে জমা হয়, তাই Cloudflare এ যেতে হয় না।
    if (request.method === "POST" && url.pathname === "/keys/add") {
      const adm = (request.headers.get("Authorization") || "")
        .replace(/^Bearer\s+/i, "").trim();
      if (!env.ADMIN || adm !== env.ADMIN) {
        return err("অ্যাডমিন কোড লাগবে", "not_admin", 401);
      }
      if (!env.NOVA_KV) return err("আগে KV যোগ করো", "no_kv", 503);
      let b;
      try { b = await request.json(); }
      catch (e) { return err("বডি পড়া গেল না", "bad_json", 400); }

      const key = String(b.key || "").trim();
      if (key.length < 20) return err("key টা ঠিক নয়", "bad_key", 400);
      const prov = guessProvider(key);
      if (!prov) return err("চেনা ফরম্যাটে নেই", "unknown", 400);

      // আগে বাজিয়ে দেখি সত্যিই চলে কিনা
      const lane = { name: prov, key, model: defaultModelFor(env, prov) };
      let res;
      try { res = await callUpstream(lane, {
        messages: [{ role: "user", content: "hi" }], max_tokens: 1 }); }
      catch (e) { return err("যাচাই করা গেল না: " + e, "probe", 502); }
      if (res.status >= 400 && res.status !== 429) {
        const txt = await res.text().catch(() => "");
        let m = ""; try { m = JSON.parse(txt)?.error?.message || ""; } catch (e) {}
        return err("key টা চলছে না: " + (m || res.status), "dead", 400);
      }

      const cur = JSON.parse((await env.NOVA_KV.get("keys:" + prov)) || "[]");
      if (cur.indexOf(key) >= 0) {
        return json({ ok: true, provider: prov, added: false,
          note: "এই key আগে থেকেই আছে" });
      }
      cur.push(key);
      await env.NOVA_KV.put("keys:" + prov, JSON.stringify(cur));
      return json({ ok: true, provider: prov, added: true, total: cur.length });
    }

    // প্রতিটা key আলাদা করে বাজিয়ে দেখে কোনটা চলে
    if (request.method === "GET" && url.pathname === "/keys") {
      const lanes = buildLanes(env, await kvKeys(env));
      const rows = [];
      for (const l of lanes) {
        let status = 0, note = "";
        try {
          const res = await callUpstream(l, {
            messages: [{ role: "user", content: "hi" }], max_tokens: 1,
          });
          status = res.status;
          if (status >= 400) {
            const b = await res.text().catch(() => "");
            try { note = JSON.parse(b)?.error?.message || ""; }
            catch (e) { note = b.slice(0, 90); }
          }
        } catch (e) { note = String(e); }
        rows.push({
          id: l.id,
          ok: status > 0 && status < 400,
          status,
          why: status === 429 ? "কোটা শেষ (key ঠিক আছে)" : note.slice(0, 110),
          tail: "..." + l.key.slice(-4),
        });
      }
      const wantsHtml = (request.headers.get("Accept") || "")
        .indexOf("text/html") >= 0;
      return wantsHtml ? keysPage(rows) : json({ keys: rows });
    }

    if (request.method !== "POST") return err("POST only", "method", 405);

    // অ্যাকসেস কোড: Authorization: Bearer <code>
    const auth = request.headers.get("Authorization") || "";
    const code = auth.replace(/^Bearer\s+/i, "").trim();
    if (!checkCode(env, code)) {
      return err("এই কোডটা চলবে না। সালমানের কাছ থেকে ঠিক কোড নাও।",
        "bad_code", 401);
    }

    const len = parseInt(request.headers.get("Content-Length") || "0", 10);
    if (len > MAX_BODY) return err("রিকোয়েস্ট খুব বড়", "too_big", 413);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return err("বডি পড়া গেল না", "bad_json", 400);
    }

    const q = await bumpQuota(env, code);
    if (!q.ok) {
      return err("এই ঘণ্টার কোটা শেষ (" + q.limit + ")। আর "
        + q.mins + " মিনিট পর আবার চালু হবে।", "quota", 429);
    }

    // একটার পর একটা key — শেষ না হওয়া পর্যন্ত থামে না
    let lanes = buildLanes(env, await kvKeys(env));
    if (!lanes.length) {
      return err("সার্ভারে কোনো key বসানো হয়নি।", "no_key", 503);
    }

    const wanted = url.searchParams.get("provider") || body.provider || null;
    delete body.provider;
    if (wanted) {
      // চাওয়া প্রোভাইডার আগে, বাকিগুলো পিছনে ব্যাকআপ হিসেবে থাকুক
      lanes = lanes.filter((l) => l.name === wanted)
        .concat(lanes.filter((l) => l.name !== wanted));
    }

    // বিশ্রামে থাকা key-গুলো এই দফায় বাদ, কিন্তু ক্রম একই থাকে —
    // বিশ্রাম শেষ হলেই সে আবার নিজের জায়গা ফিরে পায়।
    const resting = await restingSet(env, lanes);
    const active = lanes.filter((l) => !resting[l.id]);
    const order = active.length ? active : lanes;

    let last = null;
    for (let i = 0; i < order.length; i++) {
      const p = order[i];
      let r;
      try {
        r = await callUpstream(p, body);
      } catch (e) {
        last = err("নেটওয়ার্ক সমস্যা: " + e, "net", 502);
        continue;
      }

      // একটা key নষ্ট বা মেয়াদ শেষ (401/403): তাকে বাদ দিয়ে পরেরটা ধরো।
      // এতে একটা খারাপ key গোটা পুলটাকে অচল করে দিতে পারে না।
      let authDead = r.status === 401 || r.status === 403;
      if (r.status === 400) {
        const peek = (await r.clone().text().catch(() => "")).toLowerCase();
        // Gemini answers 400 "Invalid Auth key" for a bad key
        if (peek.includes("auth") || peek.includes("api key")
            || peek.includes("api_key")) authDead = true;
      }
      if (authDead && i < order.length - 1) {
        last = new Response(await r.clone().text().catch(() => ""),
          { status: r.status, headers: r.headers });
        // অন্তত এক ঘণ্টা সরিয়ে রাখো, নইলে প্রতি মেসেজে একই দেয়াল
        await restKey(env, p, 3600);
        continue;
      }

      // কোটা শেষ (429) বা সার্ভার ডাউন (5xx): এই key-কে বিশ্রামে পাঠাও,
      // পরেরটা ধরো
      if (r.status === 429 || r.status >= 500) {
        const text = await r.clone().text().catch(() => "");
        await restKey(env, p, parseRetrySecs(r, text));
        if (i < order.length - 1) {
          last = new Response(text, { status: r.status, headers: r.headers });
          continue;
        }
        last = new Response(text, { status: r.status, headers: r.headers });
        break;
      }

      // কাজ করেছে — বিশ্রামের দাগ থাকলে মুছে দাও
      if (r.status < 400 && resting[p.id]) await wakeKey(env, p);

      const h = new Headers(r.headers);
      Object.keys(CORS).forEach((k) => h.set(k, CORS[k]));
      h.set("X-Nova-Provider", p.id);
      h.set("X-Nova-Pool", active.length + "/" + lanes.length);
      if (q.limit) h.set("X-Nova-Quota", q.used + "/" + q.limit + " (" + q.mins + "m)");
      return new Response(r.body, { status: r.status, headers: h });
    }

    if (last && last.body) {
      const h = new Headers(last.headers);
      Object.keys(CORS).forEach((k) => h.set(k, CORS[k]));
      return new Response(last.body, { status: last.status, headers: h });
    }
    return err("সব key-ই আপাতত শেষ। একটু পরে চেষ্টা করো।", "all_out", 429);
  },
};
