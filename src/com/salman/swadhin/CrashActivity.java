package com.salman.swadhin;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/**
 * The screen shown when something crashes.
 *
 * Built entirely in code rather than from a layout file, because a crash may
 * well have been caused by resource inflation and this screen has to work when
 * the rest of the app does not. Its only job is to put the stack trace where a
 * phone-only user can actually read and copy it.
 */
public class CrashActivity extends Activity {

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);

        String report = null;
        try {
            report = getIntent().getStringExtra("report");
        } catch (Throwable t) {
            // fall through to the file
        }
        if (report == null || report.length() == 0) {
            report = readSaved();
        }
        if (report == null) report = "no crash report was recorded";
        final String text = report;

        int pad = 32;
        try {
            pad = (int) (16 * getResources().getDisplayMetrics().density);
        } catch (Throwable t) {
            // resources unavailable; a fixed padding is fine
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFFFAF9F5);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText(str(R.string.crash_title, "NOVA stopped"));
        title.setTextSize(20);
        title.setTextColor(0xFF1F1D1A);
        root.addView(title);

        TextView hint = new TextView(this);
        hint.setText(str(R.string.crash_hint,
                "Copy this text and send it to Salman."));
        hint.setTextSize(14);
        hint.setTextColor(0xFF8A8377);
        hint.setPadding(0, pad / 2, 0, pad / 2);
        root.addView(hint);

        TextView body = new TextView(this);
        body.setText(text);
        body.setTextSize(11);
        body.setTextColor(0xFF1F1D1A);
        body.setTypeface(android.graphics.Typeface.MONOSPACE);
        body.setTextIsSelectable(true);
        body.setPadding(pad / 2, pad / 2, pad / 2, pad / 2);
        body.setBackgroundColor(0xFFF2F0EA);

        ScrollView sc = new ScrollView(this);
        sc.addView(body);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f);
        root.addView(sc, lp);

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.setPadding(0, pad / 2, 0, 0);

        Button copy = new Button(this);
        copy.setText(str(R.string.crash_copy, "Copy"));
        copy.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                try {
                    ClipboardManager cm = (ClipboardManager)
                            getSystemService(Context.CLIPBOARD_SERVICE);
                    cm.setPrimaryClip(ClipData.newPlainText("NOVA crash", text));
                    Toast.makeText(CrashActivity.this,
                            str(R.string.crash_copied, "Copied"),
                            Toast.LENGTH_SHORT).show();
                } catch (Throwable t) {
                    // clipboard unavailable
                }
            }
        });
        row.addView(copy);

        Button restart = new Button(this);
        restart.setText(str(R.string.crash_restart, "Restart"));
        restart.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                try {
                    android.content.Intent i = new android.content.Intent(
                            CrashActivity.this, MainActivity.class);
                    i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                    i.addFlags(android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(i);
                    finish();
                } catch (Throwable t) {
                    finish();
                }
            }
        });
        row.addView(restart);
        root.addView(row);

        setContentView(root);
    }

    /**
     * Read a string resource, falling back to English if the resource table is
     * itself the problem. A crash reporter that crashes is worthless.
     */
    private String str(int id, String fallback) {
        try {
            String v = getString(id);
            return v == null || v.length() == 0 ? fallback : v;
        } catch (Throwable t) {
            return fallback;
        }
    }

    private String readSaved() {
        try {
            java.io.File f = new java.io.File(getFilesDir(), "crash.txt");
            if (!f.exists()) return null;
            java.io.FileInputStream in = new java.io.FileInputStream(f);
            java.io.ByteArrayOutputStream o = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
            in.close();
            return new String(o.toByteArray(), "UTF-8");
        } catch (Throwable t) {
            return null;
        }
    }
}
