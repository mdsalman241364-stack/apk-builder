package com.salman.swadhin;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;

/**
 * Swadhin AI - the brain.
 * Talks to any OpenAI compatible endpoint with SSE streaming plus tool calling.
 * Uses only HttpURLConnection, no third party HTTP library.
 */
public class Brain {

    public interface Sink {
        void token(String t);
        void tool(String name);
        void error(String msg);
        /** Non-fatal status the user should see, e.g. an account switch. */
        void note(String msg);
        /** Return true to abort the stream (user pressed stop). */
        boolean cancelled();
    }

    private final Context ctx;

    public Brain(Context c) {
        ctx = c.getApplicationContext();
    }

    // ---------------- system prompt ----------------

    public String systemPrompt(JSONObject cfg) {
        StringBuilder sb = new StringBuilder(cfg.optString("persona", ""));
        // Training data has a cutoff; without a real clock the model states stale
        // years as fact. Cheap to add, removes a whole class of confident errors.
        try {
            java.text.SimpleDateFormat f = new java.text.SimpleDateFormat(
                    "EEEE, d MMMM yyyy, HH:mm", java.util.Locale.US);
            sb.append("\n\n[").append(ctx.getString(R.string.p_now)).append(": ")
              .append(f.format(new java.util.Date())).append("]");
        } catch (Exception e) {
            // clock unavailable, carry on
        }
        if (cfg.optBoolean("memory_on", true)) sb.append(Memory.get(ctx).factsBlock(ctx));
        if (cfg.optBoolean("tools_on", true)) {
            sb.append("\n\n").append(ctx.getString(R.string.tools_note));
        }
        if (cfg.optBoolean("tools_on", true) && cfg.optBoolean("agent_on", true)) {
            sb.append("\n\n").append(ctx.getString(R.string.agent_note));
            sb.append(projectBlock());
        }
        return sb.toString();
    }

    /**
     * Facts about the project the agent is pointed at.
     *
     * Sent every turn because the alternative is the model guessing a package
     * name or inventing a folder that is not there, then editing the wrong
     * file. The block stays small: root path, tree, and any AGENTS.md rules.
     */
    private String projectBlock() {
        StringBuilder sb = new StringBuilder();
        try {
            if (!Workspace.inProject(ctx)) {
                sb.append("\n\n[").append(ctx.getString(R.string.p_project))
                  .append("]\n").append(ctx.getString(R.string.proj_none));
                return sb.toString();
            }
            sb.append("\n\n[").append(ctx.getString(R.string.p_project)).append("]\n");
            sb.append(CodeTools.projectInfo(ctx));
            String tree = CodeTools.structure(ctx, 3);
            if (tree.length() > 2500) tree = tree.substring(0, 2500) + "\n…";
            sb.append('\n').append(tree);

            String rules = CodeTools.agentsFor(ctx, "");
            if (rules.length() > 0) {
                if (rules.length() > 6000) rules = rules.substring(0, 6000) + "\n…";
                sb.append("\n\n[AGENTS.md]\n").append(rules);
            }
        } catch (Exception e) {
            // a missing project must never break an ordinary chat turn
        }
        return sb.toString();
    }

    public JSONArray buildMessages(JSONObject cfg, long chatId, String userText) {
        return buildMessages(cfg, chatId, userText, null);
    }

    /**
     * @param atts optional array of attachments. Each entry is a JSONObject with
     *             kind ("image" | "text"), name, mime and data
     *             (base64 for images, plain text for documents).
     */
    public JSONArray buildMessages(JSONObject cfg, long chatId, String userText,
                                   JSONArray atts) {
        JSONArray msgs = new JSONArray();
        try {
            JSONObject sys = new JSONObject();
            sys.put("role", "system");
            sys.put("content", systemPrompt(cfg));
            msgs.put(sys);
            if (chatId > 0) {
                JSONArray hist = Memory.get(ctx)
                        .recentTurns(chatId, cfg.optInt("history_turns", 12));
                for (int i = 0; i < hist.length(); i++) msgs.put(hist.opt(i));
            }
            JSONObject u = new JSONObject();
            u.put("role", "user");

            JSONArray imgs = new JSONArray();
            StringBuilder docs = new StringBuilder();
            if (atts != null) {
                for (int i = 0; i < atts.length(); i++) {
                    JSONObject a = atts.optJSONObject(i);
                    if (a == null) continue;
                    String kind = a.optString("kind", "");
                    if ("image".equals(kind)) {
                        String d = a.optString("data", "");
                        if (d.length() == 0) continue;
                        String mime = a.optString("mime", "image/jpeg");
                        JSONObject iu = new JSONObject();
                        iu.put("url", "data:" + mime + ";base64," + d);
                        JSONObject part = new JSONObject();
                        part.put("type", "image_url");
                        part.put("image_url", iu);
                        imgs.put(part);
                    } else {
                        String d = a.optString("data", "");
                        if (d.length() == 0) continue;
                        docs.append("\n\n--- ")
                            .append(a.optString("name", "file"))
                            .append(" ---\n")
                            .append(d);
                    }
                }
            }

            String body = userText;
            if (docs.length() > 0) body = body + docs.toString();

            if (imgs.length() > 0 && visionOk(cfg)) {
                JSONArray parts = new JSONArray();
                JSONObject tp = new JSONObject();
                tp.put("type", "text");
                tp.put("text", body.length() > 0 ? body : " ");
                parts.put(tp);
                for (int i = 0; i < imgs.length(); i++) parts.put(imgs.opt(i));
                u.put("content", parts);
            } else {
                if (imgs.length() > 0) {
                    body = body + "\n\n[" + ctx.getString(R.string.e_novision) + "]";
                }
                u.put("content", body);
            }
            msgs.put(u);
        } catch (Exception e) {
            // ignore
        }
        return msgs;
    }

    /** Only some models accept image parts; sending them elsewhere is a 400. */
    public static boolean visionModel(String model) {
        if (model == null) return false;
        String m = model.toLowerCase(java.util.Locale.US);
        return m.contains("llama-4") || m.contains("scout") || m.contains("maverick")
                || m.contains("gemini") || m.contains("gpt-4o") || m.contains("gpt-4.1")
                || m.contains("vision") || m.contains("llava") || m.contains("qwen2.5vl")
                || m.contains("qwen2-vl") || m.contains("gemma3") || m.contains("gemma-3") || m.contains("pixtral")
                || m.contains("claude") || m.contains("minicpm");
    }

    private boolean visionOk(JSONObject cfg) {
        return visionModel(cfg.optString("model", ""));
    }

    // ---------------- main streaming loop ----------------

    /** Research chains legitimately need several hops; 5 cut them off too early. */
    private static final int MAX_DEPTH = 8;

    /**
     * Coding is far more step-hungry than research: read, search, edit, verify
     * is already four calls for one small change, and a real task is several of
     * those in a row. Cutting at 8 leaves the model stranded mid-edit, which is
     * worse than letting it run longer.
     */
    private static final int AGENT_DEPTH = 24;

    private static int maxDepth(JSONObject cfg) {
        return cfg.optBoolean("agent_on", true) ? AGENT_DEPTH : MAX_DEPTH;
    }

    public String chat(JSONObject cfg, JSONArray messages, Sink sink) {
        return chat(cfg, messages, sink, 0);
    }

    private String chat(JSONObject cfg, JSONArray messages, Sink sink, int depth) {
        boolean useTools = cfg.optBoolean("tools_on", true) && depth < maxDepth(cfg);
        String body = payload(cfg, messages, useTools);

        HttpURLConnection conn = null;
        try {
            conn = open(cfg, body);
            int code = conn.getResponseCode();

            // 429 and 5xx are usually transient on a free tier. Backing off twice
            // turns a visible failure into a short pause the user never notices.
            int tries = 0;
            while ((code == 429 || code >= 500) && tries < 2 && !sink.cancelled()) {
                int waitMs = retryAfterMs(conn, tries);
                conn.disconnect();
                try {
                    Thread.sleep(waitMs);
                } catch (InterruptedException ie) {
                    break;
                }
                conn = open(cfg, body);
                code = conn.getResponseCode();
                tries++;
            }

            // Some models reject the tools field. Only a malformed-payload
            // status means that; a 429 or 5xx must NOT strip the tools, or the
            // model answers with <function(...)> typed out as plain text.
            if ((code == 400 || code == 422) && useTools) {
                conn.disconnect();
                conn = open(cfg, payload(cfg, messages, false));
                code = conn.getResponseCode();
            }

            // last resort: a model id that does not exist on this provider
            if (code == 404 && !cfg.optString("model").equals(Cfg.defaultModel(
                    cfg.optString("provider", Cfg.DEFAULT_PROVIDER)))) {
                conn.disconnect();
                JSONObject alt = copyCfg(cfg);
                try {
                    alt.put("model", Cfg.defaultModel(cfg.optString("provider", Cfg.DEFAULT_PROVIDER)));
                } catch (Exception ignore) {
                    // keep going with what we have
                }
                conn = open(alt, payload(alt, messages, useTools));
                code = conn.getResponseCode();
            }

            // Quota gone or provider down: switch to the backup account rather
            // than showing the user an error. Only from the primary, so a failing
            // backup cannot bounce us back and forth.
            if ((code == 429 || code >= 500) && !cfg.optBoolean("is_backup", false)
                    && !Cfg.isRelay(cfg.optString("provider"))) {
                JSONObject alt = Cfg.backup(ctx, cfg);
                if (alt != null) {
                    conn.disconnect();
                    sink.note(ctx.getString(R.string.n_switched,
                            alt.optString("provider"), alt.optString("model")));
                    return chat(alt, messages, sink, depth);
                }
            }

            if (code >= 400) {
                sink.error(httpError(cfg, code, readAll(conn.getErrorStream())));
                return "";
            }

            StringBuilder text = new StringBuilder();
            HashMap<Integer, String[]> calls = new HashMap<Integer, String[]>();

            BufferedReader r = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), "UTF-8"), 8192);
            String line;
            while ((line = r.readLine()) != null) {
                if (sink.cancelled()) break;
                if (!line.startsWith("data:")) continue;
                String data = line.substring(5).trim();
                if ("[DONE]".equals(data)) break;
                JSONObject chunk;
                try {
                    chunk = new JSONObject(data);
                } catch (Exception e) {
                    continue;
                }
                JSONArray choices = chunk.optJSONArray("choices");
                if (choices == null || choices.length() == 0) continue;
                JSONObject delta = choices.optJSONObject(0).optJSONObject("delta");
                if (delta == null) continue;

                String t = delta.optString("content", "");
                if (t.length() > 0) {
                    text.append(t);
                    sink.token(t);
                }

                JSONArray tc = delta.optJSONArray("tool_calls");
                if (tc != null) {
                    for (int i = 0; i < tc.length(); i++) {
                        JSONObject c = tc.optJSONObject(i);
                        if (c == null) continue;
                        int idx = c.optInt("index", 0);
                        String[] slot = calls.get(idx);
                        if (slot == null) {
                            slot = new String[]{"", "", ""}; // id, name, args
                            calls.put(idx, slot);
                        }
                        String id = c.optString("id", "");
                        if (id.length() > 0) slot[0] = id;
                        JSONObject fn = c.optJSONObject("function");
                        if (fn != null) {
                            String n = fn.optString("name", "");
                            if (n.length() > 0) slot[1] = n;
                            slot[2] = slot[2] + fn.optString("arguments", "");
                        }
                    }
                }
            }
            r.close();
            conn.disconnect();

            if (calls.isEmpty() || sink.cancelled()) return text.toString();

            // ---- run the tools, then ask again ----
            JSONArray toolCalls = new JSONArray();
            for (int i = 0; i < 16; i++) {
                String[] s = calls.get(i);
                if (s == null || s[1].length() == 0) continue;
                JSONObject fn = new JSONObject();
                fn.put("name", s[1]);
                fn.put("arguments", s[2].length() == 0 ? "{}" : s[2]);
                JSONObject c = new JSONObject();
                c.put("id", s[0].length() == 0 ? "call_" + i : s[0]);
                c.put("type", "function");
                c.put("function", fn);
                toolCalls.put(c);
            }
            if (toolCalls.length() == 0) return text.toString();

            JSONObject asst = new JSONObject();
            asst.put("role", "assistant");
            if (text.length() > 0) asst.put("content", text.toString());
            asst.put("tool_calls", toolCalls);
            messages.put(asst);

            for (int i = 0; i < toolCalls.length(); i++) {
                JSONObject c = toolCalls.getJSONObject(i);
                JSONObject fn = c.getJSONObject("function");
                String name = fn.getString("name");
                JSONObject args;
                try {
                    args = new JSONObject(fn.getString("arguments"));
                } catch (Exception e) {
                    args = new JSONObject();
                }
                sink.tool(name);
                String result;
                try {
                    result = Tools.run(ctx, name, args);
                } catch (Throwable te) {
                    // A tool must never kill the turn; report and let the model adapt.
                    result = "tool error: " + te;
                }
                if (result == null) result = "(no result)";
                if (result.length() > 6000) result = result.substring(0, 6000);
                JSONObject tm = new JSONObject();
                tm.put("role", "tool");
                tm.put("tool_call_id", c.getString("id"));
                tm.put("name", name);
                tm.put("content", result);
                messages.put(tm);
            }

            return text + chat(cfg, messages, sink, depth + 1);

        } catch (java.net.UnknownHostException e) {
            sink.error(ctx.getString(R.string.e_net));
            return "";
        } catch (java.net.SocketTimeoutException e) {
            sink.error(ctx.getString(R.string.e_timeout));
            return "";
        } catch (Exception e) {
            sink.error(String.valueOf(e));
            return "";
        } finally {
            if (conn != null) {
                try { conn.disconnect(); } catch (Exception ignored) { }
            }
        }
    }

    // ---------------- helpers ----------------


    /** Honour Retry-After when the server sends it, otherwise back off 1s then 3s. */
    private int retryAfterMs(HttpURLConnection c, int attempt) {
        try {
            String h = c.getHeaderField("retry-after");
            if (h != null) {
                double s = Double.parseDouble(h.trim());
                int ms = (int) (s * 1000);
                if (ms > 0 && ms < 20000) return ms;
            }
        } catch (Exception e) {
            // header missing or not a number
        }
        return attempt == 0 ? 1000 : 3000;
    }

    private JSONObject copyCfg(JSONObject c) {
        try {
            return new JSONObject(c.toString());
        } catch (Exception e) {
            return c;
        }
    }

    private String payload(JSONObject cfg, JSONArray messages, boolean tools) {
        try {
            JSONObject p = new JSONObject();
            p.put("model", cfg.optString("model"));
            p.put("messages", messages);
            p.put("temperature", cfg.optDouble("temperature", 0.8));
            p.put("max_tokens", cfg.optInt("max_tokens", 2048));
            p.put("stream", true);
            if (tools) p.put("tools", Tools.schemas(ctx));
            return p.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    private HttpURLConnection open(JSONObject cfg, String body) throws Exception {
        String url = Cfg.endpoint(cfg);
        if (url.length() == 0) throw new java.io.IOException("no endpoint");
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setConnectTimeout(30000);
        c.setReadTimeout(180000);
        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        c.setRequestProperty("Accept", "text/event-stream");
        String key = cfg.optString("api_key", "");
        if (key.length() > 0) c.setRequestProperty("Authorization", "Bearer " + key);
        if ("openrouter".equals(cfg.optString("provider"))) {
            c.setRequestProperty("HTTP-Referer", "https://swadhin.local");
            c.setRequestProperty("X-Title", "Swadhin AI");
        }
        OutputStream o = c.getOutputStream();
        o.write(body.getBytes("UTF-8"));
        o.flush();
        o.close();
        return c;
    }

    private String readAll(java.io.InputStream in) {
        if (in == null) return "";
        try {
            BufferedReader r = new BufferedReader(new InputStreamReader(in, "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String l;
            while ((l = r.readLine()) != null && sb.length() < 700) sb.append(l);
            r.close();
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * Providers bury the useful sentence inside {"error":{"message":...}}.
     * Showing the raw JSON blob helps nobody, so pull the message out and add
     * the provider and model actually used, which is what the fix depends on.
     */
    private String httpError(JSONObject cfg, int code, String body) {
        String detail = apiMessage(body);
        String model = cfg.optString("model", "");
        String where = model.length() > 0
                ? "\n(" + cfg.optString("provider") + " / " + model + ")"
                : "\n(" + cfg.optString("provider") + ")";

        // Relay first: a 401 from it means either a bad access code or a key
        // the server holds, and "check AI Studio" is wrong advice either way.
        if (Cfg.isRelay(cfg.optString("provider"))
                && (code == 401 || code == 403)) {
            String low = detail.toLowerCase(java.util.Locale.US);
            if (low.contains("api key") || low.contains("unauthorized")
                    || low.contains("permission")) {
                return ctx.getString(R.string.e_relay_key) + where;
            }
            return ctx.getString(R.string.e_code) + where;
        }
        if (code == 400 && detail.toLowerCase(java.util.Locale.US).contains("api key")) {
            return ctx.getString(R.string.e_key) + "\n" + detail + where;
        }
        if (code == 401 || code == 403) {
            return ctx.getString(R.string.e_key)
                    + (detail.length() > 0 ? "\n" + detail : "") + where;
        }
        if (code == 429) {
            // Providers bury "try again in 1h26m33s" inside an English wall of
            // text. Pull the wait out and say it plainly instead.
            String wait = waitHint(detail);
            if (wait.length() > 0) {
                return ctx.getString(R.string.e_rate_wait, wait);
            }
            return ctx.getString(R.string.e_rate);
        }
        if (code == 404 || code == 400) {
            return ctx.getString(R.string.e_model)
                    + (detail.length() > 0 ? "\n" + detail : "") + where;
        }
        return ctx.getString(R.string.e_server) + " " + code
                + (detail.length() > 0 ? "\n" + detail : "") + where;
    }

    /**
     * Turn "Please try again in 1h26m33.504s" into "১ ঘণ্টা ২৬ মিনিট".
     * Returns "" when no wait could be read.
     */
    private String waitHint(String detail) {
        if (detail == null || detail.length() == 0) return "";
        try {
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("(?:try again in|retry after)\\s*"
                            + "(?:(\\d+)h)?(?:(\\d+)m)?(?:([\\d.]+)s)?",
                            java.util.regex.Pattern.CASE_INSENSITIVE)
                    .matcher(detail);
            if (!m.find()) return "";
            int h = m.group(1) != null ? Integer.parseInt(m.group(1)) : 0;
            int min = m.group(2) != null ? Integer.parseInt(m.group(2)) : 0;
            int sec = m.group(3) != null
                    ? (int) Double.parseDouble(m.group(3)) : 0;
            if (h == 0 && min == 0 && sec > 0) min = 1;   // round up
            if (h == 0 && min == 0) return "";
            StringBuilder sb = new StringBuilder();
            if (h > 0) sb.append(ctx.getString(R.string.t_hours, h));
            if (min > 0) {
                if (sb.length() > 0) sb.append(' ');
                sb.append(ctx.getString(R.string.t_minutes, min));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private String apiMessage(String body) {
        if (body == null || body.length() == 0) return "";
        try {
            JSONObject o = new JSONObject(body);
            JSONObject err = o.optJSONObject("error");
            if (err != null) {
                String m = err.optString("message", "");
                if (m.length() > 0) return m.length() > 400 ? m.substring(0, 400) : m;
            }
            String m = o.optString("message", "");
            if (m.length() > 0) return m;
        } catch (Exception e) {
            // not JSON, fall through to the raw text
        }
        return body.length() > 300 ? body.substring(0, 300) : body;
    }

    /** Short non streaming call - used for auto naming a chat. */
    /**
     * Ask the provider which models this key may call, then verify them.
     *
     * A listing is not proof: Gemini happily lists paid models a free key cannot
     * use. So each candidate gets one 5-token request, and only the ones that
     * genuinely answer are reported back.
     */
    public String probeModels(JSONObject cfg) {
        try {
            String url = Cfg.isRelay(cfg.optString("provider"))
                    ? "" : Cfg.modelsUrl(cfg.optString("provider"),
                            cfg.optString("ollama_url"));
            if (url.length() == 0) return "[]";

            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setRequestMethod("GET");
            c.setConnectTimeout(20000);
            c.setReadTimeout(30000);
            String key = cfg.optString("api_key", "");
            if (key.length() > 0) c.setRequestProperty("Authorization", "Bearer " + key);
            int code = c.getResponseCode();
            String body = readAllFull(code >= 400 ? c.getErrorStream() : c.getInputStream());
            c.disconnect();
            if (code >= 400) return "ERR" + httpError(cfg, code, body);

            JSONArray data = new JSONObject(body).optJSONArray("data");
            if (data == null) return "[]";

            // rank chat-capable ids, cheapest/highest-quota first
            java.util.ArrayList<String> ids = new java.util.ArrayList<String>();
            for (int i = 0; i < data.length(); i++) {
                JSONObject m = data.optJSONObject(i);
                if (m == null) continue;
                String id = m.optString("id", "");
                if (id.startsWith("models/")) id = id.substring(7);
                if (id.length() == 0) continue;
                String l = id.toLowerCase(java.util.Locale.US);
                if (l.contains("embed") || l.contains("aqa") || l.contains("imagen")
                        || l.contains("veo") || l.contains("tts") || l.contains("image")
                        || l.contains("whisper") || l.contains("guard")
                        || l.contains("live") || l.contains("native-audio")) continue;
                ids.add(id);
            }

            JSONArray ok = new JSONArray();
            int tested = 0;
            for (int pass = 0; pass < 2 && ok.length() < 6; pass++) {
                for (int i = 0; i < ids.size() && ok.length() < 6 && tested < 14; i++) {
                    String id = ids.get(i);
                    String l = id.toLowerCase(java.util.Locale.US);
                    boolean cheap = l.contains("gemma") || l.contains("lite")
                            || l.contains("flash") || l.contains("8b")
                            || l.contains("instant");
                    // first pass: only the high-quota ids; second pass: the rest
                    if (pass == 0 ? !cheap : cheap) continue;
                    tested++;
                    JSONObject probe = new JSONObject(cfg.toString());
                    probe.put("model", id);
                    if ("OK".equals(ping(probe))) ok.put(id);
                }
            }
            return ok.toString();
        } catch (Exception e) {
            return "ERR" + e;
        }
    }

    /**
     * Minimal non-streaming call used by the key tester.
     * Returns "OK" or a human-readable reason.
     */
    public String ping(JSONObject cfg) {
        HttpURLConnection conn = null;
        try {
            if (cfg.optString("api_key", "").length() == 0
                    && Cfg.needsKey(cfg.optString("provider"))) {
                return ctx.getString(R.string.e_nokey);
            }
            JSONObject m = new JSONObject();
            m.put("role", "user");
            m.put("content", "hi");
            JSONArray arr = new JSONArray();
            arr.put(m);
            JSONObject p = new JSONObject();
            p.put("model", cfg.optString("model"));
            p.put("messages", arr);
            p.put("max_tokens", 5);
            conn = open(cfg, p.toString());
            int code = conn.getResponseCode();
            if (code >= 400) {
                return httpError(cfg, code, readAll(conn.getErrorStream()));
            }
            readAllFull(conn.getInputStream());
            return "OK";
        } catch (java.net.UnknownHostException e) {
            return ctx.getString(R.string.e_net);
        } catch (Exception e) {
            return String.valueOf(e);
        } finally {
            if (conn != null) {
                try { conn.disconnect(); } catch (Exception ignored) { }
            }
        }
    }

    public String quick(JSONObject cfg, String prompt) {
        HttpURLConnection conn = null;
        try {
            JSONObject m = new JSONObject();
            m.put("role", "user");
            m.put("content", prompt);
            JSONArray arr = new JSONArray();
            arr.put(m);
            JSONObject p = new JSONObject();
            p.put("model", cfg.optString("model"));
            p.put("messages", arr);
            p.put("max_tokens", 40);
            p.put("temperature", 0.3);
            conn = open(cfg, p.toString());
            if (conn.getResponseCode() >= 400) return "";
            String all = readAllFull(conn.getInputStream());
            JSONObject o = new JSONObject(all);
            return o.getJSONArray("choices").getJSONObject(0)
                    .getJSONObject("message").optString("content", "").trim();
        } catch (Exception e) {
            return "";
        } finally {
            if (conn != null) {
                try { conn.disconnect(); } catch (Exception ignored) { }
            }
        }
    }

    public String readAllFull(java.io.InputStream in) throws Exception {
        BufferedReader r = new BufferedReader(new InputStreamReader(in, "UTF-8"));
        StringBuilder sb = new StringBuilder();
        String l;
        while ((l = r.readLine()) != null) sb.append(l);
        r.close();
        return sb.toString();
    }
}
