---
title: Desktop & Mobile
---

# Desktop & Mobile

## Desktop (Tauri 2)

`apps/desktop` uses its own frontend `apps/desktop-ui` (Svelte 5, not a Web shell,
ADR-011); the Rust layer only provides the native bridge and the Local Runner
process lifecycle.

- Run: start `pnpm --filter @adui-forge/desktop-ui dev` (:5176), then
  `pnpm --filter @adui-forge/desktop dev`
- Bundle: `pnpm --filter @adui-forge/desktop-ui build`, then
  `pnpm --filter @adui-forge/desktop bundle`
- Platform differences go through the **PlatformAdapter**
  (`apps/web/src/platform/adapter.ts`): the runner lifecycle, notifications and
  external links are dispatched there — business code never checks `isTauri`
- The **Local Runner** ships as a Bun-compiled sidecar (ADR-007); the desktop
  app spawns/stops it and routes workspace & run requests to it transparently
- **Trusted Local Mode**: an explicit toggle in the Workspace page enables
  shell/git tools for the local agent (ADR-006) — approval flow still applies
- Capabilities are least-privilege: `core:default` + `opener:default` +
  `notification:default`; the runner is spawned/stopped via app commands only

## Mobile (Flutter)

`apps/mobile` is for "view, control and approve on the go" — not a full IDE.

- Stack: Riverpod (state) / go_router (routing) / Dio (HTTP) /
  flutter_secure_storage (token & API address)
- Screens: Chat (history / executing-agent picker), Runs list, Run detail
  (pull-to-refresh / cancel / retry / token usage), Approvals (approve /
  reject), Comparison view (batches → detail, CSV / MD export via clipboard),
  comparison stats (by agent / by model, incl. avg tokens), Skills (read-only),
  Tasks (read-only, jumps to the derived run), Settings (API address),
  Login / Register
- Mutating operations (skill management, task creation, workflow authoring)
  live on the Web; mobile focuses on viewing and control
- The Android emulator reaches the host API at `http://10.0.2.2:3000`

```bash
cd apps/mobile
flutter pub get
flutter run
flutter analyze && flutter test
```

## Shared Boundary

Desktop and Mobile share **API contracts and the event protocol**
(`packages/contracts`) with the Web — never UI code. Behavioral consistency
is guaranteed by the same REST / SSE interfaces.
