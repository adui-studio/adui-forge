---
title: ADui Forge
---

# ADui Forge

**Agent-Driven Development Platform** — 一个面向开发者与研发团队的 Agent 驱动软件开发平台。

开发者描述意图与边界，Agent 负责理解、规划、检索、修改、测试、修复与交付，高风险操作由人工审批。

## 功能速览

- **自定义 Agent / 命名模型 / Skill 注入**——运行时配置，不改代码
- **Skill 市场**——内置技能目录、逐技能安装、版本更新提示、粘贴与技能包导入、使用统计
- **Workflow 编排**——条件分支图可视化编辑、节点级 Agent 选择（多 Agent 编排）、运行历史
- **Workspace IDE**——文件树 + Monaco 编辑 + Git 面板 + Agent 面板 + 终端
- **Local Runner**——桌面本地闭环（Bun sidecar 随安装包分发）
- **对比分析**——多 Agent 并排流式对比、跨批次统计（平均耗时 / 平均 Tokens / 最快胜出）、CSV / MD 导出
- **多端**——Web / Desktop（Tauri）/ Mobile（Flutter：查看、控制、审批）
- **会话持久化 / 任务台账 / 审批闭环 / Token 用量观测 / i18n 双语**

## 安装包

[Releases](https://github.com/adui-studio/adui-forge/releases/latest) 提供 Windows（NSIS/MSI）、
macOS（arm64 & x64 DMG）、Linux（AppImage/deb）、Android（APK）六平台安装包，tag 自动构建。

## 文档

- [核心概念](/zh-CN/guide/concepts.html)
- [快速开始](/zh-CN/guide/getting-started.html)
- [架构总览](/zh-CN/guide/architecture.html)
- [API 参考](/zh-CN/guide/api-reference.html)
- [配置参考](/zh-CN/guide/configuration.html)
- [Skills](/zh-CN/guide/skills.html)
- [安全模型](/zh-CN/guide/security.html)
- [部署](/zh-CN/guide/deployment.html)
- [Desktop 与 Mobile](/zh-CN/guide/desktop-mobile.html)

> 完整需求见仓库 `docs/REQUIREMENTS.md`，版本里程碑见仓库 `CHANGELOG.md`。
