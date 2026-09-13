// Rust 层只承担 Native Bridge（AGENTS.md §19）：窗口、系统能力与 Local Runner 进程生命周期。
// Agent Domain 一律留在 TypeScript / NestJS 侧；Runner 文件操作在 apps/runner（ADR-005）。

use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager};

/// Runner 子进程句柄 + 握手信息（ADR-005 §3/§4）。
struct RunnerProcess {
  child: Child,
  port: u16,
  token: String,
  trusted: bool,
}

struct RunnerState {
  process: Mutex<Option<RunnerProcess>>,
}

#[derive(Clone, serde::Serialize)]
struct RunnerInfo {
  running: bool,
  #[serde(rename = "baseUrl")]
  base_url: Option<String>,
  token: Option<String>,
  trusted: bool,
}

/// 生成一次性 token（时间 + pid 熵足够防本机进程碰撞，不落盘）。
fn generate_token() -> String {
  let nanos = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|value| value.as_nanos())
    .unwrap_or(0);
  format!("runner_{:x}_{:x}", nanos, std::process::id())
}

/// 从 Runner stdout 解析监听地址（apps/runner 启动时打印 "runner listening on ..."）。
fn parse_port(line: &str) -> Option<u16> {
  const MARKER: &str = "runner listening on http://127.0.0.1:";
  let index = line.find(MARKER)?;
  line[index + MARKER.len()..]
    .trim_end()
    .split(|c: char| !c.is_ascii_digit())
    .next()?
    .parse()
    .ok()
}

#[tauri::command]
fn spawn_runner(
  app: tauri::AppHandle,
  state: tauri::State<'_, RunnerState>,
  workspace_root: String,
  runner_cwd: String,
  entry: String,
  trusted_local_mode: bool,
) -> Result<RunnerInfo, String> {
  let mut guard = state.process.lock().map_err(|_| "runner state poisoned")?;
  if let Some(existing) = guard.as_ref() {
    // 已在运行：直接返回现有实例（幂等）
    return Ok(RunnerInfo {
      running: true,
      base_url: Some(format!("http://127.0.0.1:{}", existing.port)),
      token: Some(existing.token.clone()),
      trusted: trusted_local_mode,
    });
  }

  let token = generate_token();
  let mut child = Command::new("node")
    .arg("--import")
    .arg("tsx/esm")
    .arg(&entry)
    .current_dir(&runner_cwd)
    .env("FORGE_WORKSPACE_ROOT", &workspace_root)
    .env("RUNNER_TOKEN", &token)
    .env("RUNNER_PORT", "0")
    .env("FORGE_TRUSTED_LOCAL_MODE", if trusted_local_mode { "1" } else { "0" })
    .stdout(Stdio::piped())
    .spawn()
    .map_err(|error| format!("failed to spawn runner: {error}"))?;

  // 后台线程读 stdout 解析端口，就绪后通知前端
  let app_for_thread = app.clone();
  let stdout = child.stdout.take();
  std::thread::spawn(move || {
    let state_for_thread = app_for_thread.state::<RunnerState>();
    let Some(stdout) = stdout else { return };
    let reader = BufReader::new(stdout);
    for line in reader.lines() {
      let Ok(line) = line else { break };
      if let Some(port) = parse_port(&line) {
        if let Ok(mut guard) = state_for_thread.process.lock() {
          if let Some(process) = guard.as_mut() {
            process.port = port;
          }
        }
        let _ = app_for_thread.emit("runner:ready", port);
        break;
      }
    }
  });

  guard.replace(RunnerProcess {
    child,
    port: 0,
    token: token.clone(),
    trusted: trusted_local_mode,
  });

  Ok(RunnerInfo {
    running: true,
    base_url: None,
    token: Some(token),
    trusted: trusted_local_mode,
  })
}

#[tauri::command]
fn runner_status(state: tauri::State<'_, RunnerState>) -> RunnerInfo {
  let guard = state.process.lock().expect("runner state poisoned");
  match guard.as_ref() {
    Some(process) if process.port > 0 => RunnerInfo {
      running: true,
      base_url: Some(format!("http://127.0.0.1:{}", process.port)),
      token: Some(process.token.clone()),
      trusted: process.trusted,
    },
    _ => RunnerInfo {
      running: false,
      base_url: None,
      token: None,
      trusted: false,
    },
  }
}

#[tauri::command]
fn runner_stop(state: tauri::State<'_, RunnerState>) -> Result<(), String> {
  let mut guard = state.process.lock().map_err(|_| "runner state poisoned")?;
  if let Some(mut process) = guard.take() {
    let _ = process.child.kill();
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_opener::init())
    .manage(RunnerState {
      process: Mutex::new(None),
    })
    .invoke_handler(tauri::generate_handler![
      spawn_runner,
      runner_status,
      runner_stop
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
