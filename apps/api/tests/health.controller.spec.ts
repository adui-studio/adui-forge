import { describe, expect, it } from "vite-plus/test";
import { HealthController } from "../src/health/health.controller";

describe("HealthController", () => {
  it("returns ok", () => {
    const controller = new HealthController();
    expect(controller.getHealth()).toEqual({ status: "ok" });
  });
});
