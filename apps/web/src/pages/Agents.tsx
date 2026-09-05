import { useQuery } from "@tanstack/react-query";
import { Bot, Wrench } from "lucide-react";
import { Tag, Card, Empty } from "antd";
import { fetchAgents } from "@/lib/api.ts";

export function AgentsPage() {
  const {
    data: agents,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });

  return (
    <>
      <div className="mb-6 flex items-center gap-2">
        <Bot className="h-5 w-5 text-brand-300" />
        <h1 className="text-xl font-semibold text-slate-100">Agents</h1>
      </div>

      {isLoading && <p className="text-sm text-slate-500">加载中…</p>}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {agents !== undefined && agents.length === 0 && (
        <Card>
          <Empty
            description={
              <span className="text-slate-500">
                尚未注册 Agent。
                <br />
                配置 FORGE_MODEL_* 环境变量后默认 Agent 会自动注册。
              </span>
            }
          />
        </Card>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {agents?.map((agent) => (
          <Card key={agent.name}>
            <Card.Meta
              title={
                <span className="flex items-center gap-2 font-mono text-sm">
                  <Bot className="h-4 w-4 text-brand-300" /> {agent.name}
                </span>
              }
              description={agent.description}
            />
            <div className="mt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Wrench className="h-3.5 w-3.5" /> 工具集（{agent.tools.length}）
              </p>
              <div className="flex flex-wrap gap-1.5">
                {agent.tools.map((tool) => (
                  <Tag key={tool} className="forge-code">
                    {tool}
                  </Tag>
                ))}
                {agent.tools.length === 0 && <span className="text-xs text-slate-500">无工具</span>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
