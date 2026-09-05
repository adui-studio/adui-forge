import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { StatusTag } from "@/components/status-tag.tsx";
import { Button, Card, Empty, Listy, Space } from "antd";
import { createRun, fetchRuns } from "@/lib/api.ts";
import { fetchPendingApprovals } from "@/lib/approvals.ts";

export function HomePage() {
  const [task, setTask] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: runs } = useQuery({
    queryKey: ["runs"],
    queryFn: fetchRuns,
    refetchInterval: 3_000,
  });
  const { data: pending } = useQuery({
    queryKey: ["approvals"],
    queryFn: fetchPendingApprovals,
    refetchInterval: 5_000,
  });

  const mutation = useMutation({
    mutationFn: () => createRun(task),
    onSuccess: (record) => {
      setTask("");
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      void navigate(`/runs/${record.id}`);
    },
  });

  const activeRuns = (runs ?? []).filter((run) =>
    ["running", "queued", "waiting_approval"].includes(run.status),
  );

  return (
    <>
      {/* §124/§126：Pending Approval 高优先 */}
      {pending !== undefined && pending.length > 0 && (
        <Card className="mb-4" style={{ borderColor: "rgba(245,158,11,0.4)" }}>
          <Card.Meta
            title={<span className="text-amber-300">有 {pending.length} 个操作等待审批</span>}
            description="任务因等待批准而暂停，处理后 Agent 将继续执行。"
          />
          <a href="/approvals" className="text-sm text-[#B79AEC] hover:underline">
            前往审批 →
          </a>
        </Card>
      )}

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100">控制台</h1>
        <p className="mt-1 text-sm text-slate-400">Agent 运行总览与快速发起。</p>
      </div>

      <Card className="mb-6" title="发起任务">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (task.trim().length > 0) mutation.mutate();
          }}
        >
          <textarea
            value={task}
            placeholder="描述你要完成的任务，例如：给用户列表增加搜索功能并补充测试"
            rows={3}
            className="w-full rounded-md border border-[#292E39] bg-[#111318] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#8B51A6] focus:outline-none"
            onChange={(event) => setTask(event.target.value)}
          />
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              disabled={mutation.isPending || task.trim().length === 0}
              icon={
                mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )
              }
            >
              {mutation.isPending ? "创建中…" : "交给 Agent 执行"}
            </Button>
          </Space>
          {mutation.isError && (
            <p role="alert" className="text-sm text-red-400">
              {String(mutation.error)}
            </p>
          )}
        </form>
      </Card>

      {/* Active Runs（§124 主区域） */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400">执行中的 Runs</h2>
        <a href="/runs" className="text-sm text-[#B79AEC] hover:underline">
          全部 →
        </a>
      </div>
      {activeRuns.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-slate-500">
              当前没有执行中的 Run。
              <br />
              在上方发起任务，或到 Runs 页查看历史。
            </span>
          }
        />
      ) : (
        <Listy
          items={activeRuns}
          rowKey={(run) => run.id}
          itemRender={(run) => (
            <div
              className="cursor-pointer rounded-md border border-[#20242C] bg-[#111318] px-4 py-3 transition-colors hover:border-brand-400/40"
              onClick={() => navigate(`/runs/${run.id}`)}
            >
              <Space>
                <StatusTag status={run.status} />
                <span className="text-sm text-slate-200">{run.task}</span>
              </Space>
            </div>
          )}
        />
      )}

      {/* 最近 Runs */}
      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400">最近 Runs</h2>
      </div>
      {(runs ?? []).length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无记录" />
      ) : (
        <Listy
          items={(runs ?? []).slice(0, 6)}
          rowKey={(run) => run.id}
          itemRender={(run) => (
            <div
              className="cursor-pointer rounded-md border border-[#20242C] bg-[#111318] px-4 py-3 transition-colors hover:border-brand-400/40"
              onClick={() => navigate(`/runs/${run.id}`)}
            >
              <Space>
                <StatusTag status={run.status} />
                <span className="max-w-md truncate text-sm text-slate-300">{run.task}</span>
              </Space>
            </div>
          )}
        />
      )}
    </>
  );
}
