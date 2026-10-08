package org.cardiaccompanion.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Tells the page the phone's font scale (Settings > Display > Font size):
 * 1.0 is the default, 1.3 is 30% larger. The page reads it through
 * www/js/platform/display.js.
 */
@CapacitorPlugin(name = "DisplaySettings")
public class DisplaySettingsPlugin extends Plugin {

    @PluginMethod
    public void getFontScale(PluginCall call) {
        JSObject result = new JSObject();
        result.put("fontScale", (double) getContext().getResources().getConfiguration().fontScale);
        call.resolve(result);
    }
}
