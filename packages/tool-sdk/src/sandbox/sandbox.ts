import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export interface SandboxExecOptions {
  cwd: string;
  timeoutMs: number;
  signal?: AbortSignal;
  /** stdout + stderr 合计上限（字节），超限终止进程。默认 256 KiB。 */
  maxOutputBytes?: number;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
  signal?: string;
}

/**
 * Sandbox 抽象（REQUIREMENTS.md §45 Sandbox First）：
 * Agent 的一切进程执行都必须经由 Sandbox，禁止业务代码直接 spawn。
 * 当前实现为 HostSandbox（仅限 Trusted Local Mode，AGENTS.md §42）；
 * Docker / 远程 Sandbox 实现后续在此接口下替换，工具层零改动。
 */
export interface Sandbox {
  readonly name: string;
  /** 执行 shell 命令字符串（cmd / sh 解释）。 */
  execShell(command: string, options: SandboxExecOptions): Promise<ExecResult>;
  /** 以 argv 数组执行可执行文件，不经 shell 解释（防注入）。 */
  execFile(file: string, args: string[], options: SandboxExecOptions): Promise<ExecResult>;
}

const DEFAULT_MAX_OUTPUT_BYTES = 256 * 1024;

const runProcess = (
  child: ChildProcessWithoutNullStreams,
  options: SandboxExecOptions,
): Promise<ExecResult> => {
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  return new Promise<ExecResult>((resolve, reject) => {
    let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let truncated = false;

    const cap = (chunk: Buffer, current: Buffer): Buffer => {
      const overflow = current.length + chunk.length - maxOutputBytes;
      if (overflow <= 0) {
        return Buffer.concat([current, chunk]);
      }
      truncated = true;
      child.kill();
      return Buffer.concat([
        current,
        chunk.subarray(0, Math.max(0, maxOutputBytes - current.length)),
      ]);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = cap(chunk, stdout);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = cap(chunk, stderr);
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve({
        exitCode: code ?? -1,
        stdout: stdout.toString("utf8"),
        stderr: stderr.toString("utf8"),
        truncated,
        signal: signal ?? undefined,
      });
    });
  });
};

const normalizeOptions = (options: SandboxExecOptions): SandboxExecOptions => ({
  ...options,
  maxOutputBytes: options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
});

/**
 * 宿主机执行实现。
 *
 * ⚠️ 只应在 Trusted Local Mode 下使用（用户显式开启、默认关闭、需审计）：
 * Host 意味着进程直接运行在用户机器上，没有隔离边界。
 */
export class HostSandbox implements Sandbox {
  readonly name = "host";

  execShell(command: string, options: SandboxExecOptions): Promise<ExecResult> {
    const normalized = normalizeOptions(options);
    const child = spawn(command, {
      shell: true,
      cwd: normalized.cwd,
      signal: normalized.signal,
      timeout: normalized.timeoutMs,
      windowsHide: true,
    });
    return runProcess(child, normalized);
  }

  execFile(file: string, args: string[], options: SandboxExecOptions): Promise<ExecResult> {
    const normalized = normalizeOptions(options);
    const child = spawn(file, args, {
      shell: false,
      cwd: normalized.cwd,
      signal: normalized.signal,
      timeout: normalized.timeoutMs,
      windowsHide: true,
    });
    return runProcess(child, normalized);
  }
}
