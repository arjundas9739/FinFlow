package com.finflow.moneytracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

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
                                Log.i(TAG, "Financial SMS detected! Forwarding to FinFlow engine...");
                                MainActivity.onSMSReceived(sender, messageBody);
                                sendNotification(context, sender, messageBody);
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error processing incoming SMS: " + e.getMessage(), e);
                }
            }
        }
    }

    private void sendNotification(Context context, String sender, String body) {
        try {
            if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "Cannot post notification: POST_NOTIFICATIONS permission not granted");
                return;
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle("⚡ FinFlow: Bank SMS Auto-Logged")
                    .setContentText("Detected transaction from " + (sender != null ? sender : "Bank"))
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
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
        return (lower.contains("debited") || lower.contains("credited") || lower.contains("spent") ||
                lower.contains("paid") || lower.contains("received") || lower.contains("withdrawn") ||
                lower.contains("a/c") || lower.contains("acct") || lower.contains("inr") ||
                lower.contains("rs.") || lower.contains("₹") || lower.contains("upi") ||
                lower.contains("emi") || lower.contains("salary")) &&
               (lower.contains("rs") || lower.contains("inr") || lower.contains("₹") || lower.matches(".*\\d+.*"));
    }
}
