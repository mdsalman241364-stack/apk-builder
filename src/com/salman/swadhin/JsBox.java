package com.salman.swadhin;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.ValueCallback;
import android.webkit.WebView;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * A real JavaScript interpreter the model can call.
 *
 * Why a second WebView instead of the UI one: evaluating model-written code in the
 * chat WebView would let it reach our Native bridge and rewrite the interface. This
 * one is headless, never attached to the view tree, has no JavascriptInterface, and
 * loads about:blank, so the code runs against a bare JS engine with no DOM of ours
 * and no way back into the app.
 *
 * evaluateJavascript is async and must be called on the main thread, but tools run
 * on a worker thread and need a return value, so a CountDownLatch bridges the two.
 */
final class JsBox {

    private static final int TIMEOUT_SEC = 8;

    private static WebView box;
    private static final Handler UI = new Handler(Looper.getMainLooper());

    private JsBox() {
    }

    /** The engine keeps state between calls, so variables survive across turns. */
    @SuppressLint("SetJavaScriptEnabled")
    private static void ensure(final Context ctx) throws Exception {
        if (box != null) return;
        final CountDownLatch made = new CountDownLatch(1);
        UI.post(new Runnable() {
            public void run() {
                try {
                    WebView w = new WebView(ctx.getApplicationContext());
                    w.getSettings().setJavaScriptEnabled(true);
                    w.getSettings().setDomStorageEnabled(false);
                    w.getSettings().setAllowFileAccess(false);
                    w.getSettings().setAllowContentAccess(false);
                    w.loadDataWithBaseURL(null, "<html><body></body></html>",
                            "text/html", "utf-8", null);
                    box = w;
                } catch (Throwable t) {
                    box = null;
                }
                made.countDown();
            }
        });
        made.await(6, TimeUnit.SECONDS);
        if (box == null) throw new Exception("no engine");
        // give the blank page a moment to finish parsing
        Thread.sleep(160);
    }

    /**
     * Runs code and returns whatever it produced.
     *
     * The snippet is wrapped so that console.log output is captured and the value of
     * the last expression is reported, the way a REPL behaves. Errors come back as
     * text rather than being thrown, because the model reads the result either way.
     */
    static String eval(Context ctx, String code) {
        if (code == null || code.trim().length() == 0) return "empty code";
        try {
            ensure(ctx);
        } catch (Throwable t) {
            return "JS engine unavailable";
        }

        String wrapped =
            "(function(){var __o=[];" +
            "var console={log:function(){var a=[];for(var i=0;i<arguments.length;i++)" +
            "a.push(__fmt(arguments[i]));__o.push(a.join(' '))}," +
            "error:function(){console.log.apply(null,arguments)}," +
            "warn:function(){console.log.apply(null,arguments)}," +
            "info:function(){console.log.apply(null,arguments)}};" +
            "function __fmt(v){try{" +
            "if(typeof v==='string')return v;" +
            "if(v===undefined)return 'undefined';if(v===null)return 'null';" +
            "if(typeof v==='function')return '[function]';" +
            "return JSON.stringify(v,null,1)}catch(e){return String(v)}}" +
            "var __r;try{__r=eval(" + q(code) + ")}catch(e){" +
            "return JSON.stringify({e:(e&&e.message)?String(e.message):String(e)})}" +
            "var __v=(__r===undefined)?'':__fmt(__r);" +
            "return JSON.stringify({o:__o.join('\\n'),v:__v})})()";

        final String js = wrapped;
        final StringBuilder out = new StringBuilder();
        final CountDownLatch done = new CountDownLatch(1);

        UI.post(new Runnable() {
            public void run() {
                try {
                    if (android.os.Build.VERSION.SDK_INT >= 19) {
                        box.evaluateJavascript(js, new ValueCallback<String>() {
                            public void onReceiveValue(String v) {
                                out.append(v == null ? "" : v);
                                done.countDown();
                            }
                        });
                    } else {
                        out.append("needs Android 4.4+");
                        done.countDown();
                    }
                } catch (Throwable t) {
                    out.append("eval failed");
                    done.countDown();
                }
            }
        });

        try {
            // a runaway loop would otherwise hang the tool call forever
            if (!done.await(TIMEOUT_SEC, TimeUnit.SECONDS)) {
                reset();
                return "timed out after " + TIMEOUT_SEC + "s (infinite loop?)";
            }
        } catch (InterruptedException e) {
            return "interrupted";
        }

        return unpack(out.toString());
    }

    /**
     * evaluateJavascript hands back a JSON-encoded string, so the payload is quoted
     * twice: once by our own JSON.stringify, once by the WebView.
     */
    private static String unpack(String raw) {
        if (raw == null || raw.length() == 0) return "(no result)";
        try {
            String inner = new org.json.JSONTokener(raw).nextValue().toString();
            org.json.JSONObject o = new org.json.JSONObject(inner);
            if (o.has("e")) return "Error: " + o.optString("e");
            String logs = o.optString("o", "");
            String val = o.optString("v", "");
            StringBuilder sb = new StringBuilder();
            if (logs.length() > 0) sb.append(logs);
            if (val.length() > 0) {
                if (sb.length() > 0) sb.append("\n");
                sb.append("=> ").append(val);
            }
            String s = sb.toString();
            if (s.length() == 0) return "(ran, no output)";
            if (s.length() > 6000) s = s.substring(0, 6000) + "\n...(truncated)";
            return s;
        } catch (Throwable t) {
            return raw.length() > 4000 ? raw.substring(0, 4000) : raw;
        }
    }

    /** Throw the engine away, e.g. after a timeout left it spinning. */
    static void reset() {
        UI.post(new Runnable() {
            public void run() {
                try {
                    if (box != null) box.destroy();
                } catch (Throwable ignore) {
                    // already gone
                }
                box = null;
            }
        });
    }

    /** Quote a Java string as a JS string literal. */
    private static String q(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"' || c == '\\') b.append('\\').append(c);
            else if (c == '\n') b.append("\\n");
            else if (c == '\r') b.append("\\r");
            else if (c == '\t') b.append("\\t");
            else if (c < 0x20 || c == 0x2028 || c == 0x2029) {
                b.append(String.format(java.util.Locale.US, "\\u%04x", (int) c));
            } else b.append(c);
        }
        return b.append('"').toString();
    }
}
