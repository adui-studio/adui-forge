import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 最小 HS256 JWT 实现（node:crypto，无外部依赖）。
 * 生产环境如需密钥轮换 / RS256 / 撤销列表，再引入成熟库。
 */
export interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

const base64url = (input: Buffer | string): string => Buffer.from(input).toString("base64url");

const getSecret = (secret?: string): string => {
  const resolved = secret ?? process.env.FORGE_JWT_SECRET;
  if (resolved === undefined || resolved === "") {
    throw new Error("FORGE_JWT_SECRET is not configured");
  }
  return resolved;
};

export const signJwt = (sub: string, expiresInMs: number, secret?: string): string => {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload: JwtPayload = {
    sub,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + expiresInMs) / 1000),
  };
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", getSecret(secret)).update(`${header}.${body}`).digest();
  return `${header}.${body}.${base64url(signature)}`;
};

export const verifyJwt = (token: string, secret?: string): JwtPayload => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("malformed token");
  }
  const [header, body, signature] = parts;
  const expected = createHmac("sha256", getSecret(secret)).update(`${header}.${body}`).digest();
  const given = Buffer.from(signature ?? "", "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new Error("invalid token signature");
  }
  const payload = JSON.parse(Buffer.from(body ?? "", "base64url").toString("utf8")) as JwtPayload;
  if (payload.exp * 1000 < Date.now()) {
    throw new Error("token expired");
  }
  return payload;
};
