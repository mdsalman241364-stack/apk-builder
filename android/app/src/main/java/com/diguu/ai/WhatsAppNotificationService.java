package com.diguu.ai;

import android.app.Notification;

import android.content.Intent;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.core.app.RemoteInput;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class WhatsAppNotificationService extends NotificationListenerService {
    private static final String TAG = "WhatsAppAutoReply";
    public static final String WHATSAPP_PACKAGE = "com.whatsapp";
    public static final String WHATSAPP_BUSINESS_PACKAGE = "com.whatsapp.w4b";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;

        String packageName = sbn.getPackageName();
        if (!WHATSAPP_PACKAGE.equals(packageName) && !WHATSAPP_BUSINESS_PACKAGE.equals(packageName)) {
            return;
        }

        Notification notification = sbn.getNotification();
        if (notification == null || notification.extras == null) return;

        Bundle extras = notification.extras;
        CharSequence titleCharSeq = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCharSeq = extras.getCharSequence(Notification.EXTRA_TEXT);

        if (titleCharSeq == null || textCharSeq == null) return;

        final String sender = titleCharSeq.toString();
        final String message = textCharSeq.toString();

        Log.d(TAG, "Captured WhatsApp message from [" + sender + "]: " + message);

        // Extract RemoteInput action for direct inline reply
        Notification.Action replyAction = findReplyAction(notification);
        if (replyAction == null) {
            Log.w(TAG, "No direct reply RemoteInput action found in WhatsApp notification");
            return;
        }

        // Trigger AI Reply Generation asynchronously
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    String aiReply = fetchAIReply(sender, message);
                    if (aiReply != null && !aiReply.isEmpty()) {
                        sendDirectNotificationReply(replyAction, aiReply);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error in generating or sending auto-reply", e);
                }
            }
        }).start();
    }

    private Notification.Action findReplyAction(Notification notification) {
        if (notification.actions == null) return null;

        for (Notification.Action action : notification.actions) {
            if (action.getRemoteInputs() != null) {
                for (android.app.RemoteInput remoteInput : action.getRemoteInputs()) {
                    if (remoteInput.getAllowFreeFormInput()) {
                        return action;
                    }
                }
            }
        }
        return null;
    }

    private String fetchAIReply(String sender, String message) {
        try {
            // Internal local dev server endpoint or default fallback
            URL url = new URL("http://localhost:3000/api/whatsapp-autoreply");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; utf-8");
            conn.setDoOutput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            JSONObject jsonParam = new JSONObject();
            jsonParam.put("sender", sender);
            jsonParam.put("message", message);
            jsonParam.put("userName", "Tarun");
            jsonParam.put("languageMode", "hinglish");

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonParam.toString().getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            if (code == 200) {
                java.util.Scanner s = new java.util.Scanner(conn.getInputStream(), "UTF-8").useDelimiter("\\A");
                String respStr = s.hasNext() ? s.next() : "";
                JSONObject respJson = new JSONObject(respStr);
                return respJson.optString("reply", "Hii! Tarun is currently occupied. Will catch up shortly!");
            }
        } catch (Exception e) {
            Log.warn(TAG, "Failed to connect to AI server endpoint, using dynamic fallback", e);
        }
        return "Hii! Thanks for reaching out. I'm currently away and will reply as soon as possible!";
    }

    private void sendDirectNotificationReply(Notification.Action action, String replyText) {
        try {
            Intent intent = new Intent();
            Bundle bundle = new Bundle();

            for (android.app.RemoteInput remoteInput : action.getRemoteInputs()) {
                bundle.putCharSequence(remoteInput.getResultKey(), replyText);
            }

            android.app.RemoteInput.addResultsToIntent(action.getRemoteInputs(), intent, bundle);
            action.actionIntent.send(this, 0, intent);
            Log.i(TAG, "Direct notification reply sent successfully to: " + replyText);
        } catch (Exception e) {
            Log.e(TAG, "Error sending direct notification reply", e);
        }
    }
}
