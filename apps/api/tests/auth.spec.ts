import { describe, expect, it } from "vite-plus/test";

process.env.FORGE_JWT_SECRET ??= "test-secret";
import { AuthService, InMemoryUsersStore } from "../src/auth/auth.service";
import { signJwt, verifyJwt } from "../src/auth/jwt";

describe("jwt", () => {
  it("signs and verifies a token roundtrip", () => {
    const token = signJwt("user_1", 60_000, "test-secret");
    expect(verifyJwt(token, "test-secret").sub).toBe("user_1");
  });

  it("rejects tampered tokens and expiry", () => {
    const token = signJwt("user_1", 60_000, "test-secret");
    expect(() => verifyJwt(`${token}x`, "test-secret")).toThrow();
    expect(() => verifyJwt(signJwt("user_1", -1000, "test-secret"), "test-secret")).toThrow(
      /expired/,
    );
  });
});

describe("AuthService", () => {
  it("registers, then logs in with correct password", async () => {
    const service = new AuthService(new InMemoryUsersStore());
    await service.register("forge", "super-secret-1");
    const result = await service.login("forge", "super-secret-1");
    expect(result.username).toBe("forge");
    expect(result.accessToken.split(".")).toHaveLength(3);
  });

  it("rejects wrong password, duplicates and short passwords", async () => {
    const service = new AuthService(new InMemoryUsersStore());
    await service.register("forge", "super-secret-1");
    await expect(service.login("forge", "wrong-password")).rejects.toThrow(
      "invalid username or password",
    );
    await expect(service.register("forge", "super-secret-1")).rejects.toThrow(
      "username already exists",
    );
    await expect(service.register("other", "short")).rejects.toThrow(
      "password must be at least 8 characters",
    );
  });
});
