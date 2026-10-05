package org.cardiaccompanion.app;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebSettings settings = getBridge().getWebView().getSettings();
        // Android's font size setting would otherwise enlarge the page's text
        // by itself and break its layout. Keep the page at 100%; the page reads
        // the setting below and switches on its own Large text instead.
        settings.setTextZoom(100);

        // window.CCAndroid.fontScale() for www/js/platform/android.js.
        // The WebView only ever shows the app's own files, never a website.
        getBridge().getWebView().addJavascriptInterface(new FontScale(), "CCAndroid");
    }

    private class FontScale {
        @JavascriptInterface
        public float fontScale() {
            return getResources().getConfiguration().fontScale;
        }
    }
}
