import { describe, expect, it } from "vite-plus/test";
import { createId } from "../src/id.ts";
import { err, isOk, ok } from "../src/result.ts";

describe("result", () => {
  it("ok wraps a value", () => {
    const result = ok(42);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  it("err wraps an error", () => {
    const result = err(new Error("boom"));
    expect(isOk(result)).toBe(false);
    expect(result.ok).toBe(false);
  });
});

describe("createId", () => {
  it("prefixes the generated id", () => {
    expect(createId("run")).toMatch(/^run_[0-9a-f-]{36}$/);
  });

  it("generates unique ids", () => {
    expect(createId("x")).not.toBe(createId("x"));
  });
});
