import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";
import { signJwt, verifyJwt } from "./jwt";

export const USERS_STORE = Symbol("USERS_STORE");

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
}

export interface UsersStore {
  findByUsername(username: string): Promise<UserRecord | undefined>;
  create(username: string, passwordHash: string): Promise<UserRecord>;
}

/** 进程内用户存储：DATABASE_URL 接入后由 Prisma 实现替换。 */
export class InMemoryUsersStore implements UsersStore {
  readonly #users = new Map<string, UserRecord>();

  async findByUsername(username: string): Promise<UserRecord | undefined> {
    return this.#users.get(username);
  }

  async create(username: string, passwordHash: string): Promise<UserRecord> {
    if (this.#users.has(username)) {
      throw new Error(`username already exists: "${username}"`);
    }
    const record: UserRecord = {
      id: `user_${globalThis.crypto.randomUUID()}`,
      username,
      passwordHash,
    };
    this.#users.set(username, record);
    return record;
  }
}

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export interface AuthResult {
  userId: string;
  username: string;
  accessToken: string;
}

/** 注册与登录：Argon2id 口令散列 + HS256 短期令牌（REQUIREMENTS.md §56）。 */
@Injectable()
export class AuthService {
  constructor(@Inject(USERS_STORE) private readonly users: UsersStore) {}

  async register(username: string, password: string): Promise<AuthResult> {
    if (password.length < 8) {
      throw new UnauthorizedException("password must be at least 8 characters");
    }
    const existing = await this.users.findByUsername(username);
    if (existing !== undefined) {
      throw new UnauthorizedException("username already exists");
    }
    const passwordHash = await hash(password);
    const user = await this.users.create(username, passwordHash);
    return {
      userId: user.id,
      username: user.username,
      accessToken: signJwt(user.id, TOKEN_TTL_MS),
    };
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const user = await this.users.findByUsername(username);
    const valid =
      user !== undefined && (await verify(user.passwordHash, password).catch(() => false));
    if (!valid) {
      throw new UnauthorizedException("invalid username or password");
    }
    return {
      userId: user.id,
      username: user.username,
      accessToken: signJwt(user.id, TOKEN_TTL_MS),
    };
  }

  verifyToken(token: string): { sub: string } {
    return verifyJwt(token);
  }
}
