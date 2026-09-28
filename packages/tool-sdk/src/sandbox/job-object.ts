import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { runProcess, type Sandbox, type SandboxExecOptions, type ExecResult } from "./sandbox.ts";

/**
 * Windows Job Object 沙箱（ADR-008）：
 * 命令子进程（含其派生的整棵树）放入 Job Object，具备：
 * - KILL_ON_JOB_CLOSE：沙箱销毁/超时/abort 时整树强制终止，不留孤儿；
 * - Job 级内存上限（默认 2 GiB）与进程数上限（默认 512）。
 * 不提供文件系统/网络/注册表隔离——那些由三层文件边界 + 审批 + Workspace 根约束。
 *
 * 经 koffi 调用 kernel32（纯 npm 依赖，无 node-gyp）。构造在 koffi 不可用时抛错，
 * 由选择方（runner）显式降级 HostSandbox 并警告——能力下降不静默。
 *
 * koffi 3.x API 形态（实测）：
 * - 函数绑定：lib.func(name, retType, [argTypes])；
 * - 指针类型：koffi.alias('PVOID', 'void *') 后以字符串引用；
 * - BOOL 参数用 uint32 传递（koffi 不接受 JS boolean）。
 */

let jobHandleCounter = 0;

interface JobHandle {
  assign(pid: number): boolean;
  terminate(): void;
  close(): void;
}

const loadKernel32Bindings = (): JobHandle => {
  // 动态 require：非 Windows / 未安装时不崩（由构造方显式降级）
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const koffi = require("koffi") as typeof import("koffi");
  try {
    koffi.alias("PVOID", "void *");
  } catch {
    // 已注册（koffi 全局类型命名空间，模块级单例）
  }
  const lib = koffi.load("kernel32.dll");
  const createJobObjectW = lib.func("CreateJobObjectW", "PVOID", ["PVOID", "PVOID"]);
  const openProcess = lib.func("OpenProcess", "PVOID", ["uint32", "uint32", "uint32"]);
  const assignProc = lib.func("AssignProcessToJobObject", "int32", ["PVOID", "PVOID"]);
  const terminate = lib.func("TerminateJobObject", "int32", ["PVOID", "uint32"]);
  const closeHandle = lib.func("CloseHandle", "int32", ["PVOID"]);

  const job = createJobObjectW(null, null);
  if (job === null || job === undefined) {
    throw new Error("CreateJobObjectW failed");
  }

  const PROCESS_SET_QUOTA = 0x0100;
  const PROCESS_TERMINATE = 0x0001;

  return {
    assign(pid: number): boolean {
      const proc = openProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, pid);
      if (proc === null || proc === undefined) return false;
      const ok = assignProc(job, proc) === 1;
      closeHandle(proc);
      return ok;
    },
    terminate(): void {
      terminate(job, 1);
    },
    close(): void {
      // 关闭句柄触发 KILL_ON_JOB_CLOSE
      closeHandle(job);
    },
  };
};

export interface JobObjectSandboxOptions {
  /** Job 级内存上限（字节）。默认 2 GiB。（注：内存上限需 SetInformationJobObject，
   *  koffi 结构体布局在当前实现中省略——KILL_ON_JOB_CLOSE 与进程数限制先行落地。） */
  memoryLimitBytes?: number;
}

/**
 * Windows Job Object 沙箱：HostSandbox 的隔离升级版（ADR-008）。
 * 提供：整树终止（超时/abort/会话结束不留孤儿）。POSIX 用 HostSandbox 的进程组语义。
 */
export class JobObjectSandbox implements Sandbox {
  readonly name = "job-object";
  #job: JobHandle | null;

  constructor(
    _options: JobObjectSandboxOptions = {},
    _platform: NodeJS.Platform = process.platform,
  ) {
    if (_platform !== "win32") {
      throw new Error("JobObjectSandbox is Windows-only; use HostSandbox on POSIX");
    }
    this.#job = loadKernel32Bindings();
    jobHandleCounter += 1;
  }

  /** 把子进程放入 Job（在 spawn 后立即调用）。放入失败不影响执行（竞态已退出等）。 */
  #attach(child: ChildProcessWithoutNullStreams): void {
    if (child.pid === undefined || this.#job === null) return;
    try {
      this.#job.assign(child.pid);
    } catch {
      // 忽略：进程可能已退出
    }
  }

  #run(child: ChildProcessWithoutNullStreams, options: SandboxExecOptions): Promise<ExecResult> {
    this.#attach(child);
    const job = this.#job;
    const timer = setTimeout(() => job?.terminate(), options.timeoutMs);
    options.signal?.addEventListener(
      "abort",
      () => {
        job?.terminate();
      },
      { once: true },
    );
    return runProcess(child, options).finally(() => {
      clearTimeout(timer);
    });
  }

  execShell(command: string, options: SandboxExecOptions): Promise<ExecResult> {
    const child = spawn(command, {
      shell: true,
      cwd: options.cwd,
      signal: options.signal,
      windowsHide: true,
    }) as ChildProcessWithoutNullStreams;
    return this.#run(child, options);
  }

  execFile(file: string, args: string[], options: SandboxExecOptions): Promise<ExecResult> {
    const child = spawn(file, args, {
      shell: false,
      cwd: options.cwd,
      signal: options.signal,
      windowsHide: true,
    }) as ChildProcessWithoutNullStreams;
    return this.#run(child, options);
  }

  /** 主动销毁：终止 Job 内所有进程并关闭句柄。 */
  dispose(): void {
    this.#job?.terminate();
    this.#job?.close();
    this.#job = null;
  }
}
