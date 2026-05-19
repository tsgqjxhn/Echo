package com.echo.app;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.echo.app.plugins.NativeChatStreamPlugin;
import com.echo.app.plugins.NativeDisplayPlugin;
import com.echo.app.plugins.NativeHttpPlugin;
import com.echo.app.plugins.NativePermissionPlugin;
import com.echo.app.plugins.NativeSpeechPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeHttpPlugin.class);
        registerPlugin(NativeChatStreamPlugin.class);
        registerPlugin(NativeDisplayPlugin.class);
        registerPlugin(NativePermissionPlugin.class);
        registerPlugin(NativeSpeechPlugin.class);
        super.onCreate(savedInstanceState);
        installPermissiveChromeClient();
        installAppControlBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        NativeDisplayPlugin.applyCurrentMode(this);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            NativeDisplayPlugin.applyCurrentMode(this);
        }
    }

    @Override
    public void onRestart() {
        super.onRestart();
        installPermissiveChromeClient();
        installAppControlBridge();
    }

    @Override
    public void onBackPressed() {
        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        if (webView != null) {
            webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('echo-native-back'))", null);
            return;
        }
        super.onBackPressed();
    }

    /**
     * Replace the default Capacitor BridgeWebChromeClient with a subclass that
     * automatically grants WebView audio/video permission requests (used by
     * getUserMedia in the WebView). Extending BridgeWebChromeClient preserves
     * file-chooser handling required for `<input type="file">` (used by avatar
     * pickers and import buttons).
     */
    private void installPermissiveChromeClient() {
        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        if (webView == null) return;

        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                String[] resources = request.getResources();
                for (String resource : resources) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                            || PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                        request.grant(resources);
                        return;
                    }
                }
                super.onPermissionRequest(request);
            }
        });
    }

    private void installAppControlBridge() {
        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        if (webView == null) return;

        webView.addJavascriptInterface(new EchoAppControl(), "EchoAppControl");
    }

    private class EchoAppControl {
        @JavascriptInterface
        public void exitApp() {
            runOnUiThread(() -> finishAndRemoveTask());
        }
    }
}
