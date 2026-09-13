import Fastify, { type FastifyInstance } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { spawn } from "node:child_process";
import { z } from "zod";
import type { AgentEvent } from "@adui-forge/contracts";
import type { RunnerApprovalService } from "./approvals.ts";
import type { RunnerRunService } from "./runs.ts";
import {
  deleteWorkspaceTextFile,
  listWorkspaceDir,
  readWorkspaceTextFile,
  writeWorkspaceTextFile,
} from "@adui-forge/tool-sdk";

export interface RunnerOptions {
  /** 本地工作区根目录（Desktop Shell 经环境变量注入）。 */
  root: string;
  /** 本地 Runs 服务（FORGE_MODEL_* 已配置时才有；未配置时 runs 端点显式降级）。 */
  runs?: RunnerRunService;
  /** 本地审批服务（Trusted Local Mode 时才有）。 */
  approvals?: RunnerApprovalService;
  /** Tauri 启动时注入的一次性 token（ADR-005 §3）；为空时跳过鉴权（仅测试用）。 */
  token?: string;
}

const pathQuerySchema = z.object({ path: z.string().min(1).max(500) });
const writeFileSchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().max(1024 * 1024),
});
const createRunSchema = z.object({
  task: z.string().min(1).max(10_000),
  agentName: z.string().min(1).optional(),
});
const decisionSchema = z.object({ decision: z.enum(["approved", "rejected"]) });

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
export const buildServer = async (options: RunnerOptions): Promise<FastifyInstance> => {
  const server = Fastify({ logger: false });
  await server.register(fastifyWebsocket);

  // Token 握手（ADR-005 §3）：/health 豁免供 Shell 存活探测
  server.addHook("onRequest", async (request, reply) => {
    if (options.token === undefined || options.token === "") return;
    if (request.url.startsWith("/health")) return;
    // EventSource/WS 无法携带 Header：允许 ?token= 查询参数（仅本机回环）
    const queryToken = (request.query as { token?: string }).token;
    const header = request.headers.authorization;
    const authorized = header === `Bearer ${options.token}` || queryToken === options.token;
    if (!authorized) {
      await reply.code(401).send({ message: "runner token missing or invalid" });
    }
  });

  const runtime = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined" ? "bun" : "node";
  server.get("/health", async () => ({ status: "ok", runner: true, runtime }));

  // —— Workspace（ADR-004 阶段 1/2）——

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

  // —— Runs 子集（FORGE_MODEL_* 未配置时 runs === undefined，显式降级 503）——

  server.get("/api/v1/runs", async (_request, reply) => {
    if (options.runs === undefined) {
      return await reply
        .code(503)
        .send({ message: "local runs unavailable: FORGE_MODEL_* not configured" });
    }
    return options.runs.list();
  });

  server.post("/api/v1/runs", async (request, reply) => {
    if (options.runs === undefined) {
      return await reply
        .code(503)
        .send({ message: "local runs unavailable: FORGE_MODEL_* not configured" });
    }
    const parsed = createRunSchema.safeParse(request.body);
    if (!parsed.success) {
      return await reply.code(400).send({ message: "invalid body" });
    }
    try {
      return options.runs.create(parsed.data);
    } catch (error) {
      return await reply.code(404).send({ message: errorMessage(error) });
    }
  });

  server.get("/api/v1/runs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const record = options.runs?.get(id);
    if (record === undefined) {
      return await reply.code(404).send({ message: `unknown run: "${id}"` });
    }
    return record;
  });

  server.get("/api/v1/runs/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (options.runs === undefined || options.runs.get(id) === undefined) {
      return await reply.code(404).send({ message: `unknown run: "${id}"` });
    }
    // SSE：手动写原始响应（快照 + 实时，由 RunnerRunService.subscribe 保证）
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    const send = (event: AgentEvent): void => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const unsubscribe = options.runs.subscribe(id, send);
    request.raw.on("close", () => unsubscribe?.());
    return reply;
  });

  server.post("/api/v1/runs/:id/retry", async (request, reply) => {
    if (options.runs === undefined) {
      return await reply
        .code(503)
        .send({ message: "local runs unavailable: FORGE_MODEL_* not configured" });
    }
    const { id } = request.params as { id: string };
    const previous = options.runs.get(id);
    if (previous === undefined) {
      return await reply.code(404).send({ message: `unknown run: "${id}"` });
    }
    // 重试 = 以原任务/原 Agent 新建 Run（与云端语义一致）
    try {
      return options.runs.create({ task: previous.task, agentName: previous.agentName });
    } catch (error) {
      return await reply.code(404).send({ message: errorMessage(error) });
    }
  });

  server.post("/api/v1/runs/:id/cancel", async (request, reply) => {
    const { id } = request.params as { id: string };
    const record = options.runs?.cancel(id);
    if (record === undefined) {
      return await reply.code(404).send({ message: `unknown run: "${id}"` });
    }
    return record;
  });

  // —— 审批（Trusted Local Mode；approvals === undefined 时显式降级）——

  server.get("/api/v1/approvals/pending", async (_request, reply) => {
    if (options.approvals === undefined) {
      return await reply
        .code(503)
        .send({ message: "approvals unavailable: trusted local mode disabled" });
    }
    return options.approvals.pending();
  });

  server.post("/api/v1/approvals/:id/decision", async (request, reply) => {
    if (options.approvals === undefined) {
      return await reply
        .code(503)
        .send({ message: "approvals unavailable: trusted local mode disabled" });
    }
    const { id } = request.params as { id: string };
    const parsed = decisionSchema.safeParse(request.body);
    if (!parsed.success) {
      return await reply.code(400).send({ message: "invalid body" });
    }
    const item = options.approvals.decide(id, parsed.data.decision);
    if (item === undefined) {
      return await reply.code(404).send({ message: `unknown approval: "${id}"` });
    }
    return { ok: true, item };
  });

  // —— 终端（IDE 用户本人的 shell，非 Agent 工具：不经 Sandbox、无审批）——
  // 管道模式（非 PTY）：node-pty 在 Windows/Bun 下 conpty agent 不兼容（ADR-007 备注）。
  // 限制：无全屏 TUI 程序；基本命令与输出可用。

  server.get("/api/v1/terminal/ws", { websocket: true }, (socket, _request) => {
    // Bun 编译产物下 ws 消息事件与 Node 行为不一致（client→stdin 断链）：
    // 终端在 sidecar 模式显式降级；dev（tsx/Node）完整可用（ADR-007 备注）。
    if (typeof (globalThis as { Bun?: unknown }).Bun !== "undefined") {
      socket.on("open", () => {
        socket.send(
          "terminal is unavailable in the bundled sidecar (Bun runtime limitation); run the runner under Node/tsx for terminal support.",
        );
        socket.close();
      });
      return;
    }
    const isWindows = process.platform === "win32";
    const shell = isWindows ? "powershell.exe" : (process.env.SHELL ?? "bash");
    const child = spawn(shell, [], {
      cwd: options.root,
      env: process.env,
      stdio: "pipe",
    });
    let lineBuffer = "";
    const send = (text: string): void => {
      try {
        socket.send(text);
      } catch {
        // socket 已关闭
      }
    };
    child.stdout?.on("data", (chunk: Buffer) => {
      lineBuffer += chunk.toString();
      const parts = lineBuffer.split("\n");
      lineBuffer = parts.pop() ?? "";
      for (const line of parts) send(line + "\r\n");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      send(chunk.toString());
    });
    child.on("exit", () => socket.close());
    socket.on("message", (data: unknown) => {
      // ws message 事件首参即帧数据；文本帧统一归一为字符串
      const text = typeof data === "string" ? data : Buffer.from(data as Uint8Array).toString();
      if (text.startsWith("{")) {
        try {
          const message = JSON.parse(text) as { __input__?: string };
          if (typeof message.__input__ === "string") {
            child.stdin?.write(message.__input__ + "\n");
            return;
          }
        } catch {
          // 非 JSON：忽略
        }
      }
    });
    socket.on("close", () => {
      child.kill();
    });
  });

  return server;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
