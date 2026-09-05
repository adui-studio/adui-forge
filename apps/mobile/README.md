# @adui-forge/mobile

ADui Forge Mobile（Flutter）：随时随地查看、控制、审批正在执行的 Agent。
不实现完整 IDE（REQUIREMENTS §4.3）。

## 结构

- Riverpod（状态）/ go_router（路由）/ Dio（HTTP）/ flutter_secure_storage（令牌）
- 屏：Runs 列表 / Run 详情（下拉刷新）/ 审批（批准 / 拒绝）

## 运行

```bash
flutter pub get
flutter run           # Android 模拟器默认 baseUrl http://10.0.2.2:3000
flutter analyze
flutter test
```

API 地址可在 `lib/providers.dart` 的 `BaseUrlNotifier` 配置。
