import { PrismaClient } from "@prisma/client";
import type { UserRecord, UsersStore } from "./auth.service";

const toRecord = (row: { id: string; username: string; passwordHash: string }): UserRecord => ({
  id: row.id,
  username: row.username,
  passwordHash: row.passwordHash,
});

/** PostgreSQL 用户存储（Prisma）。需先 `prisma migrate deploy`。 */
export class PrismaUsersStore implements UsersStore {
  readonly #prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.#prisma = prisma;
  }

  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const row = await this.#prisma.user.findUnique({ where: { username } });
    return row === null ? undefined : toRecord(row);
  }

  async create(username: string, passwordHash: string): Promise<UserRecord> {
    return toRecord(
      await this.#prisma.user.create({
        data: { id: `user_${globalThis.crypto.randomUUID()}`, username, passwordHash },
      }),
    );
  }
}
