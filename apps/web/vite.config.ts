import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  server: {
    // 开发期把 /api 代理到本地 NestJS（生产由反向代理 / 部署平台承担）
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
