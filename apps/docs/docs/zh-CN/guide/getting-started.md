---
title: 快速开始
---

# 快速开始

```bash
pnpm install        # 安装依赖
pnpm run ready      # check + test + build 全量验收
```

## 本地启动各端

| 端           | 命令                                 |
| ------------ | ------------------------------------ |
| API (NestJS) | `pnpm --filter @adui-forge/api dev`  |
| Web (React)  | `pnpm --filter @adui-forge/web dev`  |
| 文档站       | `pnpm --filter @adui-forge/docs dev` |

启动后浏览器打开 <http://localhost:5175>。未配置 `DATABASE_URL` 时全端内存模式运行
（重启数据清空）。

## 模型配置

配置 `FORGE_MODEL_BASE_URL` 与 `FORGE_MODEL_ID` 后默认 Agent 才会注册
（见 [配置参考](/zh-CN/guide/configuration.html)）；`FORGE_MODELS` 声明命名模型
供自定义 Agent 选择。

## 桌面端构建

```bash
pnpm --filter @adui-forge/web build        # Web 静态资源
node scripts/build-runner.mjs windows-x64  # Local Runner sidecar（Bun）
pnpm --filter @adui-forge/desktop bundle   # NSIS / MSI 安装包
```

安装包内含单文件 Runner sidecar：工作区页指定本地目录启动 Runner 后，
文件编辑 / Git / 终端（dev 构建）/ 本地 Agent 全部在本机运行。
