package com.salman.swadhin;

import android.app.Application;

import java.io.File;
import java.io.FileOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;

/**
 * Installs the crash recorder before anything else in the app runs.
 *
 * The previous attempt put this in MainActivity.onCreate, which is too late:
 * a failure during Application startup, provider creation or resource loading
 * happens first and was never captured. It also tried to launch a reporting
 * screen from inside a dying process, which the system frequently kills before
 * the activity is ever delivered — which is exactly what happened.
 *
 * So the strategy is inverted. Crashing writes a plain file and nothing else.
 * Reading it happens on the next launch, from a healthy process. A file write
 * is about the only thing that can be relied on while a process is going down.
 */
public class NovaApp extends Application {

    /** Inside the app; always writable, but only reachable from the app. */
    public static File internalReport(android.content.Context c) {
        return new File(c.getFilesDir(), "crash.txt");
    }

    /**
     * On shared storage, so it can be opened with any file manager even if the
     * app will not start at all. Best effort: on newer Android this write may
     * be refused, which is fine because the internal copy still exists.
     */
    public static File externalReport() {
        return new File(android.os.Environment.getExternalStorageDirectory(),
                "NOVA-crash.txt");
    }

    @Override
    public void onCreate() {
        super.onCreate();
        install(this);
    }

    static void install(final android.content.Context ctx) {
        final Thread.UncaughtExceptionHandler prev =
                Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(
                new Thread.UncaughtExceptionHandler() {
            public void uncaughtException(Thread t, Throwable e) {
                try {
                    String report = describe(e);
                    write(internalReport(ctx), report);
                    try {
                        write(externalReport(), report);
                    } catch (Throwable t2) {
                        // shared storage not writable; internal copy is enough
                    }
                } catch (Throwable t2) {
                    // nothing left to try
                }
                // Hand back to the system so the usual dialog still appears and
                // the process dies cleanly. The report is already on disk.
                if (prev != null) prev.uncaughtException(t, e);
            }
        });
    }

    /** Everything needed to diagnose, including the full cause chain. */
    public static String describe(Throwable e) {
        StringBuilder sb = new StringBuilder();
        sb.append("NOVA crash report\n");
        try {
            sb.append("time: ").append(new java.text.SimpleDateFormat(
                    "yyyy-MM-dd HH:mm", java.util.Locale.US)
                    .format(new java.util.Date())).append('\n');
            sb.append("android: ").append(android.os.Build.VERSION.RELEASE)
              .append(" (sdk ").append(android.os.Build.VERSION.SDK_INT)
              .append(")\n");
            sb.append("device: ").append(android.os.Build.MANUFACTURER)
              .append(' ').append(android.os.Build.MODEL).append('\n');
        } catch (Throwable t) {
            // build info unavailable
        }
        sb.append('\n');
        try {
            StringWriter sw = new StringWriter();
            e.printStackTrace(new PrintWriter(sw));
            sb.append(sw.toString());
        } catch (Throwable t) {
            sb.append(String.valueOf(e));
        }
        return sb.toString();
    }

    static void write(File f, String s) throws Exception {
        FileOutputStream o = new FileOutputStream(f);
        o.write(s.getBytes("UTF-8"));
        o.flush();
        o.close();
    }
}
