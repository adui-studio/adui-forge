import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { relative } from "node:path";
import { runProcess, type ExecResult, type Sandbox, type SandboxExecOptions } from "./sandbox.ts";

export interface DockerSandboxOptions {
  /** 容器镜像；默认 node:22-bookworm（含 git 与 Node 工具链）。 */
  image?: string;
  /** 宿主机 Workspace 根目录，只读挂载之外的部分以读写挂到容器 /workspace。 */
  workspaceRoot: string;
  /** 内存上限（MB），默认 512。 */
  memoryMb?: number;
  /** CPU 上限（核数），默认 1。 */
  cpus?: number;
  /** 是否允许容器访问网络，默认禁止（REQUIREMENTS.md §46）。 */
  networkEnabled?: boolean;
  /** 进程数上限，默认 128。 */
  pidsLimit?: number;
  /** 容器内挂载点，默认 /workspace。 */
  containerWorkdir?: string;
}

const DEFAULT_IMAGE = "node:22-bookworm";
const DEFAULT_MEMORY_MB = 512;
const DEFAULT_CPUS = 1;
const DEFAULT_PIDS_LIMIT = 128;

/**
 * 基于 Docker 的 Sandbox 实现：每个命令一个一次性容器（--rm）。
 *
 * 安全基线（REQUIREMENTS.md §46）：
 * - 默认 --network=none（无网络）
 * - --memory / --cpus / --pids-limit 资源上限
 * - 只挂载 Workspace 根目录到容器 /workspace，不挂载 HOME / SSH / docker.sock
 * - 不透传宿主机环境变量
 *
 * 已知限制：spawn 的 timeout / abort 终止的是 docker CLI；容器由 --rm 随退出清理，
 * CLI 被强杀的极端场景可能残留容器，可用 docker ps 按 forge- 前缀排查。
 */
export class DockerSandbox implements Sandbox {
  readonly name: string;
  readonly #options: Required<DockerSandboxOptions>;

  constructor(options: DockerSandboxOptions) {
    this.#options = {
      image: options.image ?? DEFAULT_IMAGE,
      workspaceRoot: options.workspaceRoot,
      memoryMb: options.memoryMb ?? DEFAULT_MEMORY_MB,
      cpus: options.cpus ?? DEFAULT_CPUS,
      networkEnabled: options.networkEnabled ?? false,
      pidsLimit: options.pidsLimit ?? DEFAULT_PIDS_LIMIT,
      containerWorkdir: options.containerWorkdir ?? "/workspace",
    };
    this.name = `docker:${this.#options.image}`;
  }

  execShell(command: string, options: SandboxExecOptions): Promise<ExecResult> {
    const baseArgs = this.#baseArgs(options.cwd);
    const child = spawn("docker", [...baseArgs, "sh", "-c", command], {
      shell: false,
      signal: options.signal,
      timeout: options.timeoutMs,
      windowsHide: true,
    });
    return runProcess(child, options);
  }

  execFile(file: string, args: string[], options: SandboxExecOptions): Promise<ExecResult> {
    const baseArgs = this.#baseArgs(options.cwd);
    const child = spawn("docker", [...baseArgs, file, ...args], {
      shell: false,
      signal: options.signal,
      timeout: options.timeoutMs,
      windowsHide: true,
    });
    return runProcess(child, options);
  }

  #baseArgs(hostCwd: string): string[] {
    const o = this.#options;
    const containerCwd = this.#toContainerPath(hostCwd);
    return [
      "run",
      "--rm",
      `--name`,
      `forge-${randomUUID().slice(0, 8)}`,
      ...(o.networkEnabled ? [] : ["--network", "none"]),
      "--memory",
      `${o.memoryMb}m`,
      "--cpus",
      String(o.cpus),
      "--pids-limit",
      String(o.pidsLimit),
      "-v",
      `${o.workspaceRoot}:${o.containerWorkdir}`,
      "-w",
      containerCwd,
      o.image,
    ];
  }

  #toContainerPath(hostCwd: string): string {
    const o = this.#options;
    const relativePart = relative(o.workspaceRoot, hostCwd);
    if (relativePart === "" || relativePart.startsWith("..")) {
      return o.containerWorkdir;
    }
    const posixRelative = relativePart.split(/[\\/]+/).join("/");
    return `${o.containerWorkdir}/${posixRelative}`;
  }
}
