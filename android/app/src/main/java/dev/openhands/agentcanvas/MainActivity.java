package dev.openhands.agentcanvas;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * WebView host for the Agent Canvas static build.
 *
 * A low-importance foreground service is held while the app is backgrounded so
 * the WebView (and its agent-server WebSocket) survives the activity leaving
 * the foreground. On resume the page-visibility hook in the web bundle
 * reconnects any stale socket, so a conversation that kept running server-side
 * picks back up.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        ConnectionKeepAliveService.stop(this);
    }

    @Override
    public void onStop() {
        super.onStop();
        ConnectionKeepAliveService.start(this);
    }
}
