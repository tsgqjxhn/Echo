package com.echo.app;

import android.Manifest;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.echo.app.plugins.NativeChatStreamPlugin;
import com.echo.app.plugins.NativeHttpPlugin;
import com.echo.app.plugins.NativePermissionPlugin;
import com.echo.app.plugins.NativeSpeechPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeHttpPlugin.class);
        registerPlugin(NativeChatStreamPlugin.class);
        registerPlugin(NativePermissionPlugin.class);
        registerPlugin(NativeSpeechPlugin.class);
        super.onCreate(savedInstanceState);
        grantWebViewPermissions();
    }

    @Override
    public void onRestart() {
        super.onRestart();
        grantWebViewPermissions();
    }

    private void grantWebViewPermissions() {
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        webView.setWebChromeClient(new WebChromeClient() {
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
                request.deny();
            }
        });
    }
}
