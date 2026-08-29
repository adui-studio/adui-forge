import { defineConfig } from "@rspress/core";

// GitHub Pages 以项目子路径托管（CI 注入 RSPRESS_BASE=/adui-forge/），本地默认根路径。
// 文档：https://rspress.rs/zh/guide/basic/deploy
const base = process.env.RSPRESS_BASE ?? "/";

export default defineConfig({
  root: "docs",
  title: "ADui Forge",
  description: "Agent-Driven Development Platform",
  lang: "zh-CN",
  base,
});
