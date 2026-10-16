/**
 * Native-shell (Capacitor/Android) detection for the renderer.
 *
 * Capacitor injects `window.Capacitor` into the WebView; `isNativePlatform()`
 * is true only inside the packaged app, false in a browser tab, and the global
 * is absent in Electron. Used to hide UI that only works in the desktop or
 * server-hosted builds (the Managed Agents / DigitalOcean bridge), which cannot
 * run inside the Android WebView.
 */

interface CapacitorRuntime {
  isNativePlatform?: () => boolean;
}

declare global {
  interface Window {
    Capacitor?: CapacitorRuntime;
  }
}

function getCapacitorRuntime(): CapacitorRuntime | undefined {
  return typeof window === "undefined" ? undefined : window.Capacitor;
}

/** True inside the packaged Android app; false in a browser tab or Electron. */
export function isNativeShell(): boolean {
  return getCapacitorRuntime()?.isNativePlatform?.() ?? false;
}
