import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

export interface RateLimitOptions {
  /** 窗口内允许的最大请求数。 */
  limit: number;
  /** 窗口长度（毫秒）。 */
  windowMs: number;
}

const PROTECTED_PREFIXES = ["/api/v1/auth/login", "/api/v1/runs", "/api/v1/tasks"];

/**
 * 进程内滑动窗口限流守卫（安全加固：凭据爆破 / Run 滥用防护）。
 * 仅作用于写密集路由；多实例部署时需替换为 Redis 实现。
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  readonly #buckets = new Map<string, number[]>();

  constructor(private readonly options: RateLimitOptions) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<{ url?: string; ip?: string }>();
    const url = request.url ?? "";
    if (!PROTECTED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      return true;
    }
    const key = request.ip ?? "unknown";
    const now = Date.now();
    const timestamps = (this.#buckets.get(key) ?? []).filter(
      (time) => now - time < this.options.windowMs,
    );
    if (timestamps.length >= this.options.limit) {
      throw new UnauthorizedException("too many requests, slow down");
    }
    timestamps.push(now);
    this.#buckets.set(key, timestamps);
    return true;
  }
}
