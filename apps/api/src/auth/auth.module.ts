import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AuthService, InMemoryUsersStore, USERS_STORE } from "./auth.service";
import { PrismaUsersStore } from "./prisma-users.store";
import { AuthController } from "./auth.controller";

/** FORGE_AUTH_REQUIRED=1 时由全局 Guard 保护业务端点（默认关闭，见 auth.guard）。 */
@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: USERS_STORE,
      useFactory: () =>
        process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== ""
          ? new PrismaUsersStore(new PrismaClient())
          : new InMemoryUsersStore(),
    },
    AuthService,
  ],
})
export class AuthModule {}
