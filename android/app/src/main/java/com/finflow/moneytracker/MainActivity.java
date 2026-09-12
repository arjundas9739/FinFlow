package com.finflow.moneytracker;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
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
        setupJavascriptInterface();
        createNotificationChannel();
        requestPermissions();
        requestBatteryOptimizationExemption();
        requestAutostartIfMIUI();

        dispatchDebugToWebView("[MainActivity] onCreate: App started. Scheduling pending SMS flush...");

        // Flush pending SMS at 1.5s and 4s after cold start (wait for WebView to load)
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                setupJavascriptInterface();
                dispatchDebugToWebView("[MainActivity] Flush attempt #1 (1.5s after start)");
                flushPendingSMS();
            }
        }, 1500);

        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                setupJavascriptInterface();
                dispatchDebugToWebView("[MainActivity] Flush attempt #2 (4s after start)");
                flushPendingSMS();
            }
        }, 4000);
    }

    @Override
    public void onResume() {
        super.onResume();
        instance = this;
        setupJavascriptInterface();
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
            // First scan Android SMS Inbox for any SMS received while app was closed
            syncInboxSMS(instance);

            SharedPreferences prefs = instance.getSharedPreferences("finflow_prefs", Context.MODE_PRIVATE);

            // 1. Flush any saved background native debug logs first
            String savedLogs = prefs.getString("pending_native_logs", "[]");
            if (!"[]".equals(savedLogs)) {
                JSONArray logArr = new JSONArray(savedLogs);
                Log.d(TAG, "Flushing " + logArr.length() + " saved background native logs.");
                for (int i = 0; i < logArr.length(); i++) {
                    final String logMsg = logArr.optString(i, "");
                    if (!logMsg.isEmpty()) {
                        instance.runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    if (instance.getBridge() != null && instance.getBridge().getWebView() != null) {
                                        String escaped = logMsg.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
                                        String js = "window.dispatchEvent(new CustomEvent('native_sms_debug', { detail: { log: '" + escaped + "' } }));";
                                        instance.getBridge().getWebView().evaluateJavascript(js, null);
                                    }
                                } catch (Exception e) {}
                            }
                        });
                    }
                }
                prefs.edit().remove("pending_native_logs").apply();
            }

            // 2. Flush pending SMS
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
     * If WebView is not ready, saves to SharedPreferences for later flushing.
     */
    public static void dispatchDebugToWebView(final String message) {
        Log.d(TAG, "[Debug] " + message);
        if (instance == null) {
            // App is closed — save log to SharedPreferences so it shows after restart
            saveNativeLog(message);
            return;
        }
        instance.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (instance.getBridge() != null && instance.getBridge().getWebView() != null) {
                        String escaped = message.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
                        String js = "window.dispatchEvent(new CustomEvent('native_sms_debug', { detail: { log: '" + escaped + "' } }));";
                        instance.getBridge().getWebView().evaluateJavascript(js, null);
                    } else {
                        // WebView loading — save for later
                        saveNativeLog(message);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error dispatching debug to WebView: " + e.getMessage(), e);
                }
            }
        });
    }

    private static void saveNativeLog(String message) {
        if (instance == null) return;
        try {
            SharedPreferences prefs = instance.getSharedPreferences("finflow_prefs", Context.MODE_PRIVATE);
            String existing = prefs.getString("pending_native_logs", "[]");
            JSONArray arr = new JSONArray(existing);
            arr.put("[BACKGROUND] " + message);
            if (arr.length() > 100) arr.remove(0);
            prefs.edit().putString("pending_native_logs", arr.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Error saving native log: " + e.getMessage(), e);
        }
    }

    private void requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                String packageName = getPackageName();
                android.os.PowerManager pm = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                    android.content.Intent intent = new android.content.Intent();
                    intent.setAction(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(android.net.Uri.parse("package:" + packageName));
                    startActivity(intent);
                    dispatchDebugToWebView("[MainActivity] Requested battery optimization exemption prompt.");
                } else {
                    dispatchDebugToWebView("[MainActivity] Already ignoring battery optimizations.");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error requesting battery optimization exemption: " + e.getMessage());
            }
        }
    }

    private void requestAutostartIfMIUI() {
        try {
            String manufacturer = android.os.Build.MANUFACTURER.toLowerCase();
            if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco")) {
                SharedPreferences prefs = getSharedPreferences("finflow_prefs", Context.MODE_PRIVATE);
                boolean prompted = prefs.getBoolean("miui_autostart_prompted", false);
                if (!prompted) {
                    prefs.edit().putBoolean("miui_autostart_prompted", true).apply();
                    android.content.Intent intent = new android.content.Intent();
                    intent.setComponent(new android.content.ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"));
                    if (getPackageManager().resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY) != null) {
                        dispatchDebugToWebView("[MainActivity] Opening MIUI Autostart settings screen...");
                        startActivity(intent);
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Autostart settings intent failed: " + e.getMessage());
        }
    }

    public static void syncInboxSMS(Context context) {
        if (context == null) return;
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            dispatchDebugToWebView("[MainActivity] syncInboxSMS: READ_SMS permission not granted.");
            return;
        }

        try {
            SharedPreferences prefs = context.getSharedPreferences("finflow_prefs", Context.MODE_PRIVATE);
            boolean isFirstRun = !prefs.contains("inbox_sync_initialized");

            String processedIdsJson = prefs.getString("processed_sms_ids", "[]");
            JSONArray processedIdsArr = new JSONArray(processedIdsJson);
            java.util.Set<String> processedIds = new java.util.HashSet<>();
            for (int i = 0; i < processedIdsArr.length(); i++) {
                processedIds.add(processedIdsArr.getString(i));
            }

            android.net.Uri inboxUri = android.net.Uri.parse("content://sms/inbox");

            // On fresh install, seed processedIds with all existing inbox SMS so historical messages before install aren't queued
            if (isFirstRun) {
                dispatchDebugToWebView("[MainActivity] Fresh install detected: Initializing SMS Inbox baseline...");
                long seedCutoff = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000L); // 7 days
                android.database.Cursor seedCursor = context.getContentResolver().query(
                    inboxUri,
                    new String[]{"_id", "date"},
                    "date > ?",
                    new String[]{ String.valueOf(seedCutoff) },
                    "date DESC"
                );
                if (seedCursor != null) {
                    while (seedCursor.moveToNext()) {
                        String id = seedCursor.getString(seedCursor.getColumnIndexOrThrow("_id"));
                        long date = seedCursor.getLong(seedCursor.getColumnIndexOrThrow("date"));
                        processedIds.add(id + "_" + date);
                    }
                    seedCursor.close();
                }

                JSONArray initProcessedArr = new JSONArray();
                int limit = 0;
                for (String key : processedIds) {
                    initProcessedArr.put(key);
                    limit++;
                    if (limit > 500) break;
                }
                prefs.edit()
                    .putBoolean("inbox_sync_initialized", true)
                    .putString("processed_sms_ids", initProcessedArr.toString())
                    .apply();
                dispatchDebugToWebView("[MainActivity] Inbox baseline initialized (" + processedIds.size() + " existing SMS marked as seen).");
                return;
            }

            // Normal sync: Look back 48 hours for any unhandled bank SMS received while app was closed
            long cutoffTime = System.currentTimeMillis() - (48 * 60 * 60 * 1000L);
            String selection = "date > ?";
            String[] selectionArgs = new String[]{ String.valueOf(cutoffTime) };
            String sortOrder = "date DESC";

            android.database.Cursor cursor = context.getContentResolver().query(
                inboxUri,
                new String[]{"_id", "address", "body", "date"},
                selection,
                selectionArgs,
                sortOrder
            );

            if (cursor == null) {
                dispatchDebugToWebView("[MainActivity] syncInboxSMS: Inbox cursor is null.");
                return;
            }

            int countNew = 0;
            String pendingJson = prefs.getString("pending_sms", "[]");
            JSONArray pendingArr = new JSONArray(pendingJson);

            while (cursor.moveToNext()) {
                if (countNew >= 8) break; // Allow up to 8 unhandled missed bank SMS

                String id = cursor.getString(cursor.getColumnIndexOrThrow("_id"));
                String address = cursor.getString(cursor.getColumnIndexOrThrow("address"));
                String body = cursor.getString(cursor.getColumnIndexOrThrow("body"));
                long date = cursor.getLong(cursor.getColumnIndexOrThrow("date"));

                String smsKey = id + "_" + date;
                if (processedIds.contains(smsKey)) {
                    continue;
                }

                // Mark key as seen/processed
                processedIds.add(smsKey);

                if (isBankOrFinancialSMS(body)) {
                    boolean isDuplicate = false;
                    for (int k = 0; k < pendingArr.length(); k++) {
                        JSONObject existingObj = pendingArr.optJSONObject(k);
                        if (existingObj != null && body.equals(existingObj.optString("body", ""))) {
                            isDuplicate = true;
                            break;
                        }
                    }
                    if (isDuplicate) {
                        dispatchDebugToWebView("[MainActivity] Inbox Sync: Bank SMS already queued -> skipping.");
                        continue;
                    }

                    JSONObject obj = new JSONObject();
                    obj.put("sender", address != null ? address : "Bank");
                    obj.put("body", body);
                    obj.put("time", date);
                    pendingArr.put(obj);
                    countNew++;
                    dispatchDebugToWebView("[MainActivity] 📥 Inbox Sync caught missed Bank SMS from " + address + ": " + (body.length() > 50 ? body.substring(0, 50) + "..." : body));
                }
            }
            cursor.close();

            // Save updated processed IDs (keep max 500)
            JSONArray updatedProcessedArr = new JSONArray();
            int limit = 0;
            for (String key : processedIds) {
                updatedProcessedArr.put(key);
                limit++;
                if (limit > 500) break;
            }
            prefs.edit().putString("processed_sms_ids", updatedProcessedArr.toString()).apply();

            if (countNew > 0) {
                prefs.edit().putString("pending_sms", pendingArr.toString()).apply();
                dispatchDebugToWebView("[MainActivity] Inbox Sync queued " + countNew + " missed SMS(es).");
            }

        } catch (Exception e) {
            Log.e(TAG, "Error in syncInboxSMS: " + e.getMessage(), e);
            dispatchDebugToWebView("[MainActivity] ERROR in syncInboxSMS: " + e.getMessage());
        }
    }

    private static boolean isBankOrFinancialSMS(String body) {
        if (body == null || !body.matches(".*\\d+.*")) return false;
        String lower = body.toLowerCase();
        return lower.contains("spent") || lower.contains("debited") || lower.contains("credited") ||
               lower.contains("paid") || lower.contains("transferred") || lower.contains("acct") ||
               lower.contains("card") || lower.contains("inr") || lower.contains("rs.") || lower.contains("rs ") ||
               lower.contains("upi") || lower.contains("hdfc") || lower.contains("sbi") || lower.contains("icici") ||
               lower.contains("axis") || lower.contains("kotak") || lower.contains("paytm") || lower.contains("gpay") ||
               lower.contains("phonepe") || lower.contains("bank") || lower.contains("vpa") || lower.contains("amazon in");
    }

    private void setupJavascriptInterface() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().addJavascriptInterface(new NativeFileInterface(MainActivity.this), "FinFlowNativeFile");
                        Log.d(TAG, "NativeFileInterface attached to WebView as 'FinFlowNativeFile'");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error setting up JavascriptInterface: " + e.getMessage());
                }
            }
        });
    }

    public class NativeFileInterface {
        private Context context;
        public NativeFileInterface(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void saveToDownloads(final String fileName, final String content, final String mimeType) {
            try {
                Log.d(TAG, "saveToDownloads called for: " + fileName + " (length: " + (content != null ? content.length() : 0) + ")");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType != null ? mimeType : "application/json");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                    Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        OutputStream out = context.getContentResolver().openOutputStream(uri);
                        if (out != null) {
                            out.write(content.getBytes(StandardCharsets.UTF_8));
                            out.flush();
                            out.close();
                        }
                        showToastOnMain("Saved to Download: " + fileName);
                        dispatchDebugToWebView("[NativeFile] File saved to Downloads: " + fileName);
                        return;
                    }
                }

                // Fallback for older Android versions (< Android 10)
                File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadDir.exists()) downloadDir.mkdirs();
                File targetFile = new File(downloadDir, fileName);
                FileOutputStream fos = new FileOutputStream(targetFile);
                fos.write(content.getBytes(StandardCharsets.UTF_8));
                fos.flush();
                fos.close();
                showToastOnMain("Saved to Download: " + fileName);
                dispatchDebugToWebView("[NativeFile] File saved to Download dir: " + targetFile.getAbsolutePath());
            } catch (Exception e) {
                Log.e(TAG, "Error saving file to Downloads: " + e.getMessage(), e);
                showToastOnMain("Failed to save download: " + e.getMessage());
                dispatchDebugToWebView("[NativeFile] Error saving download: " + e.getMessage());
            }
        }
    }

    private void showToastOnMain(final String message) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(MainActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }
}

