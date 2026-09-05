import { useQuery } from "@tanstack/react-query";
import { Bot, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
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
    <AppShell>
      <div className="mb-6 flex items-center gap-2">
        <Bot className="h-5 w-5 text-brand-300" />
        <h1 className="text-xl font-bold text-slate-100">Agents</h1>
      </div>

      {isLoading && <p className="text-sm text-slate-500">加载中…</p>}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {agents !== undefined && agents.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500">
            尚未注册 Agent。配置 FORGE_MODEL_* 环境变量后默认 Agent 会自动注册。
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {agents?.map((agent) => (
          <Card key={agent.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-sm">
                <Bot className="h-4 w-4 text-brand-300" /> {agent.name}
              </CardTitle>
              <CardDescription>{agent.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Wrench className="h-3.5 w-3.5" /> 工具集（{agent.tools.length}）
              </p>
              <div className="flex flex-wrap gap-1.5">
                {agent.tools.map((tool) => (
                  <Badge key={tool} tone="neutral" className="font-mono">
                    {tool}
                  </Badge>
                ))}
                {agent.tools.length === 0 && <span className="text-xs text-slate-500">无工具</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
