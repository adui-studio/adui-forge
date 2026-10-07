import {
  Activity,
  ListChecks,
  Minus,
  Rocket,
  Settings as SettingsIcon,
  Square,
  X,
} from "lucide-react";
import { Layout, Menu, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import logoUrl from "./assets/logo.svg";
import {
  cancelLocalRun,
  decideLocalApproval,
  fetchCloudRuns,
  fetchHealth,
  fetchLocalPendingApprovals,
  fetchLocalRun,
  fetchLocalRuns,
  login,
  type CloudRunListItem,
  type HealthResult,
  type LocalPendingApproval,
  type LocalRunDetail,
} from "./lib/api.ts";
import {
  clearToken,
  getAccessToken,
  getServerAddress,
  getUsername,
  saveServerAddress,
  saveToken,
} from "./lib/settings.ts";
import {
  closeWindow,
  invokeRunnerStatus,
  invokeStartRunner,
  invokeStopRunner,
  isTauri,
  minimizeWindow,
  toggleMaximizeWindow,
  type RunnerInfo,
} from "./lib/tauri.ts";
import { OverviewPage } from "./pages/Overview.tsx";
import { RunsPage } from "./pages/RunsPage.tsx";
import { ApprovalsPage } from "./pages/ApprovalsPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";

const { Sider, Content } = Layout;

type PageKey = "overview" | "runs" | "approvals" | "settings";

const NAV_ITEMS: Array<{ key: PageKey; icon: typeof Rocket; label: string }> = [
  { key: "overview", icon: Rocket, label: "概览" },
  { key: "runs", icon: Activity, label: "Runs" },
  { key: "approvals", icon: ListChecks, label: "审批" },
  { key: "settings", icon: SettingsIcon, label: "设置" },
];

/** 自定义标题栏（decorations:false；浏览器 dev 时不渲染窗口控制）。 */
function TitleBar() {
  const desktop = useMemo(() => isTauri(), []);
  return (
    <div
      data-tauri-drag-region
      className="flex h-10 shrink-0 select-none items-center gap-2.5 border-b border-[#232833] px-4"
      style={{ background: "#0F1116" }}
    >
      <img src={logoUrl} alt="ADui Forge" className="h-5 w-5" />
      <span className="text-sm font-semibold">ADui Forge</span>
      <span className="font-mono text-[10px] text-slate-500">
        Desktop · v{typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev"}
      </span>
      {desktop && (
        <div className="ml-auto flex h-full items-center">
          <button
            className="flex h-full w-11 items-center justify-center text-slate-400 hover:bg-[#2A2F3A] hover:text-slate-100"
            onClick={() => void minimizeWindow()}
            aria-label="最小化"
          >
            <Minus size={14} />
          </button>
          <button
            className="flex h-full w-11 items-center justify-center text-slate-400 hover:bg-[#2A2F3A] hover:text-slate-100"
            onClick={() => void toggleMaximizeWindow()}
            aria-label="最大化"
          >
            <Square size={12} />
          </button>
          <button
            className="flex h-full w-11 items-center justify-center text-slate-400 hover:bg-red-500/90 hover:text-white"
            onClick={() => void closeWindow()}
            aria-label="关闭"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

/** 桌面端全局状态 + 动作（M1/M2 逻辑层与 lib/ 一致，仅视图层为 React 重写）。 */
export function useAppState() {
  const [page, setPage] = useState<PageKey>("overview");
  const [serverInput, setServerInput] = useState(getServerAddress());
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [healthError, setHealthError] = useState("");
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [username, setUsername] = useState(getUsername());
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggedIn, setLoggedIn] = useState(getAccessToken() !== null);

  const [cloudRuns, setCloudRuns] = useState<CloudRunListItem[]>([]);
  const [cloudRunsError, setCloudRunsError] = useState("");
  const [loadingCloudRuns, setLoadingCloudRuns] = useState(false);

  const [runner, setRunner] = useState<RunnerInfo | null>(null);
  const [workspaceRoot, setWorkspaceRoot] = useState("");
  const [trustedMode, setTrustedMode] = useState(false);
  const [runnerBusy, setRunnerBusy] = useState(false);

  const [localRuns, setLocalRuns] = useState<CloudRunListItem[]>([]);
  const [localRunsError, setLocalRunsError] = useState("");
  const [loadingLocalRuns, setLoadingLocalRuns] = useState(false);

  const [pendingApprovals, setPendingApprovals] = useState<LocalPendingApproval[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [actingApprovalId, setActingApprovalId] = useState<string | null>(null);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<LocalRunDetail | null>(null);
  const [runDetailError, setRunDetailError] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancellingRun, setCancellingRun] = useState(false);

  const desktop = useMemo(() => isTauri(), []);
  const runnerEndpoint = useMemo(
    () =>
      runner?.running === true && runner.baseUrl !== null
        ? { baseUrl: runner.baseUrl, token: runner.token }
        : null,
    [runner],
  );

  const checkHealth = useCallback(async (): Promise<void> => {
    setCheckingHealth(true);
    setHealthError("");
    try {
      saveServerAddress(serverInput);
      setHealth(await fetchHealth(serverInput));
    } catch (error) {
      setHealth(null);
      setHealthError(String(error));
    } finally {
      setCheckingHealth(false);
    }
  }, [serverInput]);

  const doLogin = useCallback(async (): Promise<void> => {
    setLoggingIn(true);
    setAuthError("");
    try {
      saveServerAddress(serverInput);
      const result = await login(username, password);
      saveToken(result.accessToken, result.username);
      setLoggedIn(true);
      setPassword("");
    } catch (error) {
      setAuthError(String(error));
    } finally {
      setLoggingIn(false);
    }
  }, [serverInput, username, password]);

  const logout = useCallback((): void => {
    clearToken();
    setLoggedIn(false);
    setCloudRuns([]);
  }, []);

  const loadCloudRuns = useCallback(async (): Promise<void> => {
    setLoadingCloudRuns(true);
    setCloudRunsError("");
    try {
      setCloudRuns(await fetchCloudRuns());
    } catch (error) {
      setCloudRunsError(String(error));
    } finally {
      setLoadingCloudRuns(false);
    }
  }, []);

  const loadLocalRuns = useCallback(async (): Promise<void> => {
    if (runnerEndpoint === null) return;
    setLoadingLocalRuns(true);
    setLocalRunsError("");
    try {
      setLocalRuns(await fetchLocalRuns(runnerEndpoint));
    } catch (error) {
      setLocalRunsError(String(error));
    } finally {
      setLoadingLocalRuns(false);
    }
  }, [runnerEndpoint]);

  const loadApprovals = useCallback(async (): Promise<void> => {
    if (runnerEndpoint === null || runner?.trusted !== true) return;
    setLoadingApprovals(true);
    try {
      setPendingApprovals(await fetchLocalPendingApprovals(runnerEndpoint));
    } catch {
      // Trusted Local Mode 半途关闭等场景：静默置空（禁用态由 trusted 控制）
      setPendingApprovals([]);
    } finally {
      setLoadingApprovals(false);
    }
  }, [runnerEndpoint, runner?.trusted]);

  const decide = useCallback(
    async (id: string, decision: "approved" | "rejected"): Promise<void> => {
      if (runnerEndpoint === null) return;
      setActingApprovalId(id);
      try {
        await decideLocalApproval(runnerEndpoint, id, decision);
        await loadApprovals();
        void loadLocalRuns();
      } finally {
        setActingApprovalId(null);
      }
    },
    [runnerEndpoint, loadApprovals, loadLocalRuns],
  );

  const refreshRunner = useCallback(async (): Promise<void> => {
    const info = await invokeRunnerStatus();
    setRunner(info);
    if (info?.running === true && info.baseUrl !== null) {
      void loadLocalRuns();
      void loadApprovals();
    }
  }, [loadLocalRuns, loadApprovals]);

  const startRunner = useCallback(async (): Promise<void> => {
    setRunnerBusy(true);
    try {
      const info = await invokeStartRunner(workspaceRoot, trustedMode);
      setRunner(info);
      if (info?.running === true && info.baseUrl !== null) {
        void loadLocalRuns();
        void loadApprovals();
      }
    } finally {
      setRunnerBusy(false);
    }
  }, [workspaceRoot, trustedMode, loadLocalRuns, loadApprovals]);

  const stopRunner = useCallback(async (): Promise<void> => {
    setRunnerBusy(true);
    try {
      await invokeStopRunner();
      setRunner(await invokeRunnerStatus());
      setLocalRuns([]);
      setLocalRunsError("");
      setPendingApprovals([]);
    } finally {
      setRunnerBusy(false);
    }
  }, []);

  const openRunDetail = useCallback(
    async (id: string): Promise<void> => {
      if (runnerEndpoint === null) return;
      setSelectedRunId(id);
      setLoadingDetail(true);
      setRunDetailError("");
      try {
        setSelectedRun(await fetchLocalRun(runnerEndpoint, id));
      } catch (error) {
        setSelectedRun(null);
        setRunDetailError(String(error));
      } finally {
        setLoadingDetail(false);
      }
    },
    [runnerEndpoint],
  );

  const cancelRun = useCallback(
    async (id: string): Promise<void> => {
      if (runnerEndpoint === null) return;
      setCancellingRun(true);
      try {
        setSelectedRun(await cancelLocalRun(runnerEndpoint, id));
        void loadLocalRuns();
      } finally {
        setCancellingRun(false);
      }
    },
    [runnerEndpoint, loadLocalRuns],
  );

  useEffect(() => {
    void refreshRunner();
  }, [refreshRunner]);

  return {
    page,
    setPage,
    serverInput,
    setServerInput,
    health,
    healthError,
    checkingHealth,
    checkHealth,
    username,
    setUsername,
    password,
    setPassword,
    authError,
    loggingIn,
    loggedIn,
    doLogin,
    logout,
    cloudRuns,
    cloudRunsError,
    loadingCloudRuns,
    loadCloudRuns,
    runner,
    workspaceRoot,
    setWorkspaceRoot,
    trustedMode,
    setTrustedMode,
    runnerBusy,
    startRunner,
    stopRunner,
    localRuns,
    localRunsError,
    loadingLocalRuns,
    loadLocalRuns,
    pendingApprovals,
    loadingApprovals,
    loadApprovals,
    actingApprovalId,
    decide,
    selectedRunId,
    selectedRun,
    runDetailError,
    loadingDetail,
    openRunDetail,
    cancellingRun,
    cancelRun,
    desktop,
  };
}

export type AppState = ReturnType<typeof useAppState>;

export default function App() {
  const state = useAppState();
  const { page } = state;

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <Layout className="min-h-0 flex-1" style={{ background: "#12141A" }}>
        <Sider width={216} style={{ background: "#0F1116", borderRight: "1px solid #232833" }}>
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2.5 px-4 py-4">
              <img src={logoUrl} alt="" className="h-7 w-7" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">ADui Forge</p>
                <p className="font-mono text-[10px] text-slate-500">Workspace</p>
              </div>
            </div>
            <Menu
              mode="inline"
              style={{ background: "transparent", borderInlineEnd: "none", padding: "0 8px" }}
              selectedKeys={[page]}
              onClick={(info) => state.setPage(info.key as PageKey)}
              items={NAV_ITEMS.map((item) => ({
                key: item.key,
                icon: <item.icon size={15} />,
                label: item.label,
              }))}
            />
            <div className="mt-auto border-t border-[#232833] px-4 py-3">
              {state.loggedIn ? (
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs text-slate-400">{getUsername()}</span>
                  <Typography.Link
                    className="text-xs"
                    onClick={() => {
                      state.logout();
                      state.setPage("overview");
                    }}
                  >
                    退出
                  </Typography.Link>
                </div>
              ) : (
                <span className="text-xs text-slate-600">未登录</span>
              )}
            </div>
          </div>
        </Sider>
        <Content className="overflow-y-auto" style={{ background: "#12141A" }}>
          <div className="mx-auto max-w-3xl px-6 py-6">
            {page === "overview" && <OverviewPage state={state} />}
            {page === "runs" && <RunsPage state={state} />}
            {page === "approvals" && <ApprovalsPage state={state} />}
            {page === "settings" && <SettingsPage state={state} />}
          </div>
        </Content>
      </Layout>
    </div>
  );
}
