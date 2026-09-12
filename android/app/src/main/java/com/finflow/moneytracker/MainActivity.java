package com.finflow.moneytracker;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
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
    private static boolean isJsReady = false;

    public class SMSBridge {
        @JavascriptInterface
        public void notifyAppReady() {
            Log.d(TAG, "JS App Ready signal received from WebView!");
            isJsReady = true;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    flushPendingSMS();
                }
            });
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;
        isJsReady = false;
        createNotificationChannel();
        requestPermissions();
        setupJavascriptBridge();
    }

    private void setupJavascriptBridge() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.addJavascriptInterface(new SMSBridge(), "FinFlowNative");
                Log.d(TAG, "JavascriptInterface FinFlowNative registered successfully.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error setting up JavascriptInterface: " + e.getMessage(), e);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        instance = this;
        setupJavascriptBridge();
        if (isJsReady) {
            flushPendingSMS();
        }
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
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                
                ActivityCompat.requestPermissions(this,
                        new String[]{
                            Manifest.permission.RECEIVE_SMS, 
                            Manifest.permission.READ_SMS, 
                            Manifest.permission.POST_NOTIFICATIONS
                        },
                        SMS_PERMISSION_CODE);
            } else {
                Log.d(TAG, "Permissions already granted.");
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
                
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS},
                        SMS_PERMISSION_CODE);
            } else {
                Log.d(TAG, "Permissions already granted.");
            }
        }
    }

    public static void flushPendingSMS() {
        if (instance != null && instance.getBridge() != null && instance.getBridge().getWebView() != null) {
            try {
                SharedPreferences prefs = instance.getSharedPreferences("finflow_prefs", Context.MODE_PRIVATE);
                String pendingJson = prefs.getString("pending_sms", "[]");
                if (!"[]".equals(pendingJson)) {
                    JSONArray arr = new JSONArray(pendingJson);
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject obj = arr.getJSONObject(i);
                        String sender = obj.optString("sender", "Bank");
                        String body = obj.optString("body", "");
                        dispatchSMSToWebView(sender, body);
                    }
                    prefs.edit().remove("pending_sms").apply();
                    Log.d(TAG, "Flushed " + arr.length() + " pending SMS messages to WebView.");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error flushing pending SMS: " + e.getMessage(), e);
            }
        }
    }

    public static void onSMSReceived(final String sender, final String messageBody) {
        if (instance != null && isJsReady) {
            dispatchSMSToWebView(sender, messageBody);
        }
    }

    private static void dispatchSMSToWebView(final String sender, final String messageBody) {
        if (instance != null && instance.getBridge() != null && instance.getBridge().getWebView() != null && messageBody != null) {
            instance.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String b64Body = Base64.encodeToString(messageBody.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                        String b64Sender = Base64.encodeToString((sender != null ? sender : "Bank").getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                        String js = "window.dispatchEvent(new CustomEvent('native_sms_received', { detail: { senderB64: '" + b64Sender + "', textB64: '" + b64Body + "' } }));";
                        instance.getBridge().getWebView().evaluateJavascript(js, null);
                        Log.d(TAG, "SMS dispatched to WebView successfully.");
                    } catch (Exception e) {
                        Log.e(TAG, "Error evaluating JS for SMS: " + e.getMessage(), e);
                    }
                }
            });
        }
    }
}
