import { afterEach, describe, expect, it } from "vitest";
import { isNativeShell } from "#/utils/native-shell";

function setCapacitor(runtime: Window["Capacitor"] | undefined) {
  if (runtime === undefined) {
    delete window.Capacitor;
    return;
  }
  window.Capacitor = runtime;
}

afterEach(() => {
  setCapacitor(undefined);
});

describe("isNativeShell", () => {
  it("is false in a browser tab or Electron, where Capacitor is absent", () => {
    expect(isNativeShell()).toBe(false);
  });

  it("is true inside the packaged native app", () => {
    setCapacitor({ isNativePlatform: () => true });

    expect(isNativeShell()).toBe(true);
  });

  it("is false when Capacitor is present but not on a native platform", () => {
    setCapacitor({ isNativePlatform: () => false });

    expect(isNativeShell()).toBe(false);
  });

  it("is false for a partial Capacitor global without isNativePlatform", () => {
    setCapacitor({});

    expect(isNativeShell()).toBe(false);
  });
});
