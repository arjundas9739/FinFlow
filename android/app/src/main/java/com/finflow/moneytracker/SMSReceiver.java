package com.finflow.moneytracker;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;

public class SMSReceiver extends BroadcastReceiver {
    private static final String TAG = "FinFlow_SMSReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : "null";
        Log.d(TAG, "=== SMS Broadcast onReceive called! Action: " + action + " ===");
        MainActivity.dispatchDebugToWebView("[SMSReceiver] onReceive called. Action: " + action);

        if (intent == null) {
            Log.e(TAG, "Intent is null!");
            return;
        }

        if (!"android.provider.Telephony.SMS_RECEIVED".equals(action)) {
            Log.w(TAG, "Ignoring non-SMS action: " + action);
            MainActivity.dispatchDebugToWebView("[SMSReceiver] Ignored (non-SMS action): " + action);
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) {
            Log.e(TAG, "Bundle is null in SMS intent!");
            MainActivity.dispatchDebugToWebView("[SMSReceiver] ERROR: Bundle is null!");
            return;
        }

        try {
            Object[] pdus = (Object[]) bundle.get("pdus");
            String format = bundle.getString("format");
            Log.d(TAG, "PDUs array: " + (pdus != null ? pdus.length + " parts" : "NULL") + " | Format: " + format);
            MainActivity.dispatchDebugToWebView("[SMSReceiver] PDUs: " + (pdus != null ? pdus.length : "NULL") + " | Format: " + format);

            if (pdus == null || pdus.length == 0) {
                Log.e(TAG, "No PDUs in bundle!");
                MainActivity.dispatchDebugToWebView("[SMSReceiver] ERROR: No PDUs found!");
                return;
            }

            // Assemble multipart SMS
            StringBuilder fullBody = new StringBuilder();
            String sender = null;
            for (Object pdu : pdus) {
                SmsMessage smsMessage;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                } else {
                    smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                }
                if (smsMessage != null) {
                    if (sender == null) sender = smsMessage.getDisplayOriginatingAddress();
                    String part = smsMessage.getMessageBody();
                    if (part != null) fullBody.append(part);
                }
            }

            String messageBody = fullBody.toString();
            Log.i(TAG, "SMS assembled | From: " + sender + " | Body: " + messageBody);
            MainActivity.dispatchDebugToWebView("[SMSReceiver] From: " + sender + "\nBody: " + messageBody);

            if (messageBody.isEmpty()) {
                Log.w(TAG, "Empty message body!");
                MainActivity.dispatchDebugToWebView("[SMSReceiver] WARN: Empty message body. Skipping.");
                return;
            }

            // Save & forward ALL SMS with digits (let JS decide if it's financial)
            if (messageBody.matches(".*\\d+.*")) {
                Log.d(TAG, "SMS has digits - saving to pending queue and forwarding.");
                MainActivity.dispatchDebugToWebView("[SMSReceiver] SMS has digits -> saving & forwarding to app.");
                savePendingSMS(context, sender, messageBody);
                sendNotification(context, sender, messageBody);
                MainActivity.flushPendingSMS();
            } else {
                Log.d(TAG, "SMS has no digits - skipping.");
                MainActivity.dispatchDebugToWebView("[SMSReceiver] SMS has no digits -> SKIPPED.");
            }

        } catch (Exception e) {
            Log.e(TAG, "Error processing incoming SMS: " + e.getMessage(), e);
            MainActivity.dispatchDebugToWebView("[SMSReceiver] EXCEPTION: " + e.getMessage());
        }
    }

    private void savePendingSMS(Context context, String sender, String body) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("finflow_prefs", Context.MODE_PRIVATE);
            String pendingJson = prefs.getString("pending_sms", "[]");
            JSONArray arr = new JSONArray(pendingJson);
            JSONObject obj = new JSONObject();
            obj.put("sender", sender != null ? sender : "Bank");
            obj.put("body", body != null ? body : "");
            obj.put("time", System.currentTimeMillis());
            arr.put(obj);
            prefs.edit().putString("pending_sms", arr.toString()).apply();
            Log.d(TAG, "Saved pending SMS. Queue size: " + arr.length());
            MainActivity.dispatchDebugToWebView("[SMSReceiver] Saved to queue. Total pending: " + arr.length());
        } catch (Exception e) {
            Log.e(TAG, "Error saving pending SMS: " + e.getMessage(), e);
            MainActivity.dispatchDebugToWebView("[SMSReceiver] ERROR saving to queue: " + e.getMessage());
        }
    }

    private void sendNotification(Context context, String sender, String body) {
        try {
            if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "POST_NOTIFICATIONS permission not granted - skipping notification.");
                MainActivity.dispatchDebugToWebView("[SMSReceiver] Notification skipped (no POST_NOTIFICATIONS permission).");
                return;
            }

            // Ensure channel exists (critical when app is fully killed)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null && nm.getNotificationChannel("finflow_alerts") == null) {
                    android.app.NotificationChannel channel = new android.app.NotificationChannel(
                        "finflow_alerts", "FinFlow Bank Alerts", NotificationManager.IMPORTANCE_HIGH);
                    channel.setDescription("Auto-detected bank SMS transactions");
                    nm.createNotificationChannel(channel);
                    Log.d(TAG, "Notification channel created by SMSReceiver.");
                }
            }

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(context, (int) System.currentTimeMillis(), openIntent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "finflow_alerts")
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle("⚡ FinFlow: Bank SMS Detected")
                    .setContentText("Tap to review: " + (sender != null ? sender : "Bank"))
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true);

            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            notificationManager.notify((int) System.currentTimeMillis(), builder.build());
            Log.d(TAG, "Notification sent successfully.");
            MainActivity.dispatchDebugToWebView("[SMSReceiver] Notification sent.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to send notification: " + e.getMessage(), e);
            MainActivity.dispatchDebugToWebView("[SMSReceiver] Notification ERROR: " + e.getMessage());
        }
    }
}
