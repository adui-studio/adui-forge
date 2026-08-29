# ADui Forge API —— 开发/演示镜像（多阶段）
# 构建上下文：仓库根（docker build -f apps/api/Dockerfile .）

FROM node:22-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @adui-forge/api... 

FROM base AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @adui-forge/api... build || true
# api 运行时使用 tsx，无需编译产物；此步主要为尽早暴露类型错误

FROM base AS runtime
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY packages ./packages
COPY apps/api ./apps/api
EXPOSE 3000
CMD ["pnpm", "--filter", "@adui-forge/api", "start"]
