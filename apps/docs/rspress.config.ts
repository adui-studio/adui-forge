import { defineConfig } from "@rspress/core";

// GitHub Pages 以项目子路径托管（CI 注入 RSPRESS_BASE=/adui-forge/），本地默认根路径。
// 文档：https://rspress.rs/zh/guide/basic/deploy
const base = process.env.RSPRESS_BASE ?? "/";

// 双语（i18n）：Rspress 2 约定 —— 语言根目录名 = lang 值（docs/zh-CN、docs/en），
// locales 只声明 lang/label；构建时 en 在根、zh-CN 在 /zh-CN/ 前缀，导航栏自动出现语言切换。
export default defineConfig({
  root: "docs",
  title: "ADui Forge",
  description: "Agent-Driven Development Platform",
  base,
  logo: "/logo.svg",
  lang: "en",
  locales: [
    { lang: "zh-CN", label: "简体中文" },
    { lang: "en", label: "English" },
  ],
});
