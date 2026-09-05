// Rust 层只承担 Native Bridge（AGENTS.md §19）：窗口与系统能力。
// Agent Domain 一律留在 TypeScript / NestJS 侧。

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
