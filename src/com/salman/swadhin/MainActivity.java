package com.salman.swadhin;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.view.KeyEvent;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;

/**
 * NOVA - Salman's own personal AI.
 * The UI is an HTML file in assets; this Activity is the native backend behind it.
 */
public class MainActivity extends Activity {

    private static final int REQ_VOICE = 101;
    private static final int REQ_STORE = 102;
    private static final int REQ_PICK = 103;
    private static final int REQ_CAM = 104;
    private static final int REQ_FILE = 105;
    private static final int REQ_CAMPERM = 106;
    private static final int REQ_READ = 107;

    /** Attachments staged by the picker, consumed by the next send(). */
    private final JSONArray pending = new JSONArray();
    private Uri camUri = null;

    private WebView web;
    private Brain brain;
    private Updater updater;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private long chatId = 0;
    private volatile boolean busy = false;
    private volatile boolean cancel = false;
    private final Handler ui = new Handler(Looper.getMainLooper());

    /**
     * If the last run crashed, show the report instead of starting normally.
     *
     * Reading it here, in a healthy process, is what makes it reliable: the
     * crashing process only had to manage a file write.
     */
    private boolean showPendingCrash() {
        try {
            java.io.File f = NovaApp.internalReport(this);
            if (!f.exists() || f.length() == 0) return false;
            String report = CodeTools.readAll(f);
            f.delete();
            try {
                NovaApp.externalReport().delete();
            } catch (Throwable t) {
                // best effort
            }
            Intent i = new Intent(this, CrashActivity.class);
            i.putExtra("report", report);
            startActivity(i);
            finish();
            return true;
        } catch (Throwable t) {
            return false;
        }
    }

    /** Record a startup failure and show it, instead of dying silently. */
    private void crashNow(Throwable t) {
        String report = NovaApp.describe(t);
        try {
            NovaApp.write(NovaApp.internalReport(this), report);
        } catch (Throwable t2) {
            // carry on; the intent extra below still carries the text
        }
        try {
            Intent i = new Intent(this, CrashActivity.class);
            i.putExtra("report", report);
            startActivity(i);
            finish();
        } catch (Throwable t2) {
            throw new RuntimeException(report, t);
        }
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        // Belt and braces: the Application already installed this, but if the
        // manifest entry is ever lost the activity still records crashes.
        NovaApp.install(getApplicationContext());
        if (showPendingCrash()) return;
        try {
            startUp();
        } catch (Throwable t) {
            // Starting up is the one place a failure is fatal and invisible:
            // the process dies before anything can report it. Catching here
            // turns a silent close into a readable screen.
            crashNow(t);
        }
    }

    private void startUp() {
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setContentView(R.layout.main);

        brain = new Brain(this);
        web = (WebView) findViewById(R.id.web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDefaultTextEncodingName("UTF-8");
        s.setAllowFileAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        if (android.os.Build.VERSION.SDK_INT >= 21) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                if (url.startsWith("http")) {
                    openUrl(url);
                    return true;
                }
                return false;
            }
        });

        web.addJavascriptInterface(new Bridge(), "Native");
        // Loading the interface is the one step that must not be skipped, so
        // each optional extra below is isolated: a device without TTS, or a
        // stored UI file that went bad, must not stop the app from starting.
        String start = "file:///android_asset/ui.html";
        try {
            updater = new Updater(this);
            start = updater.startUrl();
        } catch (Throwable t) {
            updater = null;
        }
        web.loadUrl(start);

        // Look for a newer interface in the background. The running screen is
        // never swapped out from under the user; the new one appears next
        // launch, the way app updates normally behave.
        try {
            if (updater != null) {
                updater.checkAsync(Cfg.load(this), new Updater.Listener() {
                    public void onChecked(int v) {
                        if (v > 0) emit("onUpdate", String.valueOf(v));
                    }
                });
            }
        } catch (Throwable t) {
            // no update check this launch
        }

        // text to speech, Bengali if the device has it
        try {
            tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
                public void onInit(int status) {
                    if (status == TextToSpeech.SUCCESS) {
                        try {
                            int r = tts.setLanguage(new Locale("bn", "BD"));
                            if (r == TextToSpeech.LANG_MISSING_DATA
                                    || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                                tts.setLanguage(Locale.US);
                            }
                            ttsReady = true;
                        } catch (Throwable t) {
                            ttsReady = false;
                        }
                    }
                }
            });
        } catch (Throwable t) {
            tts = null;
        }
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }

    @Override
    public boolean onKeyDown(int code, KeyEvent e) {
        if (code == KeyEvent.KEYCODE_BACK) {
            web.evaluateJavascript("window.onBack && window.onBack()", null);
            return true;
        }
        return super.onKeyDown(code, e);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_VOICE && res == RESULT_OK && data != null) {
            ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (r != null && !r.isEmpty()) emit("onVoice", r.get(0));
            emit("onMicState", "0");
            return;
        }
        if (req == REQ_VOICE) {
            emit("onMicState", "0");
            return;
        }
        if (res != RESULT_OK) return;

        if (req == REQ_CAM) {
            if (camUri != null) ingest(camUri, true);
            camUri = null;
            return;
        }
        if (req == REQ_PICK || req == REQ_FILE) {
            final boolean img = (req == REQ_PICK);
            if (data == null) return;
            // multi-select comes back in ClipData
            android.content.ClipData cd = null;
            try {
                cd = data.getClipData();
            } catch (Throwable ignore) {
                cd = null;
            }
            if (cd != null) {
                int n = cd.getItemCount();
                if (n > 5) n = 5;
                for (int i = 0; i < n; i++) ingest(cd.getItemAt(i).getUri(), img);
            } else if (data.getData() != null) {
                ingest(data.getData(), img);
            }
        }
    }

    // ================= attachments =================

    /** Read a content:// uri off the UI thread and stage it for the next send. */
    private void ingest(final Uri u, final boolean asImage) {
        if (u == null) return;
        new Thread(new Runnable() {
            public void run() {
                try {
                    String name = displayName(u);
                    String mime = getContentResolver().getType(u);
                    if (mime == null) mime = asImage ? "image/jpeg" : "text/plain";
                    boolean isImg = asImage || mime.startsWith("image/");

                    byte[] raw = readAll(u, isImg ? 12 * 1024 * 1024 : 400 * 1024);
                    if (raw == null) {
                        emit("onError", getString(R.string.e_attach));
                        return;
                    }

                    JSONObject a = new JSONObject();
                    a.put("name", name);
                    a.put("mime", mime);
                    if (isImg) {
                        byte[] small = Img.shrink(raw, 1100, 78);
                        if (small == null) small = raw;
                        a.put("kind", "image");
                        a.put("mime", "image/jpeg");
                        a.put("data", b64(small));
                        a.put("size", small.length);
                    } else {
                        String txt = new String(raw, "UTF-8");
                        if (txt.length() > 60000) txt = txt.substring(0, 60000);
                        a.put("kind", "text");
                        a.put("data", txt);
                        a.put("size", raw.length);
                    }
                    synchronized (pending) {
                        pending.put(a);
                    }
                    JSONObject chip = new JSONObject();
                    chip.put("name", name);
                    chip.put("kind", a.optString("kind"));
                    chip.put("size", a.optInt("size", 0));
                    emit("onAttach", chip.toString());
                } catch (Throwable e) {
                    emit("onError", getString(R.string.e_attach));
                }
            }
        }).start();
    }

    private String displayName(Uri u) {
        try {
            android.database.Cursor c = getContentResolver()
                    .query(u, null, null, null, null);
            if (c != null) {
                int i = c.getColumnIndex("_display_name");
                String n = null;
                if (c.moveToFirst() && i >= 0) n = c.getString(i);
                c.close();
                if (n != null && n.length() > 0) return n;
            }
        } catch (Throwable ignore) {
            // fall through
        }
        String s = u.getLastPathSegment();
        return s == null ? "file" : s;
    }

    private byte[] readAll(Uri u, int limit) {
        java.io.InputStream in = null;
        try {
            in = getContentResolver().openInputStream(u);
            if (in == null) return null;
            java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n, total = 0;
            while ((n = in.read(buf)) > 0) {
                total += n;
                if (total > limit) return null;
                bo.write(buf, 0, n);
            }
            return bo.toByteArray();
        } catch (Throwable e) {
            return null;
        } finally {
            try {
                if (in != null) in.close();
            } catch (Throwable ignore) {
                // closed
            }
        }
    }

    /** Base64 without android.util.Base64 line wrapping surprises. */
    private String b64(byte[] d) {
        return android.util.Base64.encodeToString(d, android.util.Base64.NO_WRAP);
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            // no browser installed
        }
    }

    /** Push an event into the WebView. */
    private void emit(final String fn, final Object arg) {
        final String js = (arg instanceof String)
                ? fn + "(" + JSONObject.quote((String) arg) + ")"
                : fn + "(" + arg + ")";
        ui.post(new Runnable() {
            public void run() {
                try {
                    if (android.os.Build.VERSION.SDK_INT >= 19) {
                        web.evaluateJavascript(js, null);
                    } else {
                        web.loadUrl("javascript:" + js);
                    }
                } catch (Exception e) {
                    // view gone
                }
            }
        });
    }

    // ================= JS bridge =================
    public class Bridge {

        @JavascriptInterface
        public String getConfig() {
            JSONObject c = Cfg.load(MainActivity.this);
            try {
                String k = c.optString("api_key", "");
                String uk = c.optString("user_key", "");
                c.put("has_key", k.length() > 0);
                c.put("api_key", k.length() > 0
                        ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                          + k.substring(Math.max(0, k.length() - 4))
                        : "");
                c.put("user_key", uk.length() > 0
                        ? "\u2022\u2022\u2022\u2022" + uk.substring(Math.max(0, uk.length() - 4))
                        : "");
                c.put("using_baked", c.optBoolean("using_baked", false));
                c.put("has_baked", Cfg.hasBaked());
                c.put("relay_url", Cfg.relayUrl(MainActivity.this));
                JSONObject provs = new JSONObject();
                for (String p : Cfg.PROVIDERS) {
                    JSONObject o = new JSONObject();
                    o.put("label", label(p));
                    o.put("model", Cfg.defaultModel(p));
                    o.put("key_url", Cfg.keyUrl(p));
                    o.put("needs_key", Cfg.needsKey(p));
                    o.put("is_relay", Cfg.isRelay(p));
                    provs.put(p, o);
                }
                c.put("providers", provs);
            } catch (Exception e) {
                // ignore
            }
            return c.toString();
        }

        private String label(String p) {
            int id = getResources().getIdentifier("prov_" + p, "string", getPackageName());
            return id != 0 ? getString(id) : p;
        }

        /**
         * Point the coding agent at a real folder on the phone.
         *
         * Returns a status string rather than a boolean so the UI can show the
         * actual reason a folder was refused instead of a generic failure.
         */
        @JavascriptInterface
        public String setProject(String path) {
            if (path != null && path.trim().length() > 0 && !canRead()) {
                askRead();
                return getString(R.string.proj_perm);
            }
            String err = Workspace.setProject(MainActivity.this, path);
            if (err.length() > 0) {
                return getString(R.string.proj_bad) + " (" + err + ")";
            }
            return "OK " + Workspace.projectPath(MainActivity.this);
        }

        /** Current project path, or "" when the agent is on the scratch pad. */
        @JavascriptInterface
        public String getProject() {
            return Workspace.projectPath(MainActivity.this);
        }

        /** A quick summary the settings pane can show without a model call. */
        @JavascriptInterface
        public String projectInfo() {
            return CodeTools.projectInfo(MainActivity.this);
        }

        @JavascriptInterface
        public String createAgents() {
            return CodeTools.writeDefaultAgents(MainActivity.this);
        }

        @JavascriptInterface
        public boolean hasAgents() {
            return CodeTools.hasAgents(MainActivity.this);
        }

        /**
         * Best-effort guesses for where the user's project might be.
         *
         * Typing an absolute path on a phone keyboard is miserable, and there is
         * no folder picker available on the old API level this app targets, so
         * the next best thing is to offer the folders that actually exist.
         */
        @JavascriptInterface
        public String suggestProjects() {
            org.json.JSONArray out = new org.json.JSONArray();
            String[] roots = {
                    "/sdcard", "/storage/emulated/0",
                    "/storage/emulated/0/AppProjects",
                    "/storage/emulated/0/AIDE",
                    "/storage/emulated/0/Download",
                    "/storage/emulated/0/Documents",
            };
            java.util.HashSet<String> seen = new java.util.HashSet<String>();
            for (String r : roots) {
                java.io.File d = new java.io.File(r);
                if (!d.isDirectory() || !d.canRead()) continue;
                java.io.File[] kids = d.listFiles();
                if (kids == null) continue;
                for (java.io.File k : kids) {
                    if (out.length() >= 20) break;
                    if (!k.isDirectory() || k.getName().startsWith(".")) continue;
                    boolean isProject =
                            new java.io.File(k, "AndroidManifest.xml").exists()
                            || new java.io.File(k, "build.gradle").exists()
                            || new java.io.File(k, "project.properties").exists()
                            || new java.io.File(k, "src").isDirectory();
                    if (!isProject) continue;
                    String path = k.getAbsolutePath();
                    if (seen.add(path)) out.put(path);
                }
            }
            return out.toString();
        }

        /** Send a new provider key to the relay so every phone gains it. */
        @JavascriptInterface
        public void addKey(final String key, final String admin) {
            new Thread(new Runnable() {
                public void run() {
                    String msg;
                    try {
                        JSONObject cfg = Cfg.load(MainActivity.this);
                        if (!Cfg.isRelay(cfg.optString("provider"))) {
                            emit("onKeyAdd", getString(R.string.e_addkey_norelay));
                            return;
                        }
                        String base = cfg.optString("relay_url", "");
                        while (base.endsWith("/")) {
                            base = base.substring(0, base.length() - 1);
                        }
                        JSONObject body = new JSONObject();
                        body.put("key", key);

                        java.net.HttpURLConnection c =
                                (java.net.HttpURLConnection)
                                new java.net.URL(base + "/keys/add").openConnection();
                        c.setRequestMethod("POST");
                        c.setDoOutput(true);
                        c.setConnectTimeout(20000);
                        c.setReadTimeout(60000);
                        c.setRequestProperty("Content-Type", "application/json");
                        c.setRequestProperty("Authorization", "Bearer " + admin);
                        java.io.OutputStream o = c.getOutputStream();
                        o.write(body.toString().getBytes("UTF-8"));
                        o.flush();
                        o.close();

                        int code = c.getResponseCode();
                        String resp = brain.readAllFull(
                                code >= 400 ? c.getErrorStream() : c.getInputStream());
                        c.disconnect();

                        JSONObject j = new JSONObject(resp);
                        if (code >= 400) {
                            JSONObject e = j.optJSONObject("error");
                            msg = e != null ? e.optString("message", "error")
                                            : ("error " + code);
                        } else if (!j.optBoolean("added", false)) {
                            msg = "OK" + getString(R.string.ui_addkey_dup);
                        } else {
                            msg = "OK" + getString(R.string.ui_addkey_ok,
                                    j.optString("provider"), j.optInt("total", 1));
                        }
                    } catch (Throwable e) {
                        msg = String.valueOf(e);
                    }
                    emit("onKeyAdd", msg);
                }
            }).start();
        }

        @JavascriptInterface
        public void saveConfig(String json) {
            try {
                Cfg.save(MainActivity.this, new JSONObject(json));
            } catch (Exception e) {
                // ignore
            }
        }

        @JavascriptInterface
        public void resetPersona() {
            Cfg.resetPersona(MainActivity.this);
        }

        @JavascriptInterface
        public String listChats() {
            return Memory.get(MainActivity.this).listChats().toString();
        }

        @JavascriptInterface
        public String getMessages(String id) {
            long cid = Long.parseLong(id);
            chatId = cid;
            return Memory.get(MainActivity.this).getMessages(cid).toString();
        }

        @JavascriptInterface
        public void deleteChat(String id) {
            long cid = Long.parseLong(id);
            Memory.get(MainActivity.this).deleteChat(cid);
            if (cid == chatId) chatId = 0;
        }

        @JavascriptInterface
        public void newChat() {
            chatId = 0;
        }

        @JavascriptInterface
        public String facts() {
            return Memory.get(MainActivity.this).facts().toString();
        }

        @JavascriptInterface
        public void addFact(String k, String v) {
            Memory.get(MainActivity.this).remember(k, v);
        }

        @JavascriptInterface
        public void delFact(String k) {
            Memory.get(MainActivity.this).forget(k);
        }

        @JavascriptInterface
        public String str(String name) {
            int id = getResources().getIdentifier(name, "string", getPackageName());
            return id != 0 ? getString(id) : name;
        }

        @JavascriptInterface
        public void openLink(String url) {
            openUrl(url);
        }

        // ---------- phone features ----------

        @JavascriptInterface
        public void copy(final String text) {
            ui.post(new Runnable() {
                public void run() {
                    try {
                        ClipboardManager cm = (ClipboardManager)
                                getSystemService(Context.CLIPBOARD_SERVICE);
                        cm.setPrimaryClip(ClipData.newPlainText("NOVA", text));
                    } catch (Exception e) {
                        // ignore
                    }
                }
            });
        }

        @JavascriptInterface
        public void share(final String text) {
            ui.post(new Runnable() {
                public void run() {
                    try {
                        Intent i = new Intent(Intent.ACTION_SEND);
                        i.setType("text/plain");
                        i.putExtra(Intent.EXTRA_TEXT, text);
                        startActivity(Intent.createChooser(i, getString(R.string.ui_share)));
                    } catch (Exception e) {
                        // ignore
                    }
                }
            });
        }

        @JavascriptInterface
        public void speak(final String text) {
            if (!ttsReady || tts == null) return;
            ui.post(new Runnable() {
                public void run() {
                    try {
                        String t = text.length() > 3800 ? text.substring(0, 3800) : text;
                        if (android.os.Build.VERSION.SDK_INT >= 21) {
                            tts.speak(t, TextToSpeech.QUEUE_FLUSH, null, "nova");
                        } else {
                            tts.speak(t, TextToSpeech.QUEUE_FLUSH, null);
                        }
                    } catch (Exception e) {
                        // ignore
                    }
                }
            });
        }

        @JavascriptInterface
        public void voice() {
            ui.post(new Runnable() {
                public void run() {
                    try {
                        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "bn-BD");
                        i.putExtra(RecognizerIntent.EXTRA_PROMPT, getString(R.string.ui_listening));
                        emit("onMicState", "1");
                        startActivityForResult(i, REQ_VOICE);
                    } catch (Exception e) {
                        emit("onMicState", "0");
                        emit("onError", getString(R.string.e_novoice));
                    }
                }
            });
        }

        @JavascriptInterface
        public void vibrate(final int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                if (android.os.Build.VERSION.SDK_INT >= 26) {
                    v.vibrate(VibrationEffect.createOneShot(ms,
                            VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(ms);
                }
            } catch (Exception e) {
                // no vibrator
            }
        }

        @JavascriptInterface
        public void stop() {
            cancel = true;
            if (tts != null) tts.stop();
        }

        // ---------- chat ----------

        @JavascriptInterface
        public void send(final String text) {
            fire(text, true);
        }

        /** Retry the last question without storing it twice. */
        @JavascriptInterface
        public void resend(final String text) {
            fire(text, false);
        }

        /**
         * Fire one tiny request and report exactly what came back.
         * Guessing from a failed chat is slow; this names the real cause.
         */
        @JavascriptInterface
        public void testKey(final String provider, final String model,
                            final String keyMaybe) {
            new Thread(new Runnable() {
                public void run() {
                    String msg;
                    try {
                        JSONObject cfg = Cfg.load(MainActivity.this);
                        cfg.put("provider", provider);
                        cfg.put("model", model);
                        if (keyMaybe != null && keyMaybe.length() > 0
                                && keyMaybe.charAt(0) != '\u2022') {
                            cfg.put("api_key", keyMaybe);
                        }
                        msg = brain.ping(cfg);

                        // The chosen model failed. Rather than leave the user
                        // guessing which ids their key covers, go and find out.
                        if (!"OK".equals(msg)) {
                            emit("onTest", getString(R.string.ui_finding));
                            String found = brain.probeModels(cfg);
                            if (found != null && found.startsWith("[")
                                    && found.length() > 2) {
                                JSONArray a = new JSONArray(found);
                                StringBuilder sb = new StringBuilder();
                                sb.append(getString(R.string.ui_works_list)).append('\n');
                                for (int i = 0; i < a.length(); i++) {
                                    sb.append("\u2022 ").append(a.optString(i)).append('\n');
                                }
                                emit("onModels", a.toString());
                                msg = msg + "\n\n" + sb.toString().trim();
                            } else {
                                msg = msg + "\n\n" + getString(R.string.ui_none_work);
                            }
                        }
                    } catch (Throwable e) {
                        msg = String.valueOf(e);
                    }
                    emit("onTest", msg);
                }
            }).start();
        }

        @JavascriptInterface
        public void pickImage() {
            ui.post(new Runnable() {
                public void run() {
                    try {
                        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                        i.setType("image/*");
                        i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                        i.addCategory(Intent.CATEGORY_OPENABLE);
                        startActivityForResult(
                                Intent.createChooser(i, getString(R.string.ui_sheet_photos)),
                                REQ_PICK);
                    } catch (Throwable e) {
                        emit("onError", getString(R.string.e_noapp));
                    }
                }
            });
        }

        @JavascriptInterface
        public void pickFile() {
            ui.post(new Runnable() {
                public void run() {
                    try {
                        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                        i.setType("*/*");
                        i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                        i.addCategory(Intent.CATEGORY_OPENABLE);
                        startActivityForResult(
                                Intent.createChooser(i, getString(R.string.ui_sheet_files)),
                                REQ_FILE);
                    } catch (Throwable e) {
                        emit("onError", getString(R.string.e_noapp));
                    }
                }
            });
        }

        @JavascriptInterface
        public void camera() {
            ui.post(new Runnable() {
                public void run() {
                    if (android.os.Build.VERSION.SDK_INT >= 23) {
                        try {
                            if (checkSelfPermission("android.permission.CAMERA") != 0) {
                                requestPermissions(
                                        new String[]{"android.permission.CAMERA"}, REQ_CAMPERM);
                                return;
                            }
                        } catch (Throwable ignore) {
                            // older behaviour
                        }
                    }
                    shoot();
                }
            });
        }

        /** Drop a staged attachment (user tapped x on the chip). */
        @JavascriptInterface
        public void dropAttach(int index) {
            synchronized (pending) {
                JSONArray keep = new JSONArray();
                for (int i = 0; i < pending.length(); i++) {
                    if (i != index) keep.put(pending.opt(i));
                }
                while (pending.length() > 0) remove0(pending);
                for (int i = 0; i < keep.length(); i++) pending.put(keep.opt(i));
            }
        }

        @JavascriptInterface
        public void clearAttach() {
            synchronized (pending) {
                while (pending.length() > 0) remove0(pending);
            }
        }

        /** True when the current model can actually look at images. */
        @JavascriptInterface
        public boolean canSeeImages() {
            return Brain.visionModel(Cfg.load(MainActivity.this).optString("model", ""));
        }

        @JavascriptInterface
        public String visionModelId() {
            return Cfg.VISION_MODEL;
        }

        /**
         * Write text to the public Downloads folder.
         * Returns the display path, or "" on failure.
         */
        @JavascriptInterface
        public String download(final String name, final String text) {
            if (!canWrite()) {
                askWrite();
                return "";
            }
            final String fn = safeName(name);
            String res = "";
            try {
                if (android.os.Build.VERSION.SDK_INT >= 29) {
                    res = downloadQ(fn, text);
                } else {
                    res = downloadLegacy(fn, text);
                }
            } catch (Exception e) {
                res = "";
            }
            final String r = res;
            ui.post(new Runnable() {
                public void run() {
                    int id = r.length() > 0 ? R.string.ui_dl_ok : R.string.ui_dl_fail;
                    android.widget.Toast.makeText(MainActivity.this,
                            getString(id) + (r.length() > 0 ? "\n" + r : ""),
                            android.widget.Toast.LENGTH_LONG).show();
                }
            });
            return r;
        }
    }

    /** JSONArray.remove is API 19; keep a shim so minSdk 21 builds stay safe. */
    private void remove0(JSONArray a) {
        try {
            a.remove(0);
        } catch (Throwable e) {
            // should not happen on API 21+
        }
    }

    private void shoot() {
        try {
            java.io.File dir = new java.io.File(getFilesDir(), "cam");
            if (!dir.exists()) dir.mkdirs();
            java.io.File f = new java.io.File(dir, "shot" + System.currentTimeMillis() + ".jpg");
            Uri out;
            if (android.os.Build.VERSION.SDK_INT >= 24) {
                out = NovaFiles.getUriForFile(this, getPackageName() + ".files", f);
            } else {
                out = Uri.fromFile(f);
            }
            camUri = out;
            Intent i = new Intent("android.media.action.IMAGE_CAPTURE");
            i.putExtra("output", out);
            i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(i, REQ_CAM);
        } catch (Throwable e) {
            camUri = null;
            emit("onError", getString(R.string.e_nocam));
        }
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        if (req == REQ_CAMPERM) {
            if (res != null && res.length > 0 && res[0] == 0) shoot();
        } else if (req == REQ_READ) {
            boolean ok = res != null && res.length > 0 && res[0] == 0;
            emit("onStorage", ok ? "OK" : getString(R.string.proj_perm));
        }
    }

    /**
     * Reading the user's project folder needs a runtime grant from API 23.
     *
     * On API 30+ plain READ_EXTERNAL_STORAGE no longer covers arbitrary folders;
     * the honest answer there is that the user must grant all-files access in
     * system settings, which {@link #askRead} sends them to.
     */
    private boolean canRead() {
        if (android.os.Build.VERSION.SDK_INT < 23) return true;
        try {
            if (checkSelfPermission(
                    "android.permission.READ_EXTERNAL_STORAGE") == 0) {
                return true;
            }
        } catch (Throwable t) {
            return true;
        }
        return false;
    }

    private void askRead() {
        ui.post(new Runnable() {
            public void run() {
                try {
                    requestPermissions(
                            new String[]{"android.permission.READ_EXTERNAL_STORAGE"},
                            REQ_READ);
                } catch (Throwable t) {
                    // nothing we can do
                }
            }
        });
        if (android.os.Build.VERSION.SDK_INT >= 30) allFilesAccess();
    }

    /**
     * Scoped storage blocks folder-wide reads, so send the user to the
     * all-files toggle. Built from string literals because the constants do
     * not resolve against the old android.jar AIDE compiles with.
     */
    private void allFilesAccess() {
        try {
            startActivity(new android.content.Intent(
                    "android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION",
                    android.net.Uri.parse("package:" + getPackageName())));
        } catch (Throwable t) {
            try {
                startActivity(new android.content.Intent(
                        "android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION"));
            } catch (Throwable t2) {
                // some ROMs expose neither screen
            }
        }
    }

    /** Legacy external storage needs a runtime grant on API 23..28. */
    private boolean canWrite() {
        int sdk = android.os.Build.VERSION.SDK_INT;
        if (sdk < 23 || sdk >= 29) return true;
        try {
            return checkSelfPermission(
                    "android.permission.WRITE_EXTERNAL_STORAGE") == 0;
        } catch (Throwable t) {
            return true;
        }
    }

    private void askWrite() {
        ui.post(new Runnable() {
            public void run() {
                try {
                    requestPermissions(
                            new String[]{"android.permission.WRITE_EXTERNAL_STORAGE"},
                            REQ_STORE);
                } catch (Throwable t) {
                    // nothing we can do
                }
            }
        });
    }

    private String safeName(String n) {
        if (n == null || n.length() == 0) n = "nova";
        n = n.replaceAll("[\\\\/:*?\"<>|\\n\\r\\t]", "_").trim();
        if (n.length() > 60) n = n.substring(0, 60);
        if (n.length() == 0) n = "nova";
        return n;
    }

    /**
     * Android 10+ scoped storage.
     * Column names and the Downloads URI are written as plain literals on purpose:
     * MediaStore.Downloads is API 29 and does not exist in AIDE's older android.jar.
     * Using literals keeps this file compilable against any SDK.
     */
    private String downloadQ(String fn, String text) throws Exception {
        android.content.ContentValues v = new android.content.ContentValues();
        v.put("_display_name", fn);
        v.put("mime_type", mimeOf(fn));
        v.put("relative_path", "Download/NOVA");
        Uri u = getContentResolver().insert(
                Uri.parse("content://media/external/downloads"), v);
        if (u == null) return "";
        java.io.OutputStream os = getContentResolver().openOutputStream(u);
        os.write(text.getBytes("UTF-8"));
        os.flush();
        os.close();
        return "Download/NOVA/" + fn;
    }

    private String downloadLegacy(String fn, String text) throws Exception {
        java.io.File dir = new java.io.File(
                android.os.Environment.getExternalStoragePublicDirectory("Download"), "NOVA");
        if (!dir.exists() && !dir.mkdirs()) {
            dir = getExternalFilesDir("Download");
            if (dir == null) return "";
        }
        java.io.File f = new java.io.File(dir, fn);
        java.io.OutputStream os = new java.io.FileOutputStream(f);
        os.write(text.getBytes("UTF-8"));
        os.flush();
        os.close();
        try {
            sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE,
                    Uri.fromFile(f)));
        } catch (Exception ignore) {
            // no scanner
        }
        return f.getAbsolutePath();
    }

    private String mimeOf(String fn) {
        String l = fn.toLowerCase(Locale.US);
        if (l.endsWith(".md")) return "text/markdown";
        if (l.endsWith(".json")) return "application/json";
        if (l.endsWith(".html")) return "text/html";
        if (l.endsWith(".csv")) return "text/csv";
        return "text/plain";
    }


        private void fire(final String text, final boolean store) {
            if (busy) return;
            busy = true;
            cancel = false;
            new Thread(new Runnable() {
                public void run() {
                    try {
                        runChat(text, store);
                    } catch (Exception e) {
                        emit("onError", String.valueOf(e));
                    } finally {
                        busy = false;
                        emit("onDone", "");
                    }
                }
            }).start();
        }

    // ================= chat turn =================
    private void runChat(String text, boolean store) {
        final JSONObject cfg = Cfg.load(this);
        String prov = cfg.optString("provider", Cfg.DEFAULT_PROVIDER);

        if (Cfg.needsKey(prov) && cfg.optString("api_key", "").length() == 0) {
            emit("onError", getString(R.string.e_nokey) + " " + Cfg.keyUrl(prov));
            return;
        }

        final Memory mem = Memory.get(this);
        if (chatId == 0) {
            chatId = mem.newChat(text.length() > 40 ? text.substring(0, 40) : text);
            emit("onChat", String.valueOf(chatId));
        }
        // take ownership of whatever the picker staged
        JSONArray atts = new JSONArray();
        synchronized (pending) {
            for (int i = 0; i < pending.length(); i++) atts.put(pending.opt(i));
            while (pending.length() > 0) remove0(pending);
        }

        boolean hasImage = false;
        StringBuilder note = new StringBuilder();
        for (int i = 0; i < atts.length(); i++) {
            JSONObject a = atts.optJSONObject(i);
            if (a == null) continue;
            if ("image".equals(a.optString("kind"))) hasImage = true;
            note.append(note.length() == 0 ? "" : ", ").append(a.optString("name"));
        }

        // A text-only model 400s on image parts, so hop to the vision model
        // for this turn only. The saved config is untouched.
        if (hasImage && !Brain.visionModel(cfg.optString("model", ""))) {
            if ("groq".equals(prov) || "openrouter".equals(prov)) {
                try {
                    cfg.put("model", Cfg.VISION_MODEL);
                } catch (Exception ignore) {
                    // keep the old model and let Brain degrade gracefully
                }
                emit("onNote", getString(R.string.ui_vision_switch));
            }
        }

        if (store) {
            String logged = text;
            if (note.length() > 0) logged = text + "\n\n[\uD83D\uDCCE " + note + "]";
            mem.addMessage(chatId, "user", logged);
        }

        JSONArray messages = brain.buildMessages(cfg, chatId, text, atts);
        final StringBuilder acc = new StringBuilder();

        brain.chat(cfg, messages, new Brain.Sink() {
            public void token(String t) {
                acc.append(t);
                emit("onToken", t);
            }

            public void tool(String name) {
                emit("onTool", name);
            }

            public void error(String msg) {
                emit("onError", msg);
            }

            public void note(String msg) {
                emit("onNote", msg);
            }

            public boolean cancelled() {
                return cancel;
            }
        });

        String answer = acc.toString();
        if (answer.trim().length() > 0) {
            mem.addMessage(chatId, "assistant", answer);
            if (mem.countMessages(chatId) <= 2) {
                String t = brain.quick(cfg, getString(R.string.title_prompt) + "\n"
                        + (text.length() > 200 ? text.substring(0, 200) : text));
                t = t.replace("\"", "").replace("\u0964", "").trim();
                if (t.length() > 0) {
                    mem.renameChat(chatId, t);
                    emit("onTitle", t);
                }
            }
        }
    }
}
