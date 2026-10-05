import { Controller, Get } from "@nestjs/common";

const paths = {
  "/auth/register": { post: { summary: "注册用户并返回访问令牌" } },
  "/auth/login": { post: { summary: "登录并返回访问令牌" } },
  "/agents": { get: { summary: "列出已注册 Agent 及其工具" } },
  "/runs": {
    get: { summary: "列出 Run（浏览视图，不含事件流，默认最近 200 条）" },
    post: { summary: "创建 Run（立即返回，后台执行）" },
  },
  "/runs/{id}": { get: { summary: "查询 Run 详情（含事件流）" } },
  "/runs/{id}/events": { get: { summary: "SSE 订阅 Run 事件流" } },
  "/runs/{id}/artifacts": { get: { summary: "列出 Run 产物" } },
  "/runs/{id}/retry": { post: { summary: "重试 Run（新 Run）" } },
  "/runs/{id}/cancel": { post: { summary: "取消 Run" } },
  "/approvals/pending": { get: { summary: "列出待审批" } },
  "/approvals/{id}/decision": { post: { summary: "提交审批决策" } },
  "/approvals/history": { get: { summary: "审批决策审计（最近 50 条）" } },
  "/tasks": {
    get: { summary: "列出任务" },
    post: { summary: "创建任务（派生 Run）" },
  },
  "/workflows": {
    get: { summary: "列出 Workflow 定义" },
    post: { summary: "注册 Workflow 定义" },
  },
  "/workflows/{name}/runs": { post: { summary: "运行 Workflow（新 Run）" } },
  "/comparisons": {
    get: { summary: "列出对比批次" },
    post: { summary: "创建对比批次" },
  },
  "/comparisons/{id}": { get: { summary: "批次详情（结果从 Run 派生）" } },
  "/comparisons/{id}/export/{format}": { get: { summary: "导出 CSV / Markdown" } },
  "/comparisons/stats": { get: { summary: "跨批次 Agent 统计" } },
  "/comparisons/stats/by-model": { get: { summary: "按模型分组的跨批次统计" } },
  "/conversations": {
    get: { summary: "列出 Chat 会话" },
    post: { summary: "创建会话" },
  },
  "/conversations/{id}": { get: { summary: "会话详情" } },
  "/conversations/{id}/title": { patch: { summary: "会话重命名" } },
  "/conversations/{id}/messages": { post: { summary: "追加会话消息" } },
  "/skills": {
    get: { summary: "列出 Skill" },
    post: { summary: "新建 / 更新 Skill" },
  },
  "/skills/bundled": { get: { summary: "内置技能目录（带 version）" } },
  "/skills/import-bundled": { post: { summary: "一键安装全部内置技能" } },
  "/skills/import-bundled/{name}": { post: { summary: "安装单个内置技能（防覆盖）" } },
  "/skills/import-markdown": { post: { summary: "粘贴 SKILL.md 导入" } },
  "/skills/export-bundle": { get: { summary: "导出技能包 JSON" } },
  "/skills/import-bundle": { post: { summary: "导入技能包（逐条校验）" } },
  "/skills/usage": { get: { summary: "使用统计（Agent 引用数）" } },
  "/skills/import": { post: { summary: "从 FORGE_SKILLS_DIR 导入" } },
  "/skills/{name}/export": { get: { summary: "导出 SKILL.md" } },
  "/skills/{name}/enabled": { patch: { summary: "Skill 启停" } },
  "/workspace/tree": { get: { summary: "Workspace 文件树" } },
  "/workspace/file": {
    get: { summary: "读取文本文件" },
    put: { summary: "写入文本文件" },
    delete: { summary: "删除文件" },
  },
  "/workspace/search": { get: { summary: "文件名 + 内容搜索" } },
  "/workspace/git/status": { get: { summary: "Git 状态" } },
  "/workspace/git/diff": { get: { summary: "Git diff" } },
  "/workspace/git/commit": { post: { summary: "Git 提交" } },
  "/memory": { get: { summary: "查询 Session Memory 摘要（注入用，停用时为空）" } },
  "/memory/records": { get: { summary: "Memory 管理视图（全量记录）" } },
  "/memory/{id}": { delete: { summary: "删除单条 Memory 记录" } },
  "/memory/clear": { post: { summary: "清空 Memory（可按 Agent）" } },
  "/memory/enabled": {
    get: { summary: "查询 Memory 开关" },
    post: { summary: "启停 Memory（停用后不记录不注入）" },
  },
  "/metrics": { get: { summary: "运行指标" } },
};

/** 手写 OpenAPI 描述（零依赖）；供客户端生成与联调参考。 */
@Controller("openapi.json")
export class OpenapiController {
  @Get()
  describe(): object {
    return {
      openapi: "3.0.3",
      info: { title: "ADui Forge API", version: "0.1.0" },
      servers: [{ url: "/api/v1" }],
      paths,
    };
  }
}
