package com.salman.swadhin;

import android.content.Context;
import android.content.SharedPreferences;

import java.io.File;

/**
 * Decides which directory the agent is allowed to touch, and resolves every
 * path against it.
 *
 * There are two modes:
 *
 *   scratch  - the private folder under getFilesDir()/workspace. Always
 *              available, nothing outside the app can see it. This is what the
 *              older file tools used and stays the default.
 *
 *   project  - a real folder the user pointed at, e.g. /sdcard/NOVA-AIDE. This
 *              is what makes coding work possible: the agent can read and edit
 *              the same files AIDE compiles.
 *
 * Every path passed by the model goes through {@link #resolve}, which rejects
 * anything that escapes the root once symlinks and "../" are collapsed. The
 * model never sees an absolute path it did not already know.
 */
public class Workspace {

    private static final String PREF = "nova_cfg";
    private static final String K_ROOT = "project_root";

    /** Files bigger than this are never read whole into memory. */
    public static final int MAX_READ = 400 * 1024;

    /** Directory names that are never worth walking into. */
    private static final String[] SKIP_DIRS = {
            ".git", "bin", "gen", "build", ".gradle", "node_modules",
            ".idea", "__pycache__", ".aide", "captures",
    };

    /** Extensions treated as text. Anything else is reported, not opened. */
    private static final String[] TEXT_EXT = {
            ".java", ".kt", ".xml", ".gradle", ".properties", ".json", ".md",
            ".txt", ".html", ".htm", ".css", ".js", ".mjs", ".py", ".sh",
            ".yml", ".yaml", ".pro", ".cfg", ".ini", ".c", ".h", ".cpp",
    };

    private Workspace() {
    }

    private static SharedPreferences sp(Context c) {
        return c.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    /** The scratch folder that always exists. */
    public static File scratch(Context c) {
        File d = new File(c.getFilesDir(), "workspace");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    /** Absolute path of the project folder, or "" when none is set. */
    public static String projectPath(Context c) {
        return sp(c).getString(K_ROOT, "");
    }

    public static boolean hasProject(Context c) {
        String p = projectPath(c);
        if (p.length() == 0) return false;
        File f = new File(p);
        return f.isDirectory() && f.canRead();
    }

    /**
     * Point the agent at a project.
     *
     * @return an empty string on success, otherwise the reason it was refused.
     */
    public static String setProject(Context c, String path) {
        if (path == null || path.trim().length() == 0) {
            sp(c).edit().remove(K_ROOT).apply();
            return "";
        }
        File f = new File(path.trim());
        if (!f.exists()) return "no such folder";
        if (!f.isDirectory()) return "not a folder";
        if (!f.canRead()) return "cannot read (permission?)";
        try {
            sp(c).edit().putString(K_ROOT, f.getCanonicalPath()).apply();
        } catch (Exception e) {
            return String.valueOf(e);
        }
        return "";
    }

    /** The directory the agent currently works in. */
    public static File root(Context c) {
        if (hasProject(c)) return new File(projectPath(c));
        return scratch(c);
    }

    /** True when the agent is pointed at a real project, not the scratch pad. */
    public static boolean inProject(Context c) {
        return hasProject(c);
    }

    /**
     * Turn a model-supplied path into a real file inside the root.
     *
     * @throws Exception when the path would escape the root.
     */
    public static File resolve(Context c, String path) throws Exception {
        File base = root(c);
        String p = path == null ? "" : path.trim();

        String basePath = base.getCanonicalPath();
        if (p.startsWith(basePath)) {
            // Tolerate the model repeating the absolute root it was told about.
            p = p.substring(basePath.length());
        } else if (p.startsWith("/")) {
            // Any other absolute path is a genuine mistake. Silently rebasing it
            // under the root would hand back a different file than the one asked
            // for, which is worse than refusing.
            throw new Exception("absolute paths outside the workspace are not "
                    + "allowed: " + path);
        }
        while (p.startsWith("/")) p = p.substring(1);
        if (p.length() == 0) return base;

        File f = new File(base, p);
        String real = f.getCanonicalPath();
        if (!real.equals(basePath) && !real.startsWith(basePath + File.separator)) {
            throw new Exception("path is outside the workspace: " + path);
        }
        return f;
    }

    /** Path shown back to the user: relative to the root, never absolute. */
    public static String rel(Context c, File f) {
        try {
            String basePath = root(c).getCanonicalPath();
            String p = f.getCanonicalPath();
            if (p.equals(basePath)) return ".";
            if (p.startsWith(basePath + File.separator)) {
                return p.substring(basePath.length() + 1);
            }
            return f.getName();
        } catch (Exception e) {
            return f.getName();
        }
    }

    public static boolean skipDir(String name) {
        for (String s : SKIP_DIRS) {
            if (s.equals(name)) return true;
        }
        return false;
    }

    public static boolean isText(String name) {
        String n = name.toLowerCase(java.util.Locale.US);
        for (String e : TEXT_EXT) {
            if (n.endsWith(e)) return true;
        }
        // extension-less files at the root are usually config, allow them
        return n.indexOf('.') < 0;
    }

    /** Human readable size. */
    public static String size(long b) {
        if (b < 1024) return b + " B";
        if (b < 1024 * 1024) return (b / 1024) + " KB";
        return String.format(java.util.Locale.US, "%.1f MB", b / 1048576.0);
    }
}
