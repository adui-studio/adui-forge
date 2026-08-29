# ADui Forge Web —— 静态产物镜像（Nginx 托管 + /api 反代注释）
# 构建上下文：仓库根（docker build -f apps/web/Dockerfile .）

FROM node:22-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @adui-forge/web...

FROM base AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY apps/web ./apps/web
RUN pnpm --filter @adui-forge/web build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
# 生产部署需配置 /api 反向代理到 api 服务；本地 compose 用 network 直连
EXPOSE 80
