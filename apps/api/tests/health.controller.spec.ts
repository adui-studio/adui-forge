import { describe, expect, it } from "vite-plus/test";
import { HealthController } from "../src/health/health.controller";

describe("HealthController", () => {
  it("returns ok", async () => {
    const controller = new HealthController();
    const result = await controller.getHealth();
    expect(result.status).toBe("ok");
    expect(["up", "down", "unconfigured"]).toContain(result.db);
  });
});
