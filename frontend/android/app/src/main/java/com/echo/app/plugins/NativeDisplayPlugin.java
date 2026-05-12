package com.echo.app.plugins;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeDisplay")
public class NativeDisplayPlugin extends Plugin {

    private static boolean landscapeModeEnabled = false;

    @PluginMethod
    public void setLandscapeMode(PluginCall call) {
        Boolean enabledValue = call.getBoolean("enabled", false);
        boolean enabled = enabledValue != null && enabledValue;
        Activity activity = getActivity();

        landscapeModeEnabled = enabled;
        if (activity == null) {
            call.reject("Activity is not available");
            return;
        }

        activity.runOnUiThread(() -> {
            applyMode(activity, enabled);
            JSObject result = new JSObject();
            result.put("enabled", enabled);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void setSurvivorMode(PluginCall call) {
        setLandscapeMode(call);
    }

    public static void applyCurrentMode(Activity activity) {
        if (activity != null) {
            applyMode(activity, landscapeModeEnabled);
        }
    }

    private static void applyMode(Activity activity, boolean enabled) {
        Window window = activity.getWindow();
        if (window == null) return;

        if (enabled) {
            activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
            hideSystemBars(window);
        } else {
            activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            showSystemBars(window);
        }
    }

    private static void hideSystemBars(Window window) {
        window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        View decorView = window.getDecorView();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = decorView.getWindowInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
            return;
        }

        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    private static void showSystemBars(Window window) {
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        View decorView = window.getDecorView();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = decorView.getWindowInsetsController();
            if (controller != null) {
                controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            }
            return;
        }

        decorView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
    }
}
