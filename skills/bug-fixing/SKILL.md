---
name: bug-fixing
description: 修复 ADui Forge 仓库中的 Bug 时使用，强制走复现 → 根因 → 回归测试 → 修复 → 验证的流程。
---

# Bug Fixing — ADui Forge 修 Bug 流程

修复 Bug 时严格遵循以下流程，禁止只针对表现打 Patch（见 AGENTS.md §63）。

## 流程

```text
Reproduce → Identify Root Cause → Write / Update Regression Test → Fix → Run Test → Verify
```

1. **Reproduce**：先稳定复现问题。能写成失败测试的，写成失败测试。
2. **Root Cause**：定位真实根因。区分"表象"与"原因"，禁止在表象处叠加 if 条件掩盖问题。
3. **Regression Test**：为根因编写或更新回归测试，确认测试在修复前失败。
4. **Fix**：实施最小修复。修复必须解决根因，同时不破坏既有行为。
5. **Run Test**：运行相关测试 + `vp check`。
6. **Verify**：确认回归测试通过、原有测试不受影响，`git diff` 确认改动范围。

## 重点检查面

修 Bug 时主动排查同根因的其他位置：

- Agent Loop：maxSteps / timeout / abort / retry 是否有同样漏洞
- Tool：输入校验、Path Traversal、Command Injection、边界检查
- 异步：未处理的 Promise Rejection、Stream / Process / Sandbox 资源清理
- 状态：Transaction 是否留有部分成功状态

## 输出

修复完成后说明：根因、修复方式、回归测试位置、验证结果。
