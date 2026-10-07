<script lang="ts">
  import {
    login,
    fetchCloudRuns,
    fetchHealth,
    fetchLocalRuns,
    type CloudRunListItem,
    type HealthResult,
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
    invokeRunnerStatus,
    invokeStartRunner,
    invokeStopRunner,
    isTauri,
    type RunnerInfo,
  } from "./lib/tauri.ts";

  let serverInput = $state(getServerAddress());
  let username = $state(getUsername());
  let password = $state("");

  let health = $state<HealthResult | null>(null);
  let healthError = $state("");
  let checkingHealth = $state(false);
  let authError = $state("");
  let loggingIn = $state(false);
  let loggedIn = $state(getAccessToken() !== null);

  let runs = $state<CloudRunListItem[]>([]);
  let runsError = $state("");
  let loadingRuns = $state(false);

  let runner = $state<RunnerInfo | null>(null);
  let workspaceRoot = $state("");
  let trustedMode = $state(false);
  let runnerBusy = $state(false);

  let localRuns = $state<CloudRunListItem[]>([]);
  let localRunsError = $state("");
  let loadingLocalRuns = $state(false);

  const desktop = $derived(isTauri());
  const hasServer = $derived(getServerAddress() !== "");

  const checkHealth = async (): Promise<void> => {
    checkingHealth = true;
    healthError = "";
    try {
      saveServerAddress(serverInput);
      health = await fetchHealth(serverInput);
    } catch (error) {
      health = null;
      healthError = String(error);
    } finally {
      checkingHealth = false;
    }
  };

  const doLogin = async (): Promise<void> => {
    loggingIn = true;
    authError = "";
    try {
      saveServerAddress(serverInput);
      const result = await login(username, password);
      saveToken(result.accessToken, result.username);
      loggedIn = true;
    } catch (error) {
      authError = String(error);
    } finally {
      loggingIn = false;
    }
  };

  const logout = (): void => {
    clearToken();
    loggedIn = false;
    runs = [];
  };

  const loadRuns = async (): Promise<void> => {
    loadingRuns = true;
    runsError = "";
    try {
      runs = await fetchCloudRuns();
    } catch (error) {
      runsError = String(error);
    } finally {
      loadingRuns = false;
    }
  };

  const refreshRunner = async (): Promise<void> => {
    runner = await invokeRunnerStatus();
    if (runner?.running === true && runner.baseUrl !== null) {
      void loadLocalRuns();
    }
  };

  const loadLocalRuns = async (): Promise<void> => {
    if (runner?.running !== true || runner.baseUrl === null) return;
    loadingLocalRuns = true;
    localRunsError = "";
    try {
      localRuns = await fetchLocalRuns({ baseUrl: runner.baseUrl, token: runner.token });
    } catch (error) {
      localRunsError = String(error);
    } finally {
      loadingLocalRuns = false;
    }
  };

  const startRunner = async (): Promise<void> => {
    runnerBusy = true;
    try {
      runner = await invokeStartRunner(workspaceRoot, trustedMode);
      if (runner?.running === true && runner.baseUrl !== null) {
        void loadLocalRuns();
      }
    } finally {
      runnerBusy = false;
    }
  };

  const stopRunner = async (): Promise<void> => {
    runnerBusy = true;
    try {
      await invokeStopRunner();
      runner = await invokeRunnerStatus();
      localRuns = [];
      localRunsError = "";
    } finally {
      runnerBusy = false;
    }
  };

  const statusColor = (status: string): string =>
    status === "completed"
      ? "text-[#6CFF00]"
      : status === "failed"
        ? "text-red-400"
        : "text-slate-300";

  // 初始化：恢复 Runner 状态（桌面）与 Runs（已登录时）
  $effect(() => {
    void refreshRunner();
  });
</script>

<div class="flex h-full flex-col">
  <header
    data-tauri-drag-region
    class="flex items-center gap-3 border-b border-[#1C2028] px-5 py-3"
  >
    <div class="flex h-6 w-6 items-center justify-center rounded bg-[#6CFF00] font-black text-black"
      >A</div
    >
    <h1 class="text-sm font-semibold tracking-wide">ADui Forge Desktop</h1>
    <span class="font-mono text-[10px] text-slate-600">v{__APP_VERSION__}</span>
    <div class="ml-auto flex items-center gap-2 text-xs text-slate-400">
      {#if loggedIn}
        <span>{getUsername()}</span>
        <button class="rounded px-2 py-1 hover:bg-[#1C2028]" onclick={logout}>退出</button>
      {:else}
        <span class="text-slate-600">未登录</span>
      {/if}
    </div>
  </header>

  <main class="flex-1 overflow-y-auto p-5">
    <section class="mb-5 rounded-lg border border-[#20242C] bg-[#0D0F13] p-4">
      <h2 class="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">服务器</h2>
      <div class="flex flex-wrap items-center gap-2">
        <input
          class="min-w-80 flex-1 rounded border border-[#292E39] bg-[#111318] px-3 py-1.5 text-sm outline-none focus:border-[#8B51A6]"
          placeholder="http://your-server:3000"
          bind:value={serverInput}
          onchange={() => saveServerAddress(serverInput)}
        />
        <button
          class="rounded border border-[#292E39] px-3 py-1.5 text-sm hover:border-[#6CFF00]/50 disabled:opacity-40"
          disabled={checkingHealth || serverInput.trim() === ""}
          onclick={() => void checkHealth()}
        >
          {checkingHealth ? "检测中…" : "检测连接"}
        </button>
      </div>
      {#if health !== null}
        <p class="mt-2 text-xs text-[#6CFF00]">在线 · 数据库 {health.db}</p>
      {:else if healthError !== ""}
        <p class="mt-2 text-xs text-red-400">离线：{healthError}</p>
      {:else}
        <p class="mt-2 text-xs text-slate-600">配置云端服务器地址后可登录并同步数据。</p>
      {/if}

      {#if !loggedIn}
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <input
            class="w-44 rounded border border-[#292E39] bg-[#111318] px-3 py-1.5 text-sm outline-none focus:border-[#8B51A6]"
            placeholder="用户名"
            bind:value={username}
          />
          <input
            type="password"
            class="w-44 rounded border border-[#292E39] bg-[#111318] px-3 py-1.5 text-sm outline-none focus:border-[#8B51A6]"
            placeholder="密码"
            bind:value={password}
          />
          <button
            class="rounded bg-[#6CFF00] px-4 py-1.5 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40"
            disabled={loggingIn || username.trim() === "" || password === ""}
            onclick={() => void doLogin()}
          >
            {loggingIn ? "登录中…" : "登录"}
          </button>
        </div>
        {#if authError !== ""}
          <p class="mt-2 text-xs text-red-400">{authError}</p>
        {/if}
      {/if}
    </section>

    <section class="mb-5 rounded-lg border border-[#20242C] bg-[#0D0F13] p-4">
      <h2 class="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
        Local Runner
        {#if !desktop}
          <span class="ml-2 normal-case text-slate-600">（仅桌面安装包内可用）</span>
        {/if}
      </h2>
      {#if desktop}
        <div class="flex flex-wrap items-center gap-2">
          <input
            class="min-w-80 flex-1 rounded border border-[#292E39] bg-[#111318] px-3 py-1.5 text-sm outline-none focus:border-[#8B51A6]"
            placeholder="工作区根目录，例如 D:\Workspace\project"
            bind:value={workspaceRoot}
          />
          <label class="flex items-center gap-1.5 text-xs text-slate-400">
            <input type="checkbox" bind:checked={trustedMode} />
            Trusted Local Mode
          </label>
          {#if runner?.running === true}
            <button
              class="rounded border border-red-400/50 px-3 py-1.5 text-sm text-red-300 hover:bg-red-400/10 disabled:opacity-40"
              disabled={runnerBusy}
              onclick={() => void stopRunner()}
            >
              停止
            </button>
            <span class="text-xs text-[#6CFF00]">运行中 · {runner.baseUrl}</span>
          {:else}
            <button
              class="rounded bg-[#6CFF00] px-4 py-1.5 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40"
              disabled={runnerBusy || workspaceRoot.trim() === ""}
              onclick={() => void startRunner()}
            >
              启动
            </button>
            <span class="text-xs text-slate-600">未运行</span>
          {/if}
        </div>

        {#if runner?.running === true}
          <div class="mt-4">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-xs font-medium text-slate-400">本地 Runs</h3>
              <button
                class="rounded border border-[#292E39] px-2.5 py-1 text-xs hover:border-[#6CFF00]/50 disabled:opacity-40"
                disabled={loadingLocalRuns}
                onclick={() => void loadLocalRuns()}
              >
                {loadingLocalRuns ? "加载中…" : "刷新"}
              </button>
            </div>
            {#if localRunsError !== ""}
              <p class="text-sm text-red-400">{localRunsError}</p>
            {:else if localRuns.length === 0}
              <p class="text-sm text-slate-600">
                暂无本地运行记录（历史经 SQLite 持久化，Runner 重启后保留）。
              </p>
            {:else}
              <div class="overflow-hidden rounded border border-[#20242C]">
                {#each localRuns.slice(0, 15) as run (run.id)}
                  <div
                    class="flex items-center gap-3 border-b border-[#1C2028] px-3 py-2 last:border-b-0 hover:bg-[#13161C]"
                  >
                    <span class="w-20 shrink-0 font-mono text-xs {statusColor(run.status)}"
                      >{run.status}</span
                    >
                    <span class="flex-1 truncate text-sm">{run.task}</span>
                    <span class="shrink-0 font-mono text-xs text-slate-600">{run.agentName}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </section>

    <section class="rounded-lg border border-[#20242C] bg-[#0D0F13] p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-xs font-semibold tracking-wider text-slate-500 uppercase">Runs</h2>
        {#if loggedIn}
          <button
            class="rounded border border-[#292E39] px-2.5 py-1 text-xs hover:border-[#6CFF00]/50 disabled:opacity-40"
            disabled={loadingRuns}
            onclick={() => void loadRuns()}
          >
            {loadingRuns ? "加载中…" : "刷新"}
          </button>
        {/if}
      </div>
      {#if !loggedIn}
        <p class="text-sm text-slate-600">登录后可查看云端 Runs。</p>
      {:else if runsError !== ""}
        <p class="text-sm text-red-400">{runsError}</p>
      {:else if runs.length === 0}
        <p class="text-sm text-slate-600">暂无记录——点「刷新」加载。</p>
      {:else}
        <div class="overflow-hidden rounded border border-[#20242C]">
          {#each runs.slice(0, 20) as run (run.id)}
            <div
              class="flex items-center gap-3 border-b border-[#1C2028] px-3 py-2 last:border-b-0 hover:bg-[#13161C]"
            >
              <span class="w-20 shrink-0 font-mono text-xs {statusColor(run.status)}">{run.status}</span>
              <span class="flex-1 truncate text-sm">{run.task}</span>
              <span class="shrink-0 font-mono text-xs text-slate-600">{run.agentName}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </main>
</div>
