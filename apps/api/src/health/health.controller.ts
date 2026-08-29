import { Controller, Get } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Controller("health")
export class HealthController {
  readonly #prisma: PrismaClient | undefined;

  constructor() {
    if (process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== "") {
      this.#prisma = new PrismaClient();
    }
  }

  @Get()
  async getHealth(): Promise<{ status: "ok"; db: "up" | "down" | "unconfigured" }> {
    let db: "up" | "down" | "unconfigured" = "unconfigured";
    if (this.#prisma !== undefined) {
      try {
        await this.#prisma.$queryRaw`SELECT 1`;
        db = "up";
      } catch {
        db = "down";
      }
    }
    return { status: "ok", db };
  }
}
