package com.nexora.hackerterminal;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.widget.TextView;
import android.widget.ScrollView;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {

    private TextView terminal;
    private Handler handler = new Handler();

    private String[] lines = {
        "$ termux-start",
        "$ initializing secure terminal...",
        "[+] Loading modules...",
        "[+] Network interface detected",
        "[+] Establishing encrypted session...",
        "[+] Authentication service started",
        "$ system-check --all",
        "[OK] Kernel ............... ONLINE",
        "[OK] Network .............. ONLINE",
        "[OK] Security ............. ACTIVE",
        "[OK] Terminal ............. READY",
        "$ scan --system",
        "[+] Scanning virtual nodes...",
        "[+] 12 nodes detected",
        "[+] Analyzing connection...",
        "[+] Encryption layer: AES",
        "[+] Connection secured",
        "$ access --simulation",
        "[+] Simulation mode enabled",
        "[+] Loading interface...",
        "[+] Processing data...",
        "[+] ████████████████████ 100%",
        "",
        "╔════════════════════════════╗",
        "║      SYSTEM ONLINE        ║",
        "║      NEXORA TERMINAL      ║",
        "╚════════════════════════════╝",
        "",
        "$ ready"
    };

    private int index = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Full screen
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
			WindowManager.LayoutParams.FLAG_FULLSCREEN,
			WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.BLACK);
        scroll.setFillViewport(true);

        terminal = new TextView(this);
        terminal.setTextColor(Color.rgb(0, 255, 90));
        terminal.setTextSize(14);
        terminal.setTypeface(Typeface.MONOSPACE);
        terminal.setGravity(Gravity.START);
        terminal.setPadding(18, 18, 18, 18);
        terminal.setText("");

        scroll.addView(terminal);
        setContentView(scroll);

        startTerminal();
    }

    private void startTerminal() {

        if (index >= lines.length) {
            // আবার শুরু হবে
            handler.postDelayed(new Runnable() {
					@Override
					public void run() {
						terminal.setText("");
						index = 0;
						startTerminal();
					}
				}, 3000);

            return;
        }

        terminal.append(lines[index] + "\n");
        index++;

        handler.postDelayed(new Runnable() {
				@Override
				public void run() {
					startTerminal();
				}
			}, 300 + (int)(Math.random() * 700));
    }
}
