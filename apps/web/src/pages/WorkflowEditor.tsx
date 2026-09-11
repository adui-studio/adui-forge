import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button, Card, Empty, Input, Popconfirm } from "antd";
import { fetchWorkflows } from "@/lib/workflows.ts";
import { registerWorkflow } from "@/lib/api.ts";
import { tasksToGraph } from "@/lib/workflow-editor.ts";

function StartNode() {
  return (
    <div className="rounded-md border border-[#292E39] bg-[#171A21] px-4 py-2 text-center text-xs text-slate-400">
      开始
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function EndNode() {
  return (
    <div className="rounded-md border border-[#292E39] bg-[#171A21] px-4 py-2 text-center text-xs text-slate-400">
      <Handle type="target" position={Position.Top} />
      结束
    </div>
  );
}

/** §107:Neutral Surface + Small Accent;选中 = Purple Border */
function TaskNode({ data, selected }: NodeProps) {
  return (
    <div
      className={
        selected
          ? "w-72 rounded-md border-2 border-[#8B51A6] bg-[#1C2028] px-4 py-3 shadow-lg shadow-black/40"
          : "w-72 rounded-md border border-[#292E39] bg-[#171A21] px-4 py-3"
      }
    >
      <Handle type="target" position={Position.Top} />
      <p className="mb-1 font-mono text-[10px] text-slate-500">AGENT</p>
      <p className="text-sm text-slate-200">{String(data.label)}</p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { start: StartNode, task: TaskNode, end: EndNode };

export function WorkflowEditorPage({ isNew: isNewProp = false }: { isNew?: boolean }) {
  const { name = "" } = useParams();
  const isNew = isNewProp || name === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workflows } = useQuery({
    queryKey: ["workflows"],
    queryFn: fetchWorkflows,
    enabled: !isNew,
  });
  const existing = !isNew ? workflows?.find((workflow) => workflow.name === name) : undefined;

  const [workflowName, setWorkflowName] = useState(isNew ? "" : name);
  const [description, setDescription] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(isNew);

  // 编辑模式:载入已有定义
  useEffect(() => {
    if (existing !== undefined && !loaded) {
      setWorkflowName(existing.name);
      setDescription(existing.description);
      setTasks(existing.tasks);
      setLoaded(true);
    }
  }, [existing, loaded]);

  const graph = useMemo(() => tasksToGraph(tasks), [tasks]);

  const save = useMutation({
    mutationFn: () =>
      registerWorkflow({ name: workflowName.trim(), description: description.trim(), tasks }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["workflows"] });
      if (workflowName.trim() !== name) {
        void navigate(`/workflows/${result.name}/edit`, { replace: true });
      }
    },
  });

  const updateTask = (index: number, value: string): void => {
    setTasks((previous) => previous.map((task, i) => (i === index ? value : task)));
  };
  const moveTask = (index: number, offset: -1 | 1): void => {
    setTasks((previous) => {
      const next = [...previous];
      const target = index + offset;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelected((previous) => {
      const target = (previous ?? index) + offset;
      return Math.min(Math.max(target, 0), tasks.length - 1);
    });
  };
  const removeTask = (index: number): void => {
    setTasks((previous) => previous.filter((_, i) => i !== index));
    setSelected(null);
  };

  if (!isNew && workflows !== undefined && existing === undefined) {
    return <Empty description={`未找到 Workflow "${name}"`} />;
  }

  const nameValid = /^[a-z0-9-]+$/.test(workflowName.trim());
  const canSave = nameValid && tasks.every((task) => task.trim().length > 0) && !save.isPending;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <WorkflowCanvasIcon />
          <h1 className="text-xl font-semibold text-slate-100">
            {isNew ? "新建 Workflow" : `编辑:${name}`}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Input
            value={workflowName}
            placeholder="workflow 名称(小写-数字-连字符)"
            className="w-64"
            onChange={(event) => setWorkflowName(event.target.value)}
          />
          <Input
            value={description}
            placeholder="描述(可选)"
            className="w-52"
            onChange={(event) => setDescription(event.target.value)}
          />
          <Button
            type="primary"
            icon={<Save className="h-4 w-4" />}
            loading={save.isPending}
            disabled={!canSave}
            onClick={() => save.mutate()}
          >
            保存
          </Button>
        </div>
      </div>
      {!nameValid && workflowName.length > 0 && (
        <p className="mb-2 text-xs text-amber-300">名称仅允许小写字母、数字与连字符。</p>
      )}
      {save.isError && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {String(save.error)}
        </p>
      )}

      <div className="flex gap-4">
        {/* 画布(§105:Pan/Zoom/Select 由 React Flow 内建) */}
        <div className="h-[560px] flex-1 rounded-lg border border-[#292E39] bg-[#0D0F13]">
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            onNodeClick={(_, node) => {
              if (node.type === "task") setSelected(Number(node.id.replace("task-", "")));
              else setSelected(null);
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#292E39" />
          </ReactFlow>
        </div>

        {/* §109 Inspector */}
        <Card
          className="w-80 shrink-0"
          title={selected !== null ? `节点 ${selected + 1}` : "Inspector"}
        >
          {selected === null ? (
            <div className="text-sm text-slate-500">
              <p>点击画布中的 Agent 节点进行编辑。</p>
              <p className="mt-2 text-xs text-slate-500">任务按顺序执行,拖动画布平移,滚轮缩放。</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label htmlFor="task-text" className="text-sm font-medium text-slate-300">
                任务描述
              </label>
              <Input.TextArea
                id="task-text"
                rows={3}
                value={tasks[selected] ?? ""}
                onChange={(event) => updateTask(selected, event.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="small"
                  disabled={selected === 0}
                  onClick={() => moveTask(selected, -1)}
                >
                  <ArrowUp className="h-3.5 w-3.5" /> 上移
                </Button>
                <Button
                  size="small"
                  disabled={selected === tasks.length - 1}
                  onClick={() => moveTask(selected, 1)}
                >
                  <ArrowDown className="h-3.5 w-3.5" /> 下移
                </Button>
                <Popconfirm
                  title="删除该节点？"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => removeTask(selected)}
                >
                  <Button danger size="small">
                    <Trash2 className="h-3.5 w-3.5" /> 删除
                  </Button>
                </Popconfirm>
              </div>
              <Button
                size="small"
                onClick={() => {
                  setTasks((previous) => [...previous, "新任务"]);
                  setSelected(tasks.length);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> 在末尾添加任务
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function WorkflowCanvasIcon() {
  return (
    <span
      className="block h-5 w-5 rounded-sm bg-gradient-to-br from-[#5B2B82] to-[#6CFF00]"
      aria-hidden
    />
  );
}
