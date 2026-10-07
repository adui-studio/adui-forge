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
        colorBgBase: "#12141A",
        colorBgContainer: "#1A1D24",
        colorBgElevated: "#1D2129",
        colorBorder: "#2A2F3A",
        colorBorderSecondary: "#232833",
        borderRadius: 8,
        fontSize: 13,
      },
    }}
  >
    <App />
  </ConfigProvider>,
);
