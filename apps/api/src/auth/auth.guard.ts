import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

/**
 * Bearer Token 守卫。
 * FORGE_AUTH_REQUIRED=1 时全局启用（app.module）；默认关闭——本地模式优先（REQUIREMENTS.md §18）。
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    if (process.env.FORGE_AUTH_REQUIRED !== "1") {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const authorization = request.headers.authorization ?? "";
    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || token === undefined || token === "") {
      throw new UnauthorizedException("missing bearer token");
    }
    try {
      this.auth.verifyToken(token);
      return true;
    } catch {
      throw new UnauthorizedException("invalid token");
    }
  }
}
