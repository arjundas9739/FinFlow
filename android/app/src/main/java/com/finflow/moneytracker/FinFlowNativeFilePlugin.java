package com.finflow.moneytracker;

import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;
import android.widget.Toast;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "FinFlowNativeFile")
public class FinFlowNativeFilePlugin extends Plugin {
    private static final String TAG = "FinFlow_NativeFilePlugin";

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        final String fileName = call.getString("fileName");
        final String content = call.getString("content");
        final String mimeType = call.getString("mimeType", "application/json");

        if (fileName == null || content == null) {
            call.reject("FileName and Content are required");
            return;
        }

        try {
            Log.d(TAG, "Capacitor Plugin saveToDownloads: " + fileName + " (length: " + content.length() + ")");

            // 1. Android 10+ (API 29+) Scoped Storage compliant write via MediaStore ContentResolver
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    values.put(MediaStore.Downloads.IS_PENDING, 1);

                    Uri uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        OutputStream out = getContext().getContentResolver().openOutputStream(uri, "w");
                        if (out != null) {
                            out.write(content.getBytes(StandardCharsets.UTF_8));
                            out.flush();
                            out.close();
                        }
                        values.clear();
                        values.put(MediaStore.Downloads.IS_PENDING, 0);
                        getContext().getContentResolver().update(uri, values, null, null);

                        if (getActivity() != null) {
                            getActivity().runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    Toast.makeText(getContext(), "Saved to Downloads: " + fileName, Toast.LENGTH_LONG).show();
                                }
                            });
                        }

                        MainActivity.dispatchDebugToWebView("[NativeFilePlugin] Saved to Downloads via MediaStore: " + fileName);
                        call.resolve();
                        return;
                    }
                } catch (Exception e) {
                    Log.w(TAG, "MediaStore Q insert fallback info: " + e.getMessage());
                }
            }

            // 2. Direct File Write (Pre-Android 10 or MediaStore fallback)
            File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!downloadDir.exists()) downloadDir.mkdirs();
            File targetFile = new File(downloadDir, fileName);
            if (targetFile.exists()) {
                try { targetFile.delete(); } catch(Exception delErr) { Log.w(TAG, "Delete stale file info: " + delErr.getMessage()); }
            }
            FileOutputStream fos = new FileOutputStream(targetFile, false);
            fos.write(content.getBytes(StandardCharsets.UTF_8));
            fos.flush();
            fos.close();
            Log.d(TAG, "File written: " + targetFile.getAbsolutePath());

            // Trigger MediaScanner scan
            MediaScannerConnection.scanFile(
                getContext(),
                new String[]{ targetFile.getAbsolutePath() },
                new String[]{ mimeType },
                new MediaScannerConnection.OnScanCompletedListener() {
                    @Override
                    public void onScanCompleted(String path, Uri uri) {
                        Log.d(TAG, "MediaScanner indexed file: " + path + " -> " + uri);
                    }
                }
            );

            if (getActivity() != null) {
                getActivity().runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(getContext(), "Saved to Downloads: " + fileName, Toast.LENGTH_LONG).show();
                    }
                });
            }

            MainActivity.dispatchDebugToWebView("[NativeFilePlugin] File saved to Downloads: " + fileName);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error saving file to Downloads via Plugin: " + e.getMessage(), e);
            MainActivity.dispatchDebugToWebView("[NativeFilePlugin] ERROR: " + e.getMessage());
            call.reject("Error saving file: " + e.getMessage());
        }
    }
}
