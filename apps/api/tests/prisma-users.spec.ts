import { describe, expect, it } from "vite-plus/test";
import { PrismaUsersStore } from "../src/auth/prisma-users.store";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(databaseUrl === undefined || databaseUrl === "")("PrismaUsersStore", () => {
  it("create / findByUsername roundtrip", async () => {
    const store = new PrismaUsersStore();
    const username = `spec_${globalThis.crypto.randomUUID().slice(0, 8)}`;
    await store.create(username, "argon2-hash");
    const found = await store.findByUsername(username);
    expect(found?.passwordHash).toBe("argon2-hash");
    expect(await store.findByUsername("no_such_user")).toBeUndefined();
  });
});
