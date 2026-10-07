---
title: Desktop 与 Mobile
---

# Desktop 与 Mobile

## Desktop（Tauri 2）

`apps/desktop` 使用独立桌面前端 `apps/desktop-ui`（Svelte 5，不套壳 Web，ADR-011）；Rust 层只承担 Native Bridge 与 Runner 进程生命周期。

- 运行：先起 `pnpm --filter @adui-forge/desktop-ui dev`（:5176），
  再 `pnpm --filter @adui-forge/desktop dev`
- 打包：`pnpm --filter @adui-forge/desktop-ui build` 后执行
  `pnpm --filter @adui-forge/desktop bundle`
- 平台差异经 **PlatformAdapter** 抽象（`apps/web/src/platform/adapter.ts`）：
  Web 用 `window.open`，Desktop 经 opener 插件走系统浏览器；
  业务代码不出现 `isTauri` 判断
- Capability 最小授权：`core:default` + `opener:default`

## Mobile（Flutter）

`apps/mobile` 定位是"随时随地查看、控制、审批"，不移植 IDE。

- 技术栈：Riverpod（状态）/ go_router（路由）/ Dio（HTTP）/
  flutter_secure_storage（令牌与 API 地址）
- 屏：Chat（历史会话 / 执行 Agent 选择）、Runs 列表、Run 详情
  （下拉刷新 / 取消 / 重试 / Token 用量）、审批（批准 / 拒绝）、
  对比查看（批次 → 详情，CSV / MD 导出经剪贴板）、对比统计
  （按 Agent / 按模型，含平均 Tokens）、技能库（只读）、
  任务台账（只读，跳转派生 Run）、设置（API 地址）、登录 / 注册
- 增删改类操作（Skill 管理、任务创建、Workflow 编排）在 Web 端完成；
  移动端聚焦查看与控制
- Android 模拟器访问宿主机 API 使用 `http://10.0.2.2:3000`

```bash
cd apps/mobile
flutter pub get
flutter run
flutter analyze && flutter test
```

## 共享边界

双端与 Web 共享的是 **API 契约与事件协议**（`packages/contracts`），
不共享 UI 代码；行为一致性由同一套 REST / SSE 接口保证。
