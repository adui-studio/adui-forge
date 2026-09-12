import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider, theme as antdTheme } from "antd";
import type { Locale } from "antd/es/locale/index.js";
import enUS from "antd/locale/en_US.js";
import zhCN from "antd/locale/zh_CN.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import { BrowserRouter } from "react-router";
import { App } from "./App.tsx";
import "./i18n/index.ts";
import "./index.css";

const queryClient = new QueryClient();

/** antd 内置文案（分页/空态/确认等）跟随 i18n 语言切换。 */
const LocalizedProviders = () => {
  const { i18n } = useTranslation();
  // antd locale 文件为 CJS，TS7 下默认导入被建模为命名空间，此处做类型收敛
  const antdLocale = (i18n.language === "en" ? enUS : zhCN) as unknown as Locale;
  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          /* DesignGuidelines §20 Dark Theme */
          colorBgBase: "#0B0D10",
          colorBgContainer: "#111318",
          colorBgElevated: "#1C2028",
          colorBorder: "#292E39",
          colorBorderSecondary: "#20242C",
          colorText: "#F4F4F5",
          colorTextSecondary: "#A1A1AA",
          colorTextTertiary: "#71717A",
          /* ADui Purple = Primary（§11：按钮/链接/选中/Focus） */
          colorPrimary: "#8B51A6",
          colorPrimaryHover: "#9A6CE0",
          colorLink: "#B79AEC",
          /* §17 语义色（Lime ≠ Success） */
          colorSuccess: "#22C55E",
          colorWarning: "#F59E0B",
          colorError: "#EF4444",
          colorInfo: "#3B82F6",
          /* §28 圆角克制：默认 6px */
          borderRadius: 6,
          fontFamily:
            'Inter, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
          fontSize: 14,
        },
        components: {
          Layout: {
            siderBg: "#111318",
            headerBg: "#111318",
            bodyBg: "#0B0D10",
          },
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: "#222732",
            itemSelectedColor: "#F4F4F5",
            itemHoverBg: "rgba(255,255,255,0.06)",
            activeBarBorderWidth: 0,
          },
          Table: {
            headerBg: "#171A21",
            rowHoverBg: "#1C2028",
          },
        },
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
};

const container = document.getElementById("root");
if (container === null) {
  throw new Error("missing #root container");
}

createRoot(container).render(
  <StrictMode>
    <LocalizedProviders />
  </StrictMode>,
);
