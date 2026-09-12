import {
  addEdge,
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { App as AntApp, Button, Card, Empty, Input, Select, Spin } from "antd";
import { validateWorkflowGraph } from "@adui-forge/workflow";
import { fetchWorkflows } from "@/lib/workflows.ts";
import { registerWorkflow } from "@/lib/api.ts";
import { flowToGraph, graphToFlow, nodeText, tasksToGraph } from "@/lib/workflow-editor.ts";

function StartNode() {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-[#292E39] bg-[#171A21] px-4 py-2 text-center text-xs text-slate-400">
      {t("common.start")}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function EndNode() {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-[#292E39] bg-[#171A21] px-4 py-2 text-center text-xs text-slate-400">
      <Handle type="target" position={Position.Top} />
      {t("common.end")}
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

/** 条件节点：出边自动标记 then(是)/else(否) 分支 */
function ConditionNode({ data, selected }: NodeProps) {
  const { t } = useTranslation();
  return (
    <div
      className={
        selected
          ? "w-64 rounded-md border-2 border-[#8B51A6] bg-[#241B2E] px-4 py-3 shadow-lg shadow-black/40"
          : "w-64 rounded-md border border-[#4A3A5C] bg-[#241B2E] px-4 py-3"
      }
    >
      <Handle type="target" position={Position.Top} />
      <p className="mb-1 flex items-center gap-1 font-mono text-[10px] text-[#B79AEC]">
        <GitBranch className="h-3 w-3" /> {t("workflowEditor.conditionLabel")}
      </p>
      <p className="text-sm text-slate-200">{conditionSummary(data.when, t)}</p>
      <Handle type="source" position={Position.Bottom} id="branch" />
    </div>
  );
}

const conditionSummary = (
  when: unknown,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string => {
  const spec = when as { node?: string; op?: string; value?: string } | undefined;
  if (spec === undefined || spec.node === undefined || spec.node === "") {
    return t("workflowEditor.conditionUnset");
  }
  const left = t("workflowEditor.conditionNodeLabel", { node: spec.node });
  switch (spec.op) {
    case "contains":
      return t("workflowEditor.conditionContains", { node: left, value: spec.value ?? "" });
    case "equals":
      return t("workflowEditor.conditionEquals", { node: left, value: spec.value ?? "" });
    case "not_empty":
      return t("workflowEditor.conditionNotEmpty", { node: left });
    default:
      return t("workflowEditor.conditionUnset");
  }
};

const nodeTypes = { start: StartNode, task: TaskNode, condition: ConditionNode, end: EndNode };

let nodeSeq = 0;
const nextNodeId = (): string => `n${++nodeSeq}_${Math.random().toString(36).slice(2, 6)}`;

export function WorkflowEditorPage({ isNew: isNewProp = false }: { isNew?: boolean }) {
  const { name = "" } = useParams();
  const isNew = isNewProp || name === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { message } = AntApp.useApp();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: fetchWorkflows,
    enabled: !isNew,
  });
  const existing = !isNew ? workflows?.find((workflow) => workflow.name === name) : undefined;

  const [workflowName, setWorkflowName] = useState(isNew ? "" : name);
  const [description, setDescription] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(isNew);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 编辑模式:载入已有定义（graph 优先,兼容旧 tasks）
  useEffect(() => {
    if (existing !== undefined && !loaded) {
      setWorkflowName(existing.name);
      setDescription(existing.description);
      const view =
        existing.graph !== undefined ? graphToFlow(existing.graph) : tasksToGraph(existing.tasks);
      setNodes(view.nodes);
      setEdges(view.edges);
      setLoaded(true);
    }
  }, [existing, loaded, setNodes, setEdges]);

  const selected = nodes.find((node) => node.id === selectedId) ?? null;

  const onConnect = (connection: Connection): void => {
    if (connection.source === connection.target) return;
    // 条件节点出边自动分配 then/else 分支；Agent 节点只允许一条出边
    const sourceNode = nodes.find((node) => node.id === connection.source);
    const existingOut = edges.filter((edge) => edge.source === connection.source);
    let branch: "then" | "else" | undefined;
    if (sourceNode?.type === "condition") {
      const hasThen = existingOut.some((edge) => edge.data?.branch === "then");
      const hasElse = existingOut.some((edge) => edge.data?.branch === "else");
      if (!hasThen) branch = "then";
      else if (!hasElse) branch = "else";
      else {
        void message.warning(t("workflowEditor.conditionOnlyTwo"));
        return;
      }
    } else if (sourceNode?.type === "task" && existingOut.length > 0) {
      void message.warning(t("workflowEditor.agentOneOut"));
      return;
    } else if (sourceNode?.type === "end") {
      return;
    }
    const domainTargets = nodes.filter((node) => node.type === "task" || node.type === "condition");
    const incomingToTarget = edges.filter((edge) => edge.target === connection.target).length;
    if (domainTargets.some((node) => node.id === connection.target) && incomingToTarget > 0) {
      void message.warning(t("workflowEditor.singleIncoming"));
      return;
    }
    setEdges((current) =>
      addEdge(
        {
          ...connection,
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: branch !== undefined,
          label:
            branch === "then"
              ? t("workflowEditor.edgeThen")
              : branch === "else"
                ? t("workflowEditor.edgeElse")
                : undefined,
          data: { branch },
        },
        current,
      ),
    );
  };

  const addTaskNode = (): void => {
    const id = nextNodeId();
    setNodes((current) => [
      ...current,
      {
        id,
        type: "task",
        position: { x: 260 + Math.random() * 80, y: 320 },
        data: { label: t("workflowEditor.newTask"), task: t("workflowEditor.newTask") },
      },
    ]);
    setSelectedId(id);
  };

  const addConditionNode = (): void => {
    const id = nextNodeId();
    setNodes((current) => [
      ...current,
      {
        id,
        type: "condition",
        position: { x: 260 + Math.random() * 80, y: 480 },
        data: { label: t("workflowEditor.conditionLabel"), when: { node: "", op: "not_empty" } },
      },
    ]);
    setSelectedId(id);
  };

  const save = useMutation({
    mutationFn: () => {
      const graph = flowToGraph(nodes, edges);
      if (graph === null) {
        return Promise.reject(new Error(t("workflowEditor.emptyNodes")));
      }
      try {
        validateWorkflowGraph(graph);
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
      return registerWorkflow({
        name: workflowName.trim(),
        description: description.trim(),
        graph,
      });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["workflows"] });
      void message.success(t("common.saved"));
      if (workflowName.trim() !== name) {
        void navigate(`/workflows/${result.name}/edit`, { replace: true });
      }
    },
  });

  const saveError = useMemo(() => {
    if (save.isError) return String(save.error);
    return null;
  }, [save.isError, save.error]);

  if (!isNew && isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin />
      </div>
    );
  }

  if (!isNew && workflows !== undefined && existing === undefined) {
    return <Empty description={t("workflowEditor.notFound", { name })} />;
  }

  const canSave = /^[a-z0-9-]+$/.test(workflowName.trim()) && !save.isPending;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <WorkflowCanvasIcon />
          <h1 className="text-xl font-semibold text-slate-100">
            {isNew ? t("workflowEditor.newTitle") : t("workflowEditor.editTitle", { name })}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Input
            value={workflowName}
            placeholder={t("workflowEditor.namePlaceholder")}
            className="w-64"
            onChange={(event) => setWorkflowName(event.target.value)}
          />
          <Input
            value={description}
            placeholder={t("workflowEditor.descPlaceholder")}
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
            {t("common.save")}
          </Button>
        </div>
      </div>
      {!canSave && workflowName.length > 0 && (
        <p className="mb-2 text-xs text-amber-300">{t("workflowEditor.namePatternHint")}</p>
      )}
      {saveError !== null && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {saveError}
        </p>
      )}

      <div className="flex gap-4">
        {/* 画布(§105:Pan/Zoom/Connect 由 React Flow 内建) */}
        <div className="h-[560px] flex-1 rounded-lg border border-[#292E39] bg-[#0D0F13]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              setSelectedId(node.type === "start" || node.type === "end" ? null : node.id);
            }}
            onPaneClick={() => setSelectedId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#292E39" />
          </ReactFlow>
          <div className="flex gap-2 border-t border-[#20242C] px-3 py-2">
            <Button size="small" icon={<Plus className="h-3.5 w-3.5" />} onClick={addTaskNode}>
              {t("workflowEditor.addTask")}
            </Button>
            <Button
              size="small"
              icon={<GitBranch className="h-3.5 w-3.5" />}
              onClick={addConditionNode}
            >
              {t("workflowEditor.addCondition")}
            </Button>
            <span className="ml-auto self-center text-xs text-slate-500">
              {t("workflowEditor.canvasHint")}
            </span>
          </div>
        </div>

        {/* §109 Inspector */}
        <Card
          className="w-80 shrink-0"
          title={selected !== null ? t("workflowEditor.inspector") : t("workflowEditor.inspector")}
        >
          {selected === null ? (
            <div className="text-sm text-slate-500">
              <p>{t("workflowEditor.inspectorEmptyHint1")}</p>
              <p className="mt-2 text-xs text-slate-500">
                {t("workflowEditor.inspectorEmptyHint2")}
              </p>
            </div>
          ) : selected.type === "task" ? (
            <TaskInspector
              nodes={nodes}
              selected={selected}
              setNodes={setNodes}
              setSelectedId={setSelectedId}
            />
          ) : (
            <ConditionInspector nodes={nodes} selected={selected} setNodes={setNodes} />
          )}
        </Card>
      </div>
    </>
  );
}

function TaskInspector({
  nodes,
  selected,
  setNodes,
  setSelectedId,
}: {
  nodes: Node[];
  selected: Node;
  setNodes: (updater: (current: Node[]) => Node[]) => void;
  setSelectedId: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="task-text" className="text-sm font-medium text-slate-300">
        {t("workflowEditor.taskLabel")}
      </label>
      <Input.TextArea
        id="task-text"
        rows={3}
        value={nodeText(selected.data)}
        onChange={(event) => {
          const value = event.target.value;
          setNodes((current) =>
            current.map((node) =>
              node.id === selected.id
                ? { ...node, data: { ...node.data, label: value, task: value } }
                : node,
            ),
          );
        }}
      />
      <Button
        danger
        size="small"
        onClick={() => {
          setNodes((current) => current.filter((node) => node.id !== selected.id));
          setSelectedId(null);
        }}
      >
        {t("workflowEditor.deleteNode")}
      </Button>
      <p className="text-xs text-slate-500">
        {t("workflowEditor.taskNodeCount", {
          count: nodes.filter((n) => n.type === "task").length,
        })}
      </p>
    </div>
  );
}

function ConditionInspector({
  nodes,
  selected,
  setNodes,
}: {
  nodes: Node[];
  selected: Node;
  setNodes: (updater: (current: Node[]) => Node[]) => void;
}) {
  const { t } = useTranslation();
  const when = (selected.data.when ?? { node: "", op: "not_empty" }) as {
    node: string;
    op: "contains" | "equals" | "not_empty";
    value?: string;
  };
  const agentNodes = nodes.filter((node) => node.type === "task");

  const patchWhen = (patch: Partial<typeof when>): void => {
    setNodes((current) =>
      current.map((node) =>
        node.id === selected.id
          ? { ...node, data: { ...node.data, when: { ...when, ...patch } } }
          : node,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="when-node" className="text-sm font-medium text-slate-300">
          {t("workflowEditor.whenNodeLabel")}
        </label>
        <Select
          id="when-node"
          className="mt-1 w-full"
          value={when.node || undefined}
          placeholder={t("workflowEditor.whenNodePlaceholder")}
          options={agentNodes.map((node) => ({
            value: node.id,
            label: nodeText(node.data, node.id),
          }))}
          onChange={(value) => patchWhen({ node: value })}
        />
      </div>
      <div>
        <label htmlFor="when-op" className="text-sm font-medium text-slate-300">
          {t("workflowEditor.whenOpLabel")}
        </label>
        <Select
          id="when-op"
          className="mt-1 w-full"
          value={when.op}
          options={[
            { value: "contains", label: t("workflowEditor.opContains") },
            { value: "equals", label: t("workflowEditor.opEquals") },
            { value: "not_empty", label: t("workflowEditor.opNotEmpty") },
          ]}
          onChange={(value) => patchWhen({ op: value })}
        />
      </div>
      {when.op !== "not_empty" && (
        <div>
          <label htmlFor="when-value" className="text-sm font-medium text-slate-300">
            {t("workflowEditor.whenValueLabel")}
          </label>
          <Input
            id="when-value"
            className="mt-1"
            value={when.value ?? ""}
            placeholder={"FAIL"}
            onChange={(event) => patchWhen({ value: event.target.value })}
          />
        </div>
      )}
      <p className="text-xs text-slate-500">{t("workflowEditor.branchHint")}</p>
    </div>
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
