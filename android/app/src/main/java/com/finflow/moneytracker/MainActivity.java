package com.finflow.moneytracker;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "FinFlow_MainActivity";
    private static final int SMS_PERMISSION_CODE = 101;
    private static MainActivity instance;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;
        requestSMSPermissions();
    }

    private void requestSMSPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS},
                    SMS_PERMISSION_CODE);
        } else {
            Log.d(TAG, "SMS Permissions already granted.");
        }
    }

    public static void onSMSReceived(final String sender, final String messageBody) {
        if (instance != null && instance.bridge != null) {
            instance.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    String escapedBody = messageBody.replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
                    String js = "window.dispatchEvent(new CustomEvent('native_sms_received', { detail: { sender: '" + sender + "', text: '" + escapedBody + "' } }));";
                    instance.bridge.getWebView().evaluateJavascript(js, null);
                }
            });
        }
    }
}
