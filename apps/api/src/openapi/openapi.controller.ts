import { Controller, Get } from "@nestjs/common";

const paths = {
  "/auth/register": { post: { summary: "注册用户并返回访问令牌" } },
  "/auth/login": { post: { summary: "登录并返回访问令牌" } },
  "/agents": { get: { summary: "列出已注册 Agent 及其工具" } },
  "/runs": {
    get: { summary: "列出 Run" },
    post: { summary: "创建 Run（立即返回，后台执行）" },
  },
  "/runs/{id}": { get: { summary: "查询 Run 详情" } },
  "/runs/{id}/events": { get: { summary: "SSE 订阅 Run 事件流" } },
  "/runs/{id}/artifacts": { get: { summary: "列出 Run 产物" } },
  "/runs/{id}/retry": { post: { summary: "重试 Run（新 Run）" } },
  "/approvals/pending": { get: { summary: "列出待审批" } },
  "/approvals/{id}/decision": { post: { summary: "提交审批决策" } },
  "/tasks": {
    get: { summary: "列出任务" },
    post: { summary: "创建任务（派生 Run）" },
  },
  "/workflows": {
    get: { summary: "列出 Workflow 定义" },
    post: { summary: "注册 Workflow 定义" },
  },
  "/workflows/{name}/runs": { post: { summary: "运行 Workflow（新 Run）" } },
  "/memory": { get: { summary: "查询 Session Memory 摘要" } },
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
