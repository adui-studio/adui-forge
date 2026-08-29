import { Body, Controller, Inject, Post } from "@nestjs/common";
import { z } from "zod";
import { AuthService, USERS_STORE } from "./auth.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

const credentialsSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
});

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("register")
  register(
    @Body(new ZodValidationPipe(credentialsSchema)) input: { username: string; password: string },
  ) {
    return this.auth.register(input.username, input.password);
  }

  @Post("login")
  login(
    @Body(new ZodValidationPipe(credentialsSchema)) input: { username: string; password: string },
  ) {
    return this.auth.login(input.username, input.password);
  }
}
