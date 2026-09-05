# @adui-forge/desktop

ADui Forge Desktop（Tauri 2）：复用 `apps/web` 的整套 React UI（AGENTS §17），
Rust 层只承担 Native Bridge（窗口 / 打开外部链接，opener 插件，最小 capability）。

## 运行

```bash
pnpm --filter @adui-forge/web dev        # 先起 Web dev server（5175）
pnpm --filter @adui-forge/desktop dev    # Tauri 窗口加载 devUrl
pnpm --filter @adui-forge/desktop build  # 打包安装程序
cargo check                              # Rust 层检查（src-tauri/）
```

`frontendDist` 指向 `../web/dist`，发布前先 `pnpm --filter @adui-forge/web build`。
