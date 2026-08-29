import { Module } from "@nestjs/common";
import { AuthService, InMemoryUsersStore, USERS_STORE } from "./auth.service";
import { AuthController } from "./auth.controller";

/** FORGE_AUTH_REQUIRED=1 时由全局 Guard 保护业务端点（默认关闭，见 auth.guard）。 */
@Module({
  controllers: [AuthController],
  providers: [{ provide: USERS_STORE, useValue: new InMemoryUsersStore() }, AuthService],
})
export class AuthModule {}
