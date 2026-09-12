package com.finflow.moneytracker;

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
        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                try {
                    Object[] pdus = (Object[]) bundle.get("pdus");
                    String format = bundle.getString("format");
                    if (pdus != null) {
                        for (Object pdu : pdus) {
                            SmsMessage smsMessage;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                            } else {
                                smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                            }

                            String sender = smsMessage.getDisplayOriginatingAddress();
                            String messageBody = smsMessage.getMessageBody();

                            Log.d(TAG, "SMS Received from: " + sender + " | Body: " + messageBody);

                            if (isFinancialSMS(messageBody)) {
                                Log.i(TAG, "Financial SMS detected! Processing...");
                                savePendingSMS(context, sender, messageBody);
                                sendNotification(context, sender, messageBody);
                                MainActivity.flushPendingSMS();
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error processing incoming SMS: " + e.getMessage(), e);
                }
            }
        }
    }

    private void savePendingSMS(Context context, String sender, String body) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("finflow_prefs", Context.MODE_PRIVATE);
            String pendingJson = prefs.getString("pending_sms", "[]");
            JSONArray arr = new JSONArray(pendingJson);
            JSONObject obj = new JSONObject();
            obj.put("sender", sender);
            obj.put("body", body);
            obj.put("time", System.currentTimeMillis());
            arr.put(obj);
            prefs.edit().putString("pending_sms", arr.toString()).apply();
            Log.d(TAG, "Saved pending SMS to SharedPreferences. Total pending: " + arr.length());
        } catch (Exception e) {
            Log.e(TAG, "Error saving pending SMS to SharedPreferences: " + e.getMessage(), e);
        }
    }

    private void sendNotification(Context context, String sender, String body) {
        try {
            if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "Cannot post notification: POST_NOTIFICATIONS permission not granted");
                return;
            }

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(context, (int) System.currentTimeMillis(), openIntent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle("⚡ FinFlow: Bank SMS Detected")
                    .setContentText("Tap to review & log transaction from " + (sender != null ? sender : "Bank"))
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true);

            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            int notificationId = (int) System.currentTimeMillis();
            notificationManager.notify(notificationId, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Failed to send notification: " + e.getMessage(), e);
        }
    }

    private boolean isFinancialSMS(String text) {
        if (text == null) return false;
        String lower = text.toLowerCase();
        boolean hasNumbers = lower.matches(".*\\d+.*");
        boolean hasFinancialKeywords = lower.contains("debited") || lower.contains("debit") || lower.contains("dr") ||
                                       lower.contains("credited") || lower.contains("credit") || lower.contains("cr") ||
                                       lower.contains("spent") || lower.contains("paid") || lower.contains("received") ||
                                       lower.contains("sent") || lower.contains("transferred") || lower.contains("withdrawn") ||
                                       lower.contains("deducted") || lower.contains("payment") || lower.contains("a/c") ||
                                       lower.contains("acct") || lower.contains("account") || lower.contains("inr") ||
                                       lower.contains("rs") || lower.contains("₹") || lower.contains("upi") ||
                                       lower.contains("vpa") || lower.contains("emi") || lower.contains("salary") ||
                                       lower.contains("bank") || lower.contains("bal") || lower.contains("balance") ||
                                       lower.contains("card") || lower.contains("hdfc") || lower.contains("sbi") ||
                                       lower.contains("icici") || lower.contains("axis") || lower.contains("kotak") ||
                                       lower.contains("paytm") || lower.contains("gpay") || lower.contains("phonepe") ||
                                       lower.contains("amt") || lower.contains("amount");
        return hasNumbers && hasFinancialKeywords;
    }
}
