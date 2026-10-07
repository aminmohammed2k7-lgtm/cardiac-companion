package org.cardiaccompanion.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugins must be registered before the bridge starts.
        registerPlugin(DisplaySettingsPlugin.class);
        super.onCreate(savedInstanceState);

        // Keep the WebView's text at 100% whatever the phone's font size.
        // Android's text zoom enlarges only the letters, not the boxes around
        // them, so buttons, the dose number and the week grid would overflow.
        // Instead, on the first launch the page switches on the app's own
        // "Large text", which scales the whole layout evenly (see init() in
        // www/index.html). Changing the font size later recreates this
        // activity, so the setting is applied again.
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
