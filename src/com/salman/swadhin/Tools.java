package com.salman.swadhin;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Swadhin AI - tools the model can call on its own.
 * Pure Android framework, no third party libraries.
 */
public class Tools {

    private static final String UA =
            "Mozilla/5.0 (Linux; Android 13; Mobile) SwadhinAI/1.0";

    // ---------------- schemas ----------------

    private static JSONObject tool(String name, String desc, JSONObject props, String[] req) {
        try {
            JSONObject fn = new JSONObject();
            fn.put("name", name);
            fn.put("description", desc);
            JSONObject par = new JSONObject();
            par.put("type", "object");
            par.put("properties", props);
            par.put("required", new JSONArray(java.util.Arrays.asList(req)));
            fn.put("parameters", par);
            JSONObject t = new JSONObject();
            t.put("type", "function");
            t.put("function", fn);
            return t;
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    /** One property with a real description, so the model picks the right tool. */
    private static JSONObject p1(String name, String type, String desc) {
        JSONObject o = new JSONObject();
        try {
            JSONObject s = new JSONObject();
            s.put("type", type);
            s.put("description", desc);
            o.put(name, s);
        } catch (Exception e) {
            // ignore
        }
        return o;
    }

    private static JSONObject merge(JSONObject a, JSONObject b) {
        try {
            JSONArray k = b.names();
            if (k != null) {
                for (int i = 0; i < k.length(); i++) {
                    String n = k.optString(i);
                    a.put(n, b.opt(n));
                }
            }
        } catch (Exception e) {
            // ignore
        }
        return a;
    }

    private static JSONObject str(String... names) {
        JSONObject o = new JSONObject();
        try {
            for (String n : names) {
                JSONObject s = new JSONObject();
                s.put("type", "string");
                o.put(n, s);
            }
        } catch (Exception e) {
            // ignore
        }
        return o;
    }

    public static JSONArray schemas(Context c) {
        JSONArray a = new JSONArray();
        a.put(tool("web_search", c.getString(R.string.t_search),
                str("query"), new String[]{"query"}));
        a.put(tool("read_url", c.getString(R.string.t_readurl),
                str("url"), new String[]{"url"}));
        a.put(tool("calculate", c.getString(R.string.t_calc),
                str("expression"), new String[]{"expression"}));
        a.put(tool("remember_fact", c.getString(R.string.t_remember),
                str("key", "value"), new String[]{"key", "value"}));
        a.put(tool("recall_facts", c.getString(R.string.t_recall),
                new JSONObject(), new String[]{}));
        a.put(tool("save_note", c.getString(R.string.t_note),
                str("text"), new String[]{"text"}));
        a.put(tool("find_notes", c.getString(R.string.t_findnote),
                str("query"), new String[]{"query"}));
        a.put(tool("current_time", c.getString(R.string.t_time),
                new JSONObject(), new String[]{}));
        a.put(tool("device_info", c.getString(R.string.t_device),
                new JSONObject(), new String[]{}));
        a.put(tool("write_file", c.getString(R.string.t_write),
                str("path", "content"), new String[]{"path", "content"}));
        a.put(tool("read_file", c.getString(R.string.t_read),
                merge(p1("path", "string", "File to read, relative to the workspace root."),
                      merge(p1("start_line", "integer",
                               "Optional first line to return (1 based)."),
                            p1("end_line", "integer",
                               "Optional last line to return."))),
                new String[]{"path"}));
        a.put(tool("list_files", c.getString(R.string.t_list),
                p1("path", "string",
                   "Folder to list, relative to the workspace root. "
                   + "Empty means the root itself."),
                new String[]{}));

        // ---- reasoning + execution ----
        a.put(tool("run_code", c.getString(R.string.t_code),
                p1("code", "string",
                   "JavaScript to execute. Use console.log or end with an expression "
                   + "to produce output. State persists between calls."),
                new String[]{"code"}));
        a.put(tool("think", c.getString(R.string.t_think),
                p1("plan", "string",
                   "Private scratchpad: break the problem down, weigh options, "
                   + "decide the next step. Not shown to the user."),
                new String[]{"plan"}));
        a.put(tool("critique", c.getString(R.string.t_critique),
                p1("draft", "string",
                   "A draft answer to check for errors, gaps and wrong assumptions "
                   + "before it is shown."),
                new String[]{"draft"}));

        // ---- richer research ----
        a.put(tool("deep_research", c.getString(R.string.t_deep),
                p1("query", "string", "Topic to research across several sources."),
                new String[]{"query"}));
        a.put(tool("wikipedia", c.getString(R.string.t_wiki),
                merge(p1("topic", "string", "Article subject."),
                      p1("lang", "string", "Wiki language code, e.g. bn or en.")),
                new String[]{"topic"}));
        a.put(tool("extract_links", c.getString(R.string.t_links),
                p1("url", "string", "Page whose outgoing links should be listed."),
                new String[]{"url"}));

        // ---- memory + files ----
        a.put(tool("recall_chat", c.getString(R.string.t_recallchat),
                p1("query", "string", "Search every past conversation for this text."),
                new String[]{"query"}));
        a.put(tool("delete_file", c.getString(R.string.t_del),
                p1("path", "string", "File inside the workspace to delete."),
                new String[]{"path"}));
        a.put(tool("append_file", c.getString(R.string.t_append),
                merge(p1("path", "string", "File to append to; created if absent."),
                      p1("content", "string", "Text to add at the end.")),
                new String[]{"path", "content"}));

        // ---- coding agent ----
        a.put(tool("project_info", c.getString(R.string.t_projinfo),
                new JSONObject(), new String[]{}));
        a.put(tool("project_structure", c.getString(R.string.t_structure),
                p1("depth", "integer", "How many folder levels to show. Default 4."),
                new String[]{}));
        a.put(tool("search_code", c.getString(R.string.t_searchcode),
                merge(p1("query", "string",
                         "Text to find. Set regex=true to treat it as a "
                         + "regular expression."),
                      merge(p1("file_pattern", "string",
                               "Optional filename filter such as *.java."),
                            p1("regex", "boolean",
                               "Treat query as a regular expression."))),
                new String[]{"query"}));
        a.put(tool("find_symbol", c.getString(R.string.t_symbol),
                p1("symbol", "string",
                   "Class, method, field or resource id to locate the "
                   + "declaration of."),
                new String[]{"symbol"}));
        a.put(tool("find_references", c.getString(R.string.t_refs),
                p1("symbol", "string", "Name to find every usage of."),
                new String[]{"symbol"}));
        a.put(tool("file_info", c.getString(R.string.t_finfo),
                p1("path", "string", "File or folder to describe."),
                new String[]{"path"}));
        a.put(tool("create_file", c.getString(R.string.t_create),
                merge(p1("path", "string",
                         "New file path. Parent folders are created. "
                         + "Fails if the file already exists."),
                      p1("content", "string", "Full contents of the new file.")),
                new String[]{"path", "content"}));
        a.put(tool("edit_file", c.getString(R.string.t_edit),
                merge(p1("path", "string", "File to modify."),
                      merge(p1("old_text", "string",
                               "Exact existing text to replace, copied "
                               + "character for character including indentation. "
                               + "Must be unique in the file unless all=true."),
                            merge(p1("new_text", "string",
                                     "Replacement text. Empty string deletes."),
                                  p1("all", "boolean",
                                     "Replace every occurrence instead of "
                                     + "requiring a unique match.")))),
                new String[]{"path", "old_text", "new_text"}));
        a.put(tool("make_dir", c.getString(R.string.t_mkdir),
                p1("path", "string", "Folder to create."),
                new String[]{"path"}));
        a.put(tool("analyze_code", c.getString(R.string.t_analyze),
                p1("path", "string", "Java or XML file to check structurally."),
                new String[]{"path"}));
        a.put(tool("build_check", c.getString(R.string.t_build),
                new JSONObject(), new String[]{}));
        a.put(tool("read_agents", c.getString(R.string.t_agents),
                p1("path", "string",
                   "Optional file or folder whose applicable AGENTS.md rules "
                   + "should be collected."),
                new String[]{}));
        return a;
    }

    // ---------------- dispatcher ----------------

    public static String run(Context ctx, String name, JSONObject a) {
        try {
            if ("web_search".equals(name)) return webSearch(a.optString("query"));
            if ("read_url".equals(name)) return readUrl(a.optString("url"));
            if ("calculate".equals(name)) return calculate(a.optString("expression"));
            if ("remember_fact".equals(name)) {
                Memory.get(ctx).remember(a.optString("key"), a.optString("value"));
                return ctx.getString(R.string.r_remembered);
            }
            if ("recall_facts".equals(name)) {
                JSONArray f = Memory.get(ctx).facts();
                return f.length() == 0 ? ctx.getString(R.string.r_nomem) : f.toString();
            }
            if ("save_note".equals(name)) {
                Memory.get(ctx).addNote(a.optString("text"));
                return ctx.getString(R.string.r_noted);
            }
            if ("find_notes".equals(name)) {
                JSONArray n = Memory.get(ctx).searchNotes(a.optString("query"));
                return n.length() == 0 ? ctx.getString(R.string.r_nonote) : n.toString();
            }
            if ("current_time".equals(name)) {
                return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss EEEE", new Locale("bn", "BD"))
                        .format(new Date());
            }
            if ("device_info".equals(name)) return deviceInfo(ctx);
            if ("write_file".equals(name))
                return CodeTools.writeFile(ctx, a.optString("path"),
                        a.optString("content"));
            if ("read_file".equals(name))
                return CodeTools.readFile(ctx, a.optString("path"),
                        a.optInt("start_line", 0), a.optInt("end_line", 0));
            if ("list_files".equals(name))
                return CodeTools.listFiles(ctx, a.optString("path", ""));
            if ("run_code".equals(name)) return JsBox.eval(ctx, a.optString("code"));
            if ("think".equals(name)) {
                // Returning the plan verbatim keeps it in context as an assistant
                // turn, which is what actually improves the next step.
                return "Noted. Now act on it.";
            }
            if ("critique".equals(name)) return critique(a.optString("draft"));
            if ("deep_research".equals(name)) return deepResearch(a.optString("query"));
            if ("wikipedia".equals(name))
                return wikipedia(a.optString("topic"), a.optString("lang", "en"));
            if ("extract_links".equals(name)) return extractLinks(a.optString("url"));
            if ("recall_chat".equals(name))
                return Memory.get(ctx).searchAll(a.optString("query")).toString();
            if ("delete_file".equals(name))
                return CodeTools.deleteFile(ctx, a.optString("path"));
            if ("append_file".equals(name))
                return CodeTools.appendFile(ctx, a.optString("path"),
                        a.optString("content"));

            // ---- coding agent ----
            if ("project_info".equals(name)) return CodeTools.projectInfo(ctx);
            if ("project_structure".equals(name))
                return CodeTools.structure(ctx, a.optInt("depth", 4));
            if ("search_code".equals(name))
                return CodeTools.search(ctx, a.optString("query"),
                        a.optString("file_pattern"), a.optBoolean("regex", false));
            if ("find_symbol".equals(name))
                return CodeTools.findSymbol(ctx, a.optString("symbol"));
            if ("find_references".equals(name))
                return CodeTools.findReferences(ctx, a.optString("symbol"));
            if ("file_info".equals(name))
                return CodeTools.fileInfo(ctx, a.optString("path"));
            if ("create_file".equals(name))
                return CodeTools.createFile(ctx, a.optString("path"),
                        a.optString("content"));
            if ("edit_file".equals(name))
                return CodeTools.editFile(ctx, a.optString("path"),
                        a.optString("old_text"), a.optString("new_text"),
                        a.optBoolean("all", false));
            if ("make_dir".equals(name))
                return CodeTools.makeDir(ctx, a.optString("path"));
            if ("analyze_code".equals(name))
                return CodeTools.analyze(ctx, a.optString("path"));
            if ("build_check".equals(name)) return CodeTools.buildCheck(ctx);
            if ("read_agents".equals(name)) {
                String r = CodeTools.agentsFor(ctx, a.optString("path"));
                return r.length() == 0
                        ? "No AGENTS.md applies to that path."
                        : r;
            }
            return "unknown tool: " + name;
        } catch (Exception e) {
            return "tool error: " + e;
        }
    }

    // ---------------- http ----------------

    private static String httpGet(String u, int timeoutMs) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
        c.setRequestProperty("User-Agent", UA);
        c.setConnectTimeout(timeoutMs);
        c.setReadTimeout(timeoutMs);
        c.setInstanceFollowRedirects(true);
        BufferedReader r = new BufferedReader(new InputStreamReader(
                c.getResponseCode() >= 400 ? c.getErrorStream() : c.getInputStream(), "UTF-8"));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = r.readLine()) != null) {
            sb.append(line).append('\n');
            if (sb.length() > 900000) break;
        }
        r.close();
        c.disconnect();
        return sb.toString();
    }

    private static String stripHtml(String h) {
        h = h.replaceAll("(?is)<(script|style|noscript)[^>]*>.*?</\\1>", " ");
        h = h.replaceAll("(?s)<[^>]+>", " ");
        h = h.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<")
                .replace("&gt;", ">").replace("&quot;", "\"").replace("&#39;", "'")
                .replace("&#x27;", "'");
        return h.replaceAll("[ \\t]+", " ").replaceAll("\\n{3,}", "\n\n").trim();
    }

    // ---------------- search ----------------

    private static String webSearch(String q) {
        try {
            String html = httpGet("https://html.duckduckgo.com/html/?q="
                    + URLEncoder.encode(q, "UTF-8"), 20000);
            JSONArray out = new JSONArray();
            Matcher m = Pattern.compile(
                    "class=\"[^\"]*result__a[^\"]*\"[^>]+href=\"([^\"]+)\"[^>]*>(.*?)</a>",
                    Pattern.DOTALL).matcher(html);
            ArrayList<String> snips = new ArrayList<String>();
            Matcher sm = Pattern.compile("class=\"result__snippet\"[^>]*>(.*?)</a>",
                    Pattern.DOTALL).matcher(html);
            while (sm.find()) snips.add(stripHtml(sm.group(1)));
            int i = 0;
            while (m.find() && out.length() < 5) {
                String link = m.group(1);
                int ud = link.indexOf("uddg=");
                if (ud >= 0) {
                    link = java.net.URLDecoder.decode(
                            link.substring(ud + 5).split("&")[0], "UTF-8");
                }
                JSONObject o = new JSONObject();
                o.put("title", stripHtml(m.group(2)));
                o.put("url", link);
                if (i < snips.size()) {
                    String s = snips.get(i);
                    o.put("snippet", s.length() > 300 ? s.substring(0, 300) : s);
                }
                out.put(o);
                i++;
            }
            return out.length() == 0 ? "no results" : out.toString();
        } catch (Exception e) {
            return "search failed: " + e;
        }
    }

    private static String readUrl(String u) {
        try {
            if (!u.startsWith("http")) u = "https://" + u;
            String t = stripHtml(httpGet(u, 25000));
            return t.length() > 6000 ? t.substring(0, 6000) + "\n...[truncated]" : t;
        } catch (Exception e) {
            return "cannot read page: " + e;
        }
    }


    // ---------------- reasoning aids ----------------

    /**
     * A checklist rather than a second model call: it costs no tokens and no time,
     * and in practice most bad answers fail one of these obvious tests.
     */
    private static String critique(String draft) {
        StringBuilder w = new StringBuilder();
        if (draft == null) draft = "";
        String d = draft.toLowerCase(Locale.US);

        if (draft.length() < 40) {
            w.append("- Very short. Does it actually answer the question?\n");
        }
        if (d.contains("as an ai") || d.contains("i am an ai")
                || d.contains("language model")) {
            w.append("- Contains an AI disclaimer. Remove it; speak as NOVA.\n");
        }
        if (d.contains("http://") || d.contains("https://")) {
            w.append("- Contains links. Did they come from a tool result, "
                    + "or were they guessed? Never invent URLs.\n");
        }
        if (Pattern.compile("\\b(19|20)\\d{2}\\b").matcher(draft).find()) {
            w.append("- Contains dates. Verify them instead of relying on memory.\n");
        }
        if (Pattern.compile("\\d+(\\.\\d+)?\\s*(%|percent|kg|km|MB|GB)").matcher(d).find()) {
            w.append("- Contains figures with units. Recompute or cite a source.\n");
        }
        if (d.contains("probably") || d.contains("i think")
                || d.contains("might be") || d.contains("mone hoy")) {
            w.append("- Hedged language. Either verify it, or say plainly "
                    + "that you do not know.\n");
        }
        if (d.contains("```")) {
            w.append("- Contains code. Run it with run_code before claiming it works.\n");
        }
        w.append("- Is every part of the question covered?\n");
        w.append("- Is anything asserted that no tool actually confirmed?\n");
        w.append("- Would a developer find this concrete and specific?\n");
        return w.toString();
    }

    // ---------------- research ----------------

    /**
     * Search, then actually open the top hits. A snippet is often too thin to answer
     * from, so the pages get fetched and trimmed into one briefing.
     */
    private static String deepResearch(String q) {
        try {
            String raw = webSearch(q);
            if (raw.startsWith("no results") || raw.startsWith("search failed")) {
                return raw;
            }
            JSONArray hits = new JSONArray(raw);
            StringBuilder sb = new StringBuilder();
            sb.append("Research on: ").append(q).append("\n\n");
            int read = 0;
            for (int i = 0; i < hits.length() && read < 3; i++) {
                JSONObject h = hits.optJSONObject(i);
                if (h == null) continue;
                String url = h.optString("url", "");
                if (url.length() == 0) continue;
                sb.append("### ").append(h.optString("title")).append('\n');
                sb.append(url).append('\n');
                try {
                    String body = stripHtml(httpGet(url, 15000));
                    if (body.length() > 1800) body = body.substring(0, 1800) + "...";
                    sb.append(body).append("\n\n");
                    read++;
                } catch (Exception e) {
                    String s = h.optString("snippet", "");
                    if (s.length() > 0) sb.append(s).append("\n\n");
                }
            }
            // keep the remaining hits as leads, without paying to fetch them
            for (int i = read; i < hits.length(); i++) {
                JSONObject h = hits.optJSONObject(i);
                if (h == null) continue;
                sb.append("- ").append(h.optString("title"))
                  .append(" ").append(h.optString("url")).append('\n');
            }
            String out = sb.toString();
            return out.length() > 9000 ? out.substring(0, 9000) + "\n...[truncated]" : out;
        } catch (Exception e) {
            return "research failed: " + e;
        }
    }

    /** Wikipedia's REST summary endpoint: no key, tiny payload, works in Bengali. */
    private static String wikipedia(String topic, String lang) {
        if (lang == null || lang.length() == 0) lang = "en";
        lang = lang.replaceAll("[^a-zA-Z-]", "");
        try {
            String u = "https://" + lang + ".wikipedia.org/api/rest_v1/page/summary/"
                    + URLEncoder.encode(topic.replace(' ', '_'), "UTF-8");
            String j = httpGet(u, 15000);
            JSONObject o = new JSONObject(j);
            if (o.has("extract")) {
                StringBuilder sb = new StringBuilder();
                sb.append(o.optString("title")).append("\n\n");
                sb.append(o.optString("extract"));
                JSONObject cu = o.optJSONObject("content_urls");
                if (cu != null && cu.optJSONObject("desktop") != null) {
                    sb.append("\n\n").append(cu.optJSONObject("desktop").optString("page"));
                }
                return sb.toString();
            }
            // fall back to search when the exact title does not exist
            if (!"en".equals(lang)) return wikipedia(topic, "en");
            return "no article; try web_search";
        } catch (Exception e) {
            return "wikipedia failed: " + e;
        }
    }

    private static String extractLinks(String u) {
        try {
            if (!u.startsWith("http")) u = "https://" + u;
            String html = httpGet(u, 20000);
            java.net.URL base = new java.net.URL(u);
            Matcher m = Pattern.compile("<a[^>]+href=\"([^\"#][^\"]*)\"[^>]*>(.*?)</a>",
                    Pattern.DOTALL | Pattern.CASE_INSENSITIVE).matcher(html);
            JSONArray out = new JSONArray();
            java.util.HashSet<String> seen = new java.util.HashSet<String>();
            while (m.find() && out.length() < 40) {
                String href = m.group(1);
                String text = stripHtml(m.group(2));
                if (text.length() == 0) continue;
                if (href.startsWith("javascript:") || href.startsWith("mailto:")) continue;
                try {
                    href = new java.net.URL(base, href).toString();
                } catch (Exception ex) {
                    continue;
                }
                if (!seen.add(href)) continue;
                JSONObject o = new JSONObject();
                o.put("text", text.length() > 90 ? text.substring(0, 90) : text);
                o.put("url", href);
                out.put(o);
            }
            return out.length() == 0 ? "no links found" : out.toString();
        } catch (Exception e) {
            return "cannot read page: " + e;
        }
    }

    // ---------------- file extras ----------------



    // ---------------- calculator (recursive descent, no eval) ----------------

    private static String expr;
    private static int pos;

    public static synchronized String calculate(String s) {
        try {
            expr = s.replace(" ", "");
            pos = 0;
            double v = parseExpr();
            if (pos < expr.length()) return "bad expression at " + pos;
            if (v == Math.floor(v) && !Double.isInfinite(v) && Math.abs(v) < 1e15)
                return String.valueOf((long) v);
            return String.valueOf(v);
        } catch (Exception e) {
            return "cannot calculate: " + e.getMessage();
        }
    }

    private static double parseExpr() {
        double v = parseTerm();
        while (pos < expr.length()) {
            char c = expr.charAt(pos);
            if (c == '+') { pos++; v += parseTerm(); }
            else if (c == '-') { pos++; v -= parseTerm(); }
            else break;
        }
        return v;
    }

    private static double parseTerm() {
        double v = parsePow();
        while (pos < expr.length()) {
            char c = expr.charAt(pos);
            if (c == '*') {
                if (pos + 1 < expr.length() && expr.charAt(pos + 1) == '*') {
                    break; // handled in parsePow
                }
                pos++; v *= parsePow();
            } else if (c == '/') { pos++; v /= parsePow(); }
            else if (c == '%') { pos++; v %= parsePow(); }
            else break;
        }
        return v;
    }

    private static double parsePow() {
        double base = parseUnary();
        if (pos + 1 < expr.length() && expr.charAt(pos) == '*' && expr.charAt(pos + 1) == '*') {
            pos += 2;
            return Math.pow(base, parsePow());
        }
        if (pos < expr.length() && expr.charAt(pos) == '^') {
            pos++;
            return Math.pow(base, parsePow());
        }
        return base;
    }

    private static double parseUnary() {
        if (pos < expr.length() && expr.charAt(pos) == '-') { pos++; return -parseUnary(); }
        if (pos < expr.length() && expr.charAt(pos) == '+') { pos++; return parseUnary(); }
        return parseAtom();
    }

    private static double parseAtom() {
        if (pos < expr.length() && expr.charAt(pos) == '(') {
            pos++;
            double v = parseExpr();
            if (pos < expr.length() && expr.charAt(pos) == ')') pos++;
            return v;
        }
        int start = pos;
        while (pos < expr.length() && (Character.isLetter(expr.charAt(pos)))) pos++;
        if (pos > start) {
            String fn = expr.substring(start, pos);
            if ("pi".equalsIgnoreCase(fn)) return Math.PI;
            if ("e".equalsIgnoreCase(fn)) return Math.E;
            double arg = 0;
            if (pos < expr.length() && expr.charAt(pos) == '(') {
                pos++;
                arg = parseExpr();
                if (pos < expr.length() && expr.charAt(pos) == ')') pos++;
            }
            if ("sqrt".equals(fn)) return Math.sqrt(arg);
            if ("sin".equals(fn)) return Math.sin(arg);
            if ("cos".equals(fn)) return Math.cos(arg);
            if ("tan".equals(fn)) return Math.tan(arg);
            if ("log".equals(fn)) return Math.log(arg);
            if ("log10".equals(fn)) return Math.log10(arg);
            if ("exp".equals(fn)) return Math.exp(arg);
            if ("abs".equals(fn)) return Math.abs(arg);
            if ("floor".equals(fn)) return Math.floor(arg);
            if ("ceil".equals(fn)) return Math.ceil(arg);
            if ("round".equals(fn)) return Math.round(arg);
            throw new RuntimeException("unknown function " + fn);
        }
        while (pos < expr.length()
                && (Character.isDigit(expr.charAt(pos)) || expr.charAt(pos) == '.')) pos++;
        if (pos == start) throw new RuntimeException("unexpected char");
        return Double.parseDouble(expr.substring(start, pos));
    }

    // ---------------- device ----------------

    private static String deviceInfo(Context c) {
        StringBuilder sb = new StringBuilder();
        sb.append("device: ").append(Build.MANUFACTURER).append(" ").append(Build.MODEL)
                .append("\nandroid: ").append(Build.VERSION.RELEASE)
                .append(" (sdk ").append(Build.VERSION.SDK_INT).append(")");
        try {
            Intent b = c.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (b != null) {
                int lvl = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int sc = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
                sb.append("\nbattery: ").append(lvl * 100 / (sc == 0 ? 100 : sc)).append("%");
            }
        } catch (Exception e) {
            // battery optional
        }
        Runtime rt = Runtime.getRuntime();
        sb.append("\napp memory: ").append((rt.totalMemory() - rt.freeMemory()) / 1048576)
                .append(" MB / ").append(rt.maxMemory() / 1048576).append(" MB");
        return sb.toString();
    }

    // ---------------- files (sandboxed to app dir) ----------------

    private static File dir(Context c) {
        return Workspace.root(c);
    }

    /**
     * Resolve a model-supplied path inside whatever root is active.
     *
     * Delegates to {@link Workspace}, so when the user has picked a project
     * folder these tools operate on the real project, and when they have not
     * they stay in the private scratch folder exactly as before.
     */
    private static File safe(Context c, String path) throws Exception {
        return Workspace.resolve(c, path);
    }



}
