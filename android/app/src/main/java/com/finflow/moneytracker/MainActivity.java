package com.finflow.moneytracker;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "FinFlow_MainActivity";
    private static final int SMS_PERMISSION_CODE = 101;
    public static final String CHANNEL_ID = "finflow_alerts";
    private static MainActivity instance;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;
        createNotificationChannel();
        requestPermissions();

        dispatchDebugToWebView("[MainActivity] onCreate: App started. Scheduling pending SMS flush...");

        // Flush pending SMS at 1.5s and 4s after cold start (wait for WebView to load)
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                dispatchDebugToWebView("[MainActivity] Flush attempt #1 (1.5s after start)");
                flushPendingSMS();
            }
        }, 1500);

        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                dispatchDebugToWebView("[MainActivity] Flush attempt #2 (4s after start)");
                flushPendingSMS();
            }
        }, 4000);
    }

    @Override
    public void onResume() {
        super.onResume();
        instance = this;
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                dispatchDebugToWebView("[MainActivity] onResume: Flushing pending SMS...");
                flushPendingSMS();
            }
        }, 800);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "FinFlow Bank Alerts";
            String description = "Notifications for auto-detected bank transactions";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel created: " + CHANNEL_ID);
            }
        }
    }

    private void requestPermissions() {
        String[] perms;
        if (Build.VERSION.SDK_INT >= 33) {
            perms = new String[]{
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS,
                Manifest.permission.POST_NOTIFICATIONS
            };
        } else {
            perms = new String[]{
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS
            };
        }
        boolean allGranted = true;
        for (String p : perms) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                allGranted = false;
                break;
            }
        }
        if (!allGranted) {
            ActivityCompat.requestPermissions(this, perms, SMS_PERMISSION_CODE);
        } else {
            Log.d(TAG, "All permissions already granted.");
        }
    }

    public static void flushPendingSMS() {
        if (instance == null) {
            Log.w(TAG, "flushPendingSMS: instance is null, skipping.");
            return;
        }
        try {
            SharedPreferences prefs = instance.getSharedPreferences("finflow_prefs", Context.MODE_PRIVATE);
            String pendingJson = prefs.getString("pending_sms", "[]");
            if ("[]".equals(pendingJson)) {
                Log.d(TAG, "flushPendingSMS: No pending SMS.");
                return;
            }
            JSONArray arr = new JSONArray(pendingJson);
            Log.d(TAG, "flushPendingSMS: Found " + arr.length() + " pending SMS(es).");
            dispatchDebugToWebView("[MainActivity] Flushing " + arr.length() + " pending SMS(es) to WebView...");
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                String sender = obj.optString("sender", "Bank");
                String body = obj.optString("body", "");
                dispatchSMSToWebView(sender, body);
            }
            // Clear the queue
            prefs.edit().remove("pending_sms").apply();
            dispatchDebugToWebView("[MainActivity] Pending SMS queue cleared.");
        } catch (Exception e) {
            Log.e(TAG, "Error flushing pending SMS: " + e.getMessage(), e);
            dispatchDebugToWebView("[MainActivity] ERROR in flushPendingSMS: " + e.getMessage());
        }
    }

    public static void onSMSReceived(final String sender, final String messageBody) {
        if (instance != null) {
            dispatchSMSToWebView(sender, messageBody);
        }
    }

    public static void dispatchSMSToWebView(final String sender, final String messageBody) {
        if (instance == null) {
            Log.w(TAG, "dispatchSMSToWebView: instance is null");
            return;
        }
        if (messageBody == null || messageBody.isEmpty()) {
            Log.w(TAG, "dispatchSMSToWebView: messageBody is null or empty");
            return;
        }
        instance.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (instance.getBridge() != null && instance.getBridge().getWebView() != null) {
                        String b64Body = Base64.encodeToString(messageBody.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                        String b64Sender = Base64.encodeToString((sender != null ? sender : "Bank").getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                        String js = "window.dispatchEvent(new CustomEvent('native_sms_received', { detail: { senderB64: '" + b64Sender + "', textB64: '" + b64Body + "' } }));";
                        instance.getBridge().getWebView().evaluateJavascript(js, null);
                        Log.d(TAG, "SMS dispatched to WebView. Sender=" + sender);
                    } else {
                        Log.w(TAG, "dispatchSMSToWebView: Bridge or WebView not ready yet.");
                        dispatchDebugToWebView("[MainActivity] WebView not ready - SMS dispatch skipped.");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error dispatching SMS to WebView: " + e.getMessage(), e);
                }
            }
        });
    }

    /**
     * Dispatches a debug log message to the WebView's native_sms_debug event,
     * so it appears in the in-app debug log panel.
     */
    public static void dispatchDebugToWebView(final String message) {
        Log.d(TAG, "[Debug] " + message);
        if (instance == null) return;
        instance.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (instance.getBridge() != null && instance.getBridge().getWebView() != null) {
                        String escaped = message.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
                        String js = "window.dispatchEvent(new CustomEvent('native_sms_debug', { detail: { log: '" + escaped + "' } }));";
                        instance.getBridge().getWebView().evaluateJavascript(js, null);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error dispatching debug to WebView: " + e.getMessage(), e);
                }
            }
        });
    }
}
