import { useQuery } from "@tanstack/react-query";
import { Bot, Plus, Wrench } from "lucide-react";
import { useNavigate } from "react-router";
import { Link } from "react-router";
import { Tag, Card, Empty, Spin } from "antd";
import { fetchAgents } from "@/lib/api.ts";

export function AgentsPage() {
  const navigate = useNavigate();
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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-brand-300" />
          <h1 className="text-xl font-semibold text-slate-100">Agents</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate("/agents/new")}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#4A3A5C] bg-[#241B2E] px-3 py-1.5 text-sm text-[#D9C7F0] transition-colors hover:border-[#8B51A6]"
        >
          <Plus className="h-3.5 w-3.5" /> 新建 Agent
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      )}
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
          <Link key={agent.name} to={`/agents/${agent.name}`} className="block">
            <Card className="transition-colors hover:border-[#8B51A6]">
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
                  {agent.tools.length === 0 && (
                    <span className="text-xs text-slate-500">无工具</span>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
