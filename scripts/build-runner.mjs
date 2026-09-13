// 构建本地 Runner sidecar（ADR-007）：Bun --compile 单文件可执行。
// 用法：node scripts/build-runner.mjs [target]
//   target 缺省 = 当前平台；CI 传入多个 triple 逐一构建。
// 产物输出到 apps/desktop/src-tauri/binaries/forge-runner-<triple>[.exe]，
// 供 Tauri bundle.externalBin 打进安装包。
import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Bun compile target 与 Tauri triple 是两套命名：前者如 bun-windows-x64，后者用于 externalBin 文件名。
const TARGETS = {
  "windows-x64": { bun: "bun-windows-x64", triple: "x86_64-pc-windows-msvc" },
  "linux-x64": { bun: "bun-linux-x64", triple: "x86_64-unknown-linux-gnu" },
  "darwin-arm64": { bun: "bun-darwin-aarch64", triple: "aarch64-apple-darwin" },
  "darwin-x64": { bun: "bun-darwin-x64", triple: "x86_64-apple-darwin" },
};

const hostTarget =
  process.platform === "win32"
    ? "windows-x64"
    : process.platform === "darwin"
      ? process.arch === "arm64"
        ? "darwin-arm64"
        : "darwin-x64"
      : "linux-x64";
const requested = process.argv[2] ?? hostTarget;
const target = TARGETS[requested];
if (target === undefined) {
  console.error(`unknown target: ${requested} )})", ")})`);
  process.exit(1);
}

const runnerDir = join(process.cwd(), "apps", "runner");
const outDir = join(process.cwd(), "apps", "desktop", "src-tauri", "binaries");
mkdirSync(outDir, { recursive: true });

const ext = requested === "windows-x64" ? ".exe" : "";
const outfile = join(outDir, `forge-runner-${target.triple}${ext}`);

console.log(`building runner sidecar: ${requested} → ${outfile}`);
execSync(`bun build ./src/index.ts --compile --target ${target.bun} --outfile "${outfile}"`, {
  cwd: runnerDir,
  stdio: "inherit",
});

if (!existsSync(outfile)) {
  console.error("sidecar build produced no output");
  process.exit(1);
}
console.log(`ok: ${outfile}`);
