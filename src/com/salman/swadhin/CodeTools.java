package com.salman.swadhin;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Locale;

/**
 * The tools that let NOVA behave like a coding agent rather than a chatbot
 * that prints snippets.
 *
 * Everything here goes through {@link Workspace#resolve}, so a tool call can
 * never touch a file outside the folder the user chose. Results are written
 * for a language model to read: short, factual, and explicit about failure,
 * because a vague error makes the model invent a recovery that never worked.
 */
public class CodeTools {

    /** A single search hit or listing line is capped so results stay usable. */
    private static final int MAX_HITS = 60;
    private static final int MAX_LINE = 220;

    private CodeTools() {
    }

    // ── reading ──────────────────────────────────────────────────────────

    /** Directory listing, one level, directories first. */
    public static String listFiles(Context c, String path) {
        try {
            File d = Workspace.resolve(c, path == null ? "" : path);
            if (!d.exists()) return "ERROR: no such folder: " + path;
            if (!d.isDirectory()) return "ERROR: not a folder: " + path;

            File[] kids = d.listFiles();
            if (kids == null) return "ERROR: cannot read " + Workspace.rel(c, d);
            if (kids.length == 0) return "(empty folder)";

            StringBuilder dirs = new StringBuilder();
            StringBuilder files = new StringBuilder();
            for (File f : kids) {
                if (f.isDirectory()) {
                    if (Workspace.skipDir(f.getName())) continue;
                    dirs.append(f.getName()).append("/\n");
                } else {
                    files.append(f.getName()).append("  (")
                            .append(Workspace.size(f.length())).append(")\n");
                }
            }
            String out = dirs.toString() + files.toString();
            return out.length() == 0 ? "(nothing readable here)" : out.trim();
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    /**
     * Read a file, optionally a line range.
     *
     * Line numbers are included because every later edit is expressed in terms
     * of exact text, and numbered output makes the model quote it correctly.
     */
    public static String readFile(Context c, String path, int from, int to) {
        try {
            File f = Workspace.resolve(c, path);
            if (!f.exists()) return "ERROR: file not found: " + path;
            if (f.isDirectory()) return "ERROR: that is a folder, not a file";
            if (f.length() > Workspace.MAX_READ && from <= 0) {
                return "ERROR: file is " + Workspace.size(f.length())
                        + ", too big to read whole. Ask for a line range.";
            }

            ArrayList<String> lines = readLines(f);
            int start = from > 0 ? from : 1;
            int end = to > 0 ? Math.min(to, lines.size()) : lines.size();
            if (start > lines.size()) {
                return "ERROR: file has only " + lines.size() + " lines";
            }

            StringBuilder sb = new StringBuilder();
            sb.append(Workspace.rel(c, f)).append("  (")
                    .append(lines.size()).append(" lines)\n");
            for (int i = start; i <= end; i++) {
                sb.append(i).append(": ").append(lines.get(i - 1)).append('\n');
            }
            if (end < lines.size()) {
                sb.append("... ").append(lines.size() - end)
                        .append(" more lines\n");
            }
            return sb.toString();
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    /** Metadata without opening the file. */
    public static String fileInfo(Context c, String path) {
        try {
            File f = Workspace.resolve(c, path);
            if (!f.exists()) return "ERROR: not found: " + path;
            StringBuilder sb = new StringBuilder();
            sb.append("path: ").append(Workspace.rel(c, f)).append('\n');
            sb.append("type: ").append(f.isDirectory() ? "folder" : "file")
                    .append('\n');
            if (f.isFile()) {
                sb.append("size: ").append(Workspace.size(f.length())).append('\n');
                if (Workspace.isText(f.getName())
                        && f.length() < Workspace.MAX_READ) {
                    sb.append("lines: ").append(readLines(f).size()).append('\n');
                }
            }
            sb.append("writable: ").append(f.canWrite()).append('\n');
            return sb.toString();
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    // ── searching ────────────────────────────────────────────────────────

    /** Grep across the project, with file:line context. */
    public static String search(Context c, String query, String glob,
                                boolean regex) {
        if (query == null || query.length() == 0) return "ERROR: empty query";
        try {
            java.util.regex.Pattern pat = null;
            if (regex) {
                try {
                    pat = java.util.regex.Pattern.compile(query);
                } catch (Exception e) {
                    return "ERROR: bad regex: " + e.getMessage();
                }
            }
            String needle = query.toLowerCase(Locale.US);
            ArrayList<String> hits = new ArrayList<String>();
            int[] scanned = {0};
            walk(c, Workspace.root(c), hits, needle, pat, glob, scanned);

            if (hits.isEmpty()) {
                return "No match for \"" + query + "\" in " + scanned[0]
                        + " files.";
            }
            StringBuilder sb = new StringBuilder();
            sb.append(hits.size() >= MAX_HITS
                    ? "First " + MAX_HITS + " matches:\n"
                    : hits.size() + " match(es):\n");
            for (String h : hits) sb.append(h).append('\n');
            return sb.toString();
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    private static void walk(Context c, File dir, ArrayList<String> hits,
                             String needle, java.util.regex.Pattern pat,
                             String glob, int[] scanned) {
        if (hits.size() >= MAX_HITS) return;
        File[] kids = dir.listFiles();
        if (kids == null) return;
        for (File f : kids) {
            if (hits.size() >= MAX_HITS) return;
            if (f.isDirectory()) {
                if (!Workspace.skipDir(f.getName())) {
                    walk(c, f, hits, needle, pat, glob, scanned);
                }
                continue;
            }
            if (!Workspace.isText(f.getName())) continue;
            if (f.length() > Workspace.MAX_READ) continue;
            if (glob != null && glob.length() > 0 && !matches(f.getName(), glob)) {
                continue;
            }
            scanned[0]++;
            try {
                ArrayList<String> lines = readLines(f);
                String rel = Workspace.rel(c, f);
                for (int i = 0; i < lines.size(); i++) {
                    String ln = lines.get(i);
                    boolean hit = pat != null
                            ? pat.matcher(ln).find()
                            : ln.toLowerCase(Locale.US).contains(needle);
                    if (!hit) continue;
                    String shown = ln.trim();
                    if (shown.length() > MAX_LINE) {
                        shown = shown.substring(0, MAX_LINE) + "…";
                    }
                    hits.add(rel + ":" + (i + 1) + ": " + shown);
                    if (hits.size() >= MAX_HITS) return;
                }
            } catch (Exception e) {
                // unreadable file is not worth aborting the whole search
            }
        }
    }

    /** Tiny glob: "*.java", "Main*", "*Activity*". */
    private static boolean matches(String name, String glob) {
        String n = name.toLowerCase(Locale.US);
        String g = glob.toLowerCase(Locale.US).trim();
        if (g.indexOf('*') < 0) return n.equals(g);
        String[] parts = g.split("\\*", -1);
        int at = 0;
        for (int i = 0; i < parts.length; i++) {
            String p = parts[i];
            if (p.length() == 0) continue;
            int found = n.indexOf(p, at);
            if (found < 0) return false;
            if (i == 0 && !g.startsWith("*") && found != 0) return false;
            at = found + p.length();
        }
        return g.endsWith("*") || n.endsWith(parts[parts.length - 1]);
    }

    // ── writing ──────────────────────────────────────────────────────────

    /** Create a file. Refuses to clobber an existing one. */
    public static String createFile(Context c, String path, String content) {
        try {
            File f = Workspace.resolve(c, path);
            if (f.exists()) {
                return "ERROR: already exists: " + path
                        + " — read it first, then use edit_file";
            }
            File p = f.getParentFile();
            if (p != null && !p.exists() && !p.mkdirs()) {
                return "ERROR: could not create folder " + Workspace.rel(c, p);
            }
            write(f, content == null ? "" : content);
            return "Created " + Workspace.rel(c, f) + " ("
                    + Workspace.size(f.length()) + ")";
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    /** Replace a whole file. Kept for generated files, not for edits. */
    public static String writeFile(Context c, String path, String content) {
        try {
            File f = Workspace.resolve(c, path);
            boolean existed = f.exists();
            File p = f.getParentFile();
            if (p != null && !p.exists()) p.mkdirs();
            write(f, content == null ? "" : content);
            return (existed ? "Overwrote " : "Created ")
                    + Workspace.rel(c, f) + " (" + Workspace.size(f.length()) + ")";
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    /**
     * The important one: replace an exact fragment.
     *
     * The old text must appear exactly once. Requiring uniqueness is what stops
     * a plausible-looking edit from silently landing in the wrong method.
     */
    public static String editFile(Context c, String path, String oldText,
                                  String newText, boolean all) {
        try {
            if (oldText == null || oldText.length() == 0) {
                return "ERROR: old_text is required";
            }
            File f = Workspace.resolve(c, path);
            if (!f.exists()) return "ERROR: file not found: " + path;
            if (f.length() > Workspace.MAX_READ) {
                return "ERROR: file too large to edit safely";
            }

            String src = readAll(f);
            int count = count(src, oldText);
            if (count == 0) {
                return "ERROR: old_text not found in " + Workspace.rel(c, f)
                        + ". Read the file again and copy the text exactly, "
                        + "including indentation.";
            }
            if (count > 1 && !all) {
                return "ERROR: old_text appears " + count + " times. Include "
                        + "more surrounding lines to make it unique, or set "
                        + "all=true to replace every occurrence.";
            }

            String repl = newText == null ? "" : newText;
            String out = all ? replaceAll(src, oldText, repl)
                             : replaceFirst(src, oldText, repl);
            write(f, out);

            int before = src.split("\n", -1).length;
            int after = out.split("\n", -1).length;
            return "Edited " + Workspace.rel(c, f) + " — "
                    + (all ? count + " replacements" : "1 replacement")
                    + ", " + before + " → " + after + " lines";
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    public static String appendFile(Context c, String path, String content) {
        try {
            File f = Workspace.resolve(c, path);
            String cur = f.exists() ? readAll(f) : "";
            if (cur.length() > 0 && !cur.endsWith("\n")) cur = cur + "\n";
            write(f, cur + (content == null ? "" : content));
            return "Appended to " + Workspace.rel(c, f);
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    public static String deleteFile(Context c, String path) {
        try {
            File f = Workspace.resolve(c, path);
            if (!f.exists()) return "ERROR: not found: " + path;
            if (f.isDirectory()) {
                return "ERROR: that is a folder. Deleting folders is not allowed.";
            }
            String rel = Workspace.rel(c, f);
            return f.delete() ? "Deleted " + rel : "ERROR: could not delete " + rel;
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    public static String makeDir(Context c, String path) {
        try {
            File f = Workspace.resolve(c, path);
            if (f.exists()) return "Already exists: " + Workspace.rel(c, f);
            return f.mkdirs() ? "Created folder " + Workspace.rel(c, f)
                              : "ERROR: could not create " + path;
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    // ── project understanding ────────────────────────────────────────────

    /** A pruned tree, deep enough to navigate but small enough to send. */
    public static String structure(Context c, int maxDepth) {
        try {
            File root = Workspace.root(c);
            StringBuilder sb = new StringBuilder();
            sb.append(Workspace.inProject(c)
                    ? "Project: " + root.getAbsolutePath()
                    : "Scratch workspace (no project folder set)").append("\n\n");
            int[] budget = {400};
            tree(c, root, "", sb, maxDepth <= 0 ? 4 : maxDepth, budget);
            if (budget[0] <= 0) sb.append("… (listing truncated)\n");
            return sb.toString();
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    private static void tree(Context c, File dir, String pad, StringBuilder sb,
                             int depth, int[] budget) {
        if (depth <= 0 || budget[0] <= 0) return;
        File[] kids = dir.listFiles();
        if (kids == null) return;
        java.util.Arrays.sort(kids, new java.util.Comparator<File>() {
            public int compare(File a, File b) {
                if (a.isDirectory() != b.isDirectory()) {
                    return a.isDirectory() ? -1 : 1;
                }
                return a.getName().compareToIgnoreCase(b.getName());
            }
        });
        for (File f : kids) {
            if (budget[0]-- <= 0) return;
            if (f.isDirectory()) {
                if (Workspace.skipDir(f.getName())) continue;
                sb.append(pad).append(f.getName()).append("/\n");
                tree(c, f, pad + "  ", sb, depth - 1, budget);
            } else {
                sb.append(pad).append(f.getName()).append('\n');
            }
        }
    }

    /** Package, SDK levels, entry point, build system — read, not guessed. */
    public static String projectInfo(Context c) {
        try {
            if (!Workspace.inProject(c)) {
                return "No project folder is set. Ask the user to pick one in "
                        + "settings, or work in the scratch workspace.";
            }
            File root = Workspace.root(c);
            StringBuilder sb = new StringBuilder();
            sb.append("root: ").append(root.getAbsolutePath()).append('\n');

            File man = findFile(root, "AndroidManifest.xml", 4);
            if (man != null) {
                String m = readAll(man);
                sb.append("manifest: ").append(Workspace.rel(c, man)).append('\n');
                String pkg = attr(m, "package");
                if (pkg != null) sb.append("package: ").append(pkg).append('\n');
                String min = attr(m, "android:minSdkVersion");
                String tgt = attr(m, "android:targetSdkVersion");
                if (min != null) sb.append("minSdk: ").append(min).append('\n');
                if (tgt != null) sb.append("targetSdk: ").append(tgt).append('\n');
                java.util.regex.Matcher am = java.util.regex.Pattern
                        .compile("<activity[^>]*android:name=\"([^\"]+)\"")
                        .matcher(m);
                if (am.find()) {
                    sb.append("main activity: ").append(am.group(1)).append('\n');
                }
                int perms = count(m, "<uses-permission");
                sb.append("permissions: ").append(perms).append('\n');
            } else {
                sb.append("manifest: not found\n");
            }

            File gradle = findFile(root, "build.gradle", 3);
            File props = new File(root, "project.properties");
            if (gradle != null) {
                sb.append("build: gradle (").append(Workspace.rel(c, gradle))
                        .append(")\n");
                String g = readAll(gradle);
                java.util.regex.Matcher dm = java.util.regex.Pattern
                        .compile("(implementation|compile|api)\\s+['\"]([^'\"]+)")
                        .matcher(g);
                StringBuilder deps = new StringBuilder();
                int n = 0;
                while (dm.find() && n < 12) {
                    deps.append("  ").append(dm.group(2)).append('\n');
                    n++;
                }
                sb.append("dependencies: ")
                        .append(n == 0 ? "none\n" : "\n" + deps);
            } else if (props.exists()) {
                sb.append("build: AIDE classic (project.properties)\n");
                sb.append("dependencies: none\n");
            } else {
                sb.append("build: unknown\n");
            }

            int[] counts = new int[3];  // java, kotlin, xml
            countSources(root, counts, new int[]{3000});
            sb.append("java files: ").append(counts[0]).append('\n');
            if (counts[1] > 0) {
                sb.append("kotlin files: ").append(counts[1]).append('\n');
            }
            sb.append("xml files: ").append(counts[2]).append('\n');

            File agents = new File(root, "AGENTS.md");
            sb.append("AGENTS.md: ")
                    .append(agents.exists() ? "present" : "absent").append('\n');
            return sb.toString();
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    private static void countSources(File dir, int[] n, int[] budget) {
        if (budget[0] <= 0) return;
        File[] kids = dir.listFiles();
        if (kids == null) return;
        for (File f : kids) {
            if (budget[0]-- <= 0) return;
            if (f.isDirectory()) {
                if (!Workspace.skipDir(f.getName())) countSources(f, n, budget);
            } else {
                String s = f.getName().toLowerCase(Locale.US);
                if (s.endsWith(".java")) n[0]++;
                else if (s.endsWith(".kt")) n[1]++;
                else if (s.endsWith(".xml")) n[2]++;
            }
        }
    }

    private static String attr(String xml, String name) {
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile(java.util.regex.Pattern.quote(name) + "\\s*=\\s*\"([^\"]*)\"")
                .matcher(xml);
        return m.find() ? m.group(1) : null;
    }

    private static File findFile(File dir, String name, int depth) {
        if (depth <= 0) return null;
        File direct = new File(dir, name);
        if (direct.exists()) return direct;
        File[] kids = dir.listFiles();
        if (kids == null) return null;
        for (File f : kids) {
            if (f.isDirectory() && !Workspace.skipDir(f.getName())) {
                File hit = findFile(f, name, depth - 1);
                if (hit != null) return hit;
            }
        }
        return null;
    }

    /** Where a class, method or resource id is declared. */
    public static String findSymbol(Context c, String symbol) {
        if (symbol == null || symbol.length() == 0) return "ERROR: empty symbol";
        String q = java.util.regex.Pattern.quote(symbol);
        String pat = "(class|interface|enum)\\s+" + q + "\\b"
                + "|\\b(void|int|long|boolean|String|double|float|char|byte|short"
                + "|[A-Z][A-Za-z0-9_<>\\[\\],\\s]*)\\s+" + q + "\\s*\\("
                + "|name\\s*=\\s*\"" + q + "\""
                + "|android:id\\s*=\\s*\"@\\+id/" + q + "\"";
        String r = search(c, pat, null, true);
        return r.startsWith("No match")
                ? "Not declared anywhere. It may come from the Android SDK, "
                  + "or the name is spelled differently."
                : r;
    }

    /** Every place a name is used. */
    public static String findReferences(Context c, String symbol) {
        if (symbol == null || symbol.length() == 0) return "ERROR: empty symbol";
        return search(c, "\\b" + java.util.regex.Pattern.quote(symbol) + "\\b",
                null, true);
    }

    // ── analysis ─────────────────────────────────────────────────────────

    /**
     * Structural checks only.
     *
     * This is deliberately narrow: unbalanced brackets, a missing package line,
     * a resource that is referenced but not defined. Anything requiring real
     * type resolution is left to the model, which can read the file. Reporting
     * a guess as a finding would be worse than reporting nothing.
     */
    public static String analyze(Context c, String path) {
        try {
            File f = Workspace.resolve(c, path);
            if (!f.exists()) return "ERROR: file not found: " + path;
            String src = readAll(f);
            String name = f.getName().toLowerCase(Locale.US);
            ArrayList<String> found = new ArrayList<String>();

            if (name.endsWith(".java")) analyzeJava(src, found);
            else if (name.endsWith(".xml")) analyzeXml(src, found);
            else return "No structural checks available for this file type. "
                    + "Read it and judge directly.";

            if (found.isEmpty()) {
                return "No structural problems found in " + Workspace.rel(c, f)
                        + ". (Brackets balanced, declarations present.) "
                        + "This is not a compile.";
            }
            StringBuilder sb = new StringBuilder();
            sb.append(Workspace.rel(c, f)).append(":\n");
            for (String s : found) sb.append("- ").append(s).append('\n');
            return sb.toString();
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    private static void analyzeJava(String src, ArrayList<String> out) {
        String code = stripJava(src);
        int curly = 0, paren = 0;
        for (int i = 0; i < code.length(); i++) {
            char ch = code.charAt(i);
            if (ch == '{') curly++;
            else if (ch == '}') curly--;
            else if (ch == '(') paren++;
            else if (ch == ')') paren--;
            if (curly < 0) { out.add("a closing '}' has no opener"); return; }
        }
        if (curly != 0) {
            out.add(curly > 0 ? curly + " unclosed '{'" : (-curly) + " extra '}'");
        }
        if (paren != 0) {
            out.add(paren > 0 ? paren + " unclosed '('" : (-paren) + " extra ')'");
        }
        if (!code.contains("package ")) out.add("no package declaration");

        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(?m)^\\s*import\\s+([\\w.]+)\\s*;").matcher(code);
        ArrayList<String> imports = new ArrayList<String>();
        while (m.find()) {
            String imp = m.group(1);
            if (imports.contains(imp)) out.add("duplicate import: " + imp);
            imports.add(imp);
        }
        if (code.contains("findViewById") && !code.contains("setContentView")
                && code.contains("extends Activity")) {
            out.add("findViewById used but setContentView is missing");
        }
    }

    private static void analyzeXml(String src, ArrayList<String> out) {
        int lt = count(src, "<"), gt = count(src, ">");
        if (lt != gt) out.add("unbalanced angle brackets (" + lt + " < vs " + gt + " >)");
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("<(\\w[\\w:.-]*)(\\s[^>]*)?>").matcher(src);
        java.util.ArrayList<String> stack = new java.util.ArrayList<String>();
        while (m.find()) {
            String whole = m.group(0);
            if (whole.endsWith("/>") || whole.startsWith("<?")) continue;
            stack.add(m.group(1));
        }
        java.util.regex.Matcher e = java.util.regex.Pattern
                .compile("</(\\w[\\w:.-]*)>").matcher(src);
        int closes = 0;
        while (e.find()) closes++;
        if (stack.size() != closes) {
            out.add("tag mismatch: " + stack.size() + " opening vs "
                    + closes + " closing");
        }
    }

    /** Remove comments and string bodies so bracket counting is meaningful. */
    private static String stripJava(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        boolean inStr = false, inChar = false, inLine = false, inBlock = false;
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            char nx = i + 1 < s.length() ? s.charAt(i + 1) : 0;
            if (inLine) { if (ch == '\n') { inLine = false; sb.append(ch); } continue; }
            if (inBlock) { if (ch == '*' && nx == '/') { inBlock = false; i++; } continue; }
            if (inStr) {
                if (ch == '\\') { i++; continue; }
                if (ch == '"') inStr = false;
                continue;
            }
            if (inChar) {
                if (ch == '\\') { i++; continue; }
                if (ch == '\'') inChar = false;
                continue;
            }
            if (ch == '/' && nx == '/') { inLine = true; i++; continue; }
            if (ch == '/' && nx == '*') { inBlock = true; i++; continue; }
            if (ch == '"') { inStr = true; continue; }
            if (ch == '\'') { inChar = true; continue; }
            sb.append(ch);
        }
        return sb.toString();
    }

    // ── AGENTS.md ────────────────────────────────────────────────────────

    /**
     * Collect AGENTS.md instructions that apply to a path.
     *
     * The root file always applies; a file nearer the edited path applies more
     * specifically and is appended after it, so the closer one is read last.
     */
    public static String agentsFor(Context c, String path) {
        StringBuilder sb = new StringBuilder();
        try {
            File root = Workspace.root(c);
            File target = path == null || path.length() == 0
                    ? root : Workspace.resolve(c, path);
            if (target.isFile()) target = target.getParentFile();

            ArrayList<File> chain = new ArrayList<File>();
            File at = target;
            String rootPath = root.getCanonicalPath();
            while (at != null) {
                File a = new File(at, "AGENTS.md");
                if (a.isFile()) chain.add(0, a);
                if (at.getCanonicalPath().equals(rootPath)) break;
                at = at.getParentFile();
            }
            for (File a : chain) {
                if (a.length() > 40 * 1024) continue;
                sb.append("--- ").append(Workspace.rel(c, a)).append(" ---\n");
                sb.append(readAll(a)).append('\n');
            }
        } catch (Exception e) {
            return "";
        }
        return sb.toString();
    }

    public static boolean hasAgents(Context c) {
        return new File(Workspace.root(c), "AGENTS.md").isFile();
    }

    /** Write a starter AGENTS.md. Never overwrites an existing one. */
    public static String writeDefaultAgents(Context c) {
        try {
            File f = new File(Workspace.root(c), "AGENTS.md");
            if (f.exists()) return "AGENTS.md already exists — left untouched.";
            write(f, DEFAULT_AGENTS);
            return "Created AGENTS.md at the project root.";
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    private static final String DEFAULT_AGENTS =
            "# Project Instructions\n"
            + "\n"
            + "## General Rules\n"
            + "\n"
            + "- Preserve existing functionality.\n"
            + "- Do not remove features without explicit permission.\n"
            + "- Inspect existing code before modifying it.\n"
            + "- Prefer small, safe changes.\n"
            + "- Do not add unnecessary dependencies.\n"
            + "- Keep Android Studio and AIDE compatibility.\n"
            + "\n"
            + "## Coding Rules\n"
            + "\n"
            + "- Read relevant files before editing.\n"
            + "- Search before creating duplicate classes or methods.\n"
            + "- Preserve unrelated code.\n"
            + "- Verify changes after editing.\n"
            + "\n"
            + "## Android Rules\n"
            + "\n"
            + "- Preserve the existing package name.\n"
            + "- Check AndroidManifest when adding Android components.\n"
            + "- Check Gradle configuration before adding dependencies.\n"
            + "- Preserve existing UI behavior.\n"
            + "\n"
            + "## Safety\n"
            + "\n"
            + "- Never expose API keys.\n"
            + "- Never perform unrestricted destructive operations.\n"
            + "- Never claim an operation succeeded unless it actually did.\n";

    // ── build ────────────────────────────────────────────────────────────

    /**
     * There is no compiler on the phone, and pretending otherwise would be the
     * worst possible failure mode: the model would report a green build the
     * user never got. So this states the limitation and runs the checks that
     * genuinely are possible.
     */
    public static String buildCheck(Context c) {
        StringBuilder sb = new StringBuilder();
        sb.append("No compiler is available inside this app, so a real build "
                + "cannot be run here. Build in AIDE or Android Studio.\n\n");
        if (!Workspace.inProject(c)) {
            sb.append("No project folder is set, so nothing was checked.");
            return sb.toString();
        }
        sb.append("Structural check of the project:\n");
        ArrayList<String> problems = new ArrayList<String>();
        int[] budget = {600};
        checkAll(c, Workspace.root(c), problems, budget);
        if (problems.isEmpty()) {
            sb.append("No structural problems found in the files checked.\n");
            sb.append("This is not the same as compiling.");
        } else {
            for (String p : problems) sb.append("- ").append(p).append('\n');
        }
        return sb.toString();
    }

    private static void checkAll(Context c, File dir, ArrayList<String> out,
                                 int[] budget) {
        if (budget[0] <= 0 || out.size() >= 25) return;
        File[] kids = dir.listFiles();
        if (kids == null) return;
        for (File f : kids) {
            if (budget[0]-- <= 0 || out.size() >= 25) return;
            if (f.isDirectory()) {
                if (!Workspace.skipDir(f.getName())) checkAll(c, f, out, budget);
                continue;
            }
            String n = f.getName().toLowerCase(Locale.US);
            if (!n.endsWith(".java") && !n.endsWith(".xml")) continue;
            if (f.length() > Workspace.MAX_READ) continue;
            try {
                String src = readAll(f);
                ArrayList<String> found = new ArrayList<String>();
                if (n.endsWith(".java")) analyzeJava(src, found);
                else analyzeXml(src, found);
                for (String s : found) {
                    out.add(Workspace.rel(c, f) + ": " + s);
                }
            } catch (Exception e) {
                // skip
            }
        }
    }

    // ── plumbing ─────────────────────────────────────────────────────────

    private static ArrayList<String> readLines(File f) throws Exception {
        ArrayList<String> out = new ArrayList<String>();
        BufferedReader r = new BufferedReader(
                new InputStreamReader(new FileInputStream(f), "UTF-8"), 8192);
        String line;
        while ((line = r.readLine()) != null) out.add(line);
        r.close();
        return out;
    }

    static String readAll(File f) throws Exception {
        FileInputStream in = new FileInputStream(f);
        java.io.ByteArrayOutputStream b = new java.io.ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
        in.close();
        return new String(b.toByteArray(), "UTF-8");
    }

    private static void write(File f, String s) throws Exception {
        FileOutputStream o = new FileOutputStream(f);
        o.write(s.getBytes("UTF-8"));
        o.flush();
        o.close();
    }

    private static int count(String hay, String needle) {
        int n = 0, at = 0;
        while ((at = hay.indexOf(needle, at)) >= 0) { n++; at += needle.length(); }
        return n;
    }

    private static String replaceFirst(String src, String a, String b) {
        int at = src.indexOf(a);
        if (at < 0) return src;
        return src.substring(0, at) + b + src.substring(at + a.length());
    }

    private static String replaceAll(String src, String a, String b) {
        StringBuilder sb = new StringBuilder();
        int at = 0, hit;
        while ((hit = src.indexOf(a, at)) >= 0) {
            sb.append(src, at, hit).append(b);
            at = hit + a.length();
        }
        sb.append(src.substring(at));
        return sb.toString();
    }
}
