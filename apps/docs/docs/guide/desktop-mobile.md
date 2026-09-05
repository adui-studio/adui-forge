---
title: Desktop 与 Mobile
---

# Desktop 与 Mobile

## Desktop（Tauri 2）

`apps/desktop` 复用 `apps/web` 的整套 React UI，Rust 层只承担 Native Bridge。

- 运行：先起 `pnpm --filter @adui-forge/web dev`（:5175），
  再 `pnpm --filter @adui-forge/desktop dev`
- 打包：`pnpm --filter @adui-forge/web build` 后执行
  `pnpm --filter @adui-forge/desktop bundle`
- 平台差异经 **PlatformAdapter** 抽象（`apps/web/src/platform/adapter.ts`）：
  Web 用 `window.open`，Desktop 经 opener 插件走系统浏览器；
  业务代码不出现 `isTauri` 判断
- Capability 最小授权：`core:default` + `opener:default`

## Mobile（Flutter）

`apps/mobile` 定位是"随时随地查看、控制、审批"，不移植 IDE。

- 技术栈：Riverpod（状态）/ go_router（路由）/ Dio（HTTP）/
  flutter_secure_storage（令牌与 API 地址）
- 屏：Runs 列表、Run 详情（下拉刷新）、审批（批准 / 拒绝）、
  设置（API 地址）、登录 / 注册
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
