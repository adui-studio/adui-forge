import { createRoot } from "react-dom/client";
import { ConfigProvider, theme } from "antd";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("app")!).render(
  <ConfigProvider
    theme={{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: "#6CFF00",
        colorBgBase: "#060609",
        colorBgContainer: "#111318",
        colorBgElevated: "#13161C",
        colorBorder: "#20242C",
        colorBorderSecondary: "#1C2028",
        borderRadius: 8,
        fontSize: 13,
      },
    }}
  >
    <App />
  </ConfigProvider>,
);
