package com.salman.swadhin;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Keeps the interface up to date without reinstalling the app.
 *
 * The whole UI is one HTML file, so a new version can simply be downloaded.
 * On launch the app asks the relay for the latest version number; when it is
 * newer than what is stored, the file is fetched and used from then on. Java
 * code still needs a rebuild, but layout, styling, wording and the built-in
 * prompts can all ship this way.
 *
 * Failure is always silent: if anything goes wrong the app keeps running on
 * the copy it already has, which in the worst case is the one baked into the
 * APK.
 */
public class Updater {

    private static final String PREF = "nova_ui";
    private static final String K_VER = "ui_version";
    private static final String K_SEEN = "last_check";

    /** Don't pester the server: at most one check every six hours. */
    private static final long CHECK_EVERY = 6L * 60 * 60 * 1000;

    private static final int MAX_UI_BYTES = 3 * 1024 * 1024;

    private final Context ctx;

    public Updater(Context c) {
        ctx = c.getApplicationContext();
    }

    private SharedPreferences sp() {
        return ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    private File uiFile() {
        return new File(ctx.getFilesDir(), "ui.html");
    }

    /**
     * Where the WebView should load the interface from.
     * Falls back to the asset bundled in the APK.
     */
    public String startUrl() {
        File f = uiFile();
        if (f.exists() && f.length() > 1000) {
            return "file://" + f.getAbsolutePath();
        }
        return "file:///android_asset/ui.html";
    }

    public int currentVersion() {
        return sp().getInt(K_VER, 0);
    }

    /**
     * Check for a newer UI in the background.
     *
     * @param onDone called on the main thread with the new version number,
     *               or 0 when nothing changed. Never called with an error.
     */
    public void checkAsync(final JSONObject cfg, final Listener onDone) {
        final Handler main = new Handler(Looper.getMainLooper());
        new Thread(new Runnable() {
            public void run() {
                int got = 0;
                try {
                    got = check(cfg);
                } catch (Throwable t) {
                    got = 0;   // an update is never worth a crash
                }
                final int v = got;
                main.post(new Runnable() {
                    public void run() {
                        if (onDone != null) onDone.onChecked(v);
                    }
                });
            }
        }).start();
    }

    public interface Listener {
        /** newVersion is 0 when the UI was already current. */
        void onChecked(int newVersion);
    }

    /** @return the version just installed, or 0. */
    private int check(JSONObject cfg) throws Exception {
        String base = cfg.optString("relay_url", "");
        if (base.length() == 0) return 0;
        while (base.endsWith("/")) base = base.substring(0, base.length() - 1);

        long now = System.currentTimeMillis();
        if (now - sp().getLong(K_SEEN, 0) < CHECK_EVERY) return 0;
        sp().edit().putLong(K_SEEN, now).apply();

        String meta = get(base + "/ui/version", cfg, 40 * 1024);
        if (meta == null) return 0;

        JSONObject j = new JSONObject(meta);
        int remote = j.optInt("version", 0);
        if (remote <= currentVersion()) return 0;

        String html = get(base + "/ui/html", cfg, MAX_UI_BYTES);
        // A truncated download would leave a blank screen, so sanity check it
        if (html == null || html.length() < 5000
                || html.indexOf("</html>") < 0) {
            return 0;
        }

        File tmp = new File(ctx.getFilesDir(), "ui.next");
        FileOutputStream o = new FileOutputStream(tmp);
        o.write(html.getBytes("UTF-8"));
        o.flush();
        o.close();

        File dst = uiFile();
        if (dst.exists() && !dst.delete()) {
            tmp.delete();
            return 0;
        }
        if (!tmp.renameTo(dst)) {
            tmp.delete();
            return 0;
        }

        sp().edit().putInt(K_VER, remote).apply();
        return remote;
    }

    private String get(String url, JSONObject cfg, int cap) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(url).openConnection();
            c.setRequestMethod("GET");
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            String key = cfg.optString("api_key", "");
            if (key.length() > 0) {
                c.setRequestProperty("Authorization", "Bearer " + key);
            }
            if (c.getResponseCode() >= 400) return null;

            InputStream in = c.getInputStream();
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n, total = 0;
            while ((n = in.read(buf)) > 0) {
                total += n;
                if (total > cap) return null;
                b.write(buf, 0, n);
            }
            in.close();
            return new String(b.toByteArray(), "UTF-8");
        } catch (Exception e) {
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    /** Drop the downloaded UI and go back to the one inside the APK. */
    public void reset() {
        File f = uiFile();
        if (f.exists()) f.delete();
        sp().edit().remove(K_VER).remove(K_SEEN).apply();
    }
}
