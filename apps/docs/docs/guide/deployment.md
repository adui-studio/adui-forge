---
title: 部署
---

# 部署

## 文档站（GitHub Pages）

push 到 main 且 `apps/docs/**`、锁文件或工作流文件变更时，
[deploy-docs.yml](https://github.com/adui-studio/adui-forge/blob/main/.github/workflows/deploy-docs.yml)
自动构建并发布到 <https://adui-studio.github.io/adui-forge/>。

文档站以项目子路径托管，构建时注入 `RSPRESS_BASE=/adui-forge/`。

## API / Web（Docker Compose）

```bash
docker compose -f infra/docker-compose.yml up -d
# postgres :5432 · redis :6379 · minio :9000/:9001 · api :3000 · web :8080
```

- Web 容器由 Nginx 托管静态产物并反代 `/api`（SSE 已关闭缓冲）；
- API 容器注入 `FORGE_*` 环境变量（见 [配置参考](/guide/configuration.html)）；
- 首次启动后执行 `pnpm --filter @adui-forge/api db:migrate` 建表。

## Desktop（Tauri 2）

```bash
pnpm --filter @adui-forge/web build        # 先产出 Web 静态资源
pnpm --filter @adui-forge/desktop bundle   # 打包安装程序
```

## Mobile（Flutter）

```bash
cd apps/mobile
flutter build apk        # Android
flutter build ios        # iOS（需 macOS + Xcode）
```

## 验收

- 全量：`pnpm run ready`（check / test / build，CI 同款）
- 部署后冒烟：`pnpm run smoke`（对运行中的 API 断言核心端点）
