package com.echo.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.echo.app.plugins.NativeChatStreamPlugin;
import com.echo.app.plugins.NativeHttpPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeHttpPlugin.class);
        registerPlugin(NativeChatStreamPlugin.class);
        super.onCreate(savedInstanceState);
    }
}