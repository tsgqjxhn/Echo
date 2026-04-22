package com.echo.app.plugins;

import android.Manifest;
import android.content.pm.PackageManager;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(
    name = "NativePermission",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        ),
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        ),
        @Permission(
            alias = "storage",
            strings = {
                Manifest.permission.READ_EXTERNAL_STORAGE,
                "android.permission.READ_MEDIA_IMAGES"
            }
        )
    }
)
public class NativePermissionPlugin extends Plugin {

    private static final Map<String, String> ALIAS_MAP = new HashMap<>();
    static {
        ALIAS_MAP.put("microphone", "microphone");
        ALIAS_MAP.put("camera", "camera");
        ALIAS_MAP.put("storage", "storage");
    }

    @PluginMethod
    public void check(PluginCall call) {
        String alias = call.getString("alias", "");
        String androidPermission = getAndroidPermission(alias);

        if (androidPermission == null) {
            call.reject("Unknown permission alias: " + alias);
            return;
        }

        boolean granted = ContextCompat.checkSelfPermission(
            getContext(), androidPermission
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject result = new JSObject();
        result.put("granted", granted);
        result.put("state", granted ? "granted" : "prompt");
        call.resolve(result);
    }

    @PluginMethod
    public void request(PluginCall call) {
        String alias = call.getString("alias", "");

        if (!ALIAS_MAP.containsKey(alias)) {
            call.reject("Unknown permission alias: " + alias);
            return;
        }

        requestPermissionForAlias(alias, call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        String alias = call.getString("alias", "");
        boolean granted = getPermissionState(alias) == com.getcapacitor.PermissionState.GRANTED;

        JSObject result = new JSObject();
        result.put("granted", granted);
        result.put("state", granted ? "granted" : "denied");
        call.resolve(result);
    }

    private String getAndroidPermission(String alias) {
        switch (alias) {
            case "microphone":
                return Manifest.permission.RECORD_AUDIO;
            case "camera":
                return Manifest.permission.CAMERA;
            case "storage":
                if (android.os.Build.VERSION.SDK_INT >= 33) {
                    return "android.permission.READ_MEDIA_IMAGES";
                }
                return Manifest.permission.READ_EXTERNAL_STORAGE;
            default:
                return null;
        }
    }
}
