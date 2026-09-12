import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import {
  deleteWorkspaceTextFile,
  listWorkspaceDir,
  readWorkspaceTextFile,
  writeWorkspaceTextFile,
} from "@adui-forge/tool-sdk";

export interface RunnerOptions {
  /** 本地工作区根目录（Desktop Shell 经环境变量注入）。 */
  root: string;
  /** Tauri 启动时注入的一次性 token（ADR-005 §3）；为空时跳过鉴权（仅测试用）。 */
  token?: string;
}

const pathQuerySchema = z.object({ path: z.string().min(1).max(500) });
const writeFileSchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().max(1024 * 1024),
});

/** Runner 错误 → HTTP 状态码（与云端 API 的 Error Contract 语义一致）。 */
const statusCodeFor = (message: string): number => {
  if (message.includes("escapes workspace boundary") || message.includes("does not exist")) {
    return 404;
  }
  if (message.includes("not a file") || message.includes("not a directory")) {
    return 400;
  }
  return 400;
};

/** 构建 Runner 服务实例（不监听端口，供 inject 测试与 start 共用）。 */
export const buildServer = (options: RunnerOptions): FastifyInstance => {
  const server = Fastify({ logger: false });

  // Token 握手（ADR-005 §3）：/health 豁免供 Shell 存活探测
  server.addHook("onRequest", async (request, reply) => {
    if (options.token === undefined || options.token === "") return;
    if (request.url.startsWith("/health")) return;
    const header = request.headers.authorization;
    if (header !== `Bearer ${options.token}`) {
      await reply.code(401).send({ message: "runner token missing or invalid" });
    }
  });

  server.get("/health", async () => ({ status: "ok", runner: true }));

  server.get("/api/v1/workspace/tree", async (request, reply) => {
    const parsed = pathQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return await reply.code(400).send({ message: "invalid query" });
    }
    try {
      return listWorkspaceDir(options.root, parsed.data.path);
    } catch (error) {
      return await reply.code(statusCodeFor(errorMessage(error))).send({
        message: errorMessage(error),
      });
    }
  });

  server.get("/api/v1/workspace/file", async (request, reply) => {
    const parsed = pathQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return await reply.code(400).send({ message: "invalid query" });
    }
    try {
      return readWorkspaceTextFile(options.root, parsed.data.path);
    } catch (error) {
      return await reply.code(statusCodeFor(errorMessage(error))).send({
        message: errorMessage(error),
      });
    }
  });

  server.put("/api/v1/workspace/file", async (request, reply) => {
    const parsed = writeFileSchema.safeParse(request.body);
    if (!parsed.success) {
      return await reply.code(400).send({ message: "invalid body" });
    }
    try {
      return writeWorkspaceTextFile(options.root, parsed.data.path, parsed.data.content);
    } catch (error) {
      return await reply.code(statusCodeFor(errorMessage(error))).send({
        message: errorMessage(error),
      });
    }
  });

  server.delete("/api/v1/workspace/file", async (request, reply) => {
    const parsed = pathQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return await reply.code(400).send({ message: "invalid query" });
    }
    try {
      deleteWorkspaceTextFile(options.root, parsed.data.path);
      return { ok: true };
    } catch (error) {
      return await reply.code(statusCodeFor(errorMessage(error))).send({
        message: errorMessage(error),
      });
    }
  });

  return server;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
