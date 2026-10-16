package dev.openhands.agentcanvas;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

/**
 * Keeps the app process (and therefore the WebView's agent-server WebSocket)
 * alive while Agent Canvas is backgrounded. Android otherwise stops the
 * renderer shortly after the activity leaves the foreground, which drops a
 * running conversation; a foreground service with a low-importance
 * notification holds the process until the user returns.
 *
 * Started from {@link MainActivity#onStop()} and stopped on
 * {@link MainActivity#onStart()}; the JS side reconnects the socket on resume
 * via the page-visibility hook.
 */
public class ConnectionKeepAliveService extends Service {

    private static final String CHANNEL_ID = "agent_canvas_connection";
    private static final int NOTIFICATION_ID = 1;

    public static void start(Context context) {
        Intent intent = new Intent(context, ConnectionKeepAliveService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void stop(Context context) {
        context.stopService(new Intent(context, ConnectionKeepAliveService.class));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createChannel();
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.app_name))
                .setContentText(getString(R.string.connection_notification))
                .setSmallIcon(android.R.drawable.stat_sys_upload)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .build();
        startForeground(NOTIFICATION_ID, notification);
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                getString(R.string.connection_channel_name),
                NotificationManager.IMPORTANCE_LOW);
        manager.createNotificationChannel(channel);
    }
}
