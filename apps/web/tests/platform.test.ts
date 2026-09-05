import { describe, expect, it } from "vite-plus/test";
import { createDesktopPlatformAdapter, createWebPlatformAdapter } from "../src/platform/adapter.ts";

describe("PlatformAdapter", () => {
  it("web adapter reports web platform", async () => {
    const adapter = createWebPlatformAdapter();
    expect((await adapter.getPlatformInfo()).platform).toBe("web");
  });

  it("desktop adapter reports desktop platform", async () => {
    const adapter = createDesktopPlatformAdapter();
    expect((await adapter.getPlatformInfo()).platform).toBe("desktop");
  });

  it("desktop openExternal rejects outside Tauri runtime", async () => {
    const adapter = createDesktopPlatformAdapter();
    await expect(adapter.openExternal("https://example.com")).rejects.toThrow(
      "not running inside Tauri",
    );
  });
});
